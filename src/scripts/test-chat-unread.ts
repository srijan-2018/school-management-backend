import assert from "node:assert/strict";
import { Op } from "sequelize";

import { sequelize } from "../config/db";
import ChatMessage from "../models/chat-message.model";
import {
  getConversation,
  getUnreadChatCount,
  markAllChatMessagesRead,
  markVisibleMessagesReadWithCounts,
} from "../services/chat.service";

/**
 * Lightweight regression coverage for the unread-message contract.
 *
 * The production service is exercised with an in-memory model shim, so this
 * script does not need database credentials or make any network requests.
 */
type FakeMessage = {
  id: number;
  schoolId: number;
  subjectId: number;
  senderUserId: number;
  receiverUserId: number;
  isRead: boolean | 0 | null;
  message: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

type Where = Record<PropertyKey, unknown>;

function fakeMessage(overrides: Partial<FakeMessage>): FakeMessage {
  return {
    id: 1,
    schoolId: 1,
    subjectId: 100,
    senderUserId: 20,
    receiverUserId: 10,
    isRead: false,
    message: "Test message",
    createdAt: "2026-09-23T00:00:00.000Z",
    updatedAt: "2026-09-23T00:00:00.000Z",
    ...overrides,
  };
}

function matchesWhere(message: FakeMessage, where: Where): boolean {
  return Reflect.ownKeys(where).every((key) => {
    const condition = Reflect.get(where, key);

    if (key === Op.or) {
      return (
        Array.isArray(condition) &&
        condition.some((entry) => matchesWhere(message, entry as Where))
      );
    }

    const column = String(key);
    const value = message[column];
    if (
      condition &&
      typeof condition === "object" &&
      Reflect.has(condition as object, Op.in)
    ) {
      const allowed = Reflect.get(condition as object, Op.in);
      return (
        Array.isArray(allowed) &&
        allowed.some((candidate) => Number(candidate) === Number(value))
      );
    }

    return value === condition;
  });
}

async function withInMemoryMessages<T>(
  messages: FakeMessage[],
  run: () => Promise<T>,
): Promise<T> {
  const model = ChatMessage as any;
  const originalUpdate = model.update;
  const originalCount = model.count;
  const originalFindAndCountAll = model.findAndCountAll;
  const originalQuery = (sequelize as any).query;

  model.update = async (
    values: Partial<FakeMessage>,
    options: { where: Where },
  ) => {
    let updated = 0;
    for (const message of messages) {
      if (!matchesWhere(message, options.where)) continue;
      if (message.isRead !== values.isRead) {
        Object.assign(message, values);
        updated += 1;
      }
    }
    return [updated];
  };

  model.count = async ({ where }: { where: Where }) =>
    messages.filter((message) => matchesWhere(message, where)).length;

  model.findAndCountAll = async ({
    where,
    offset = 0,
    limit = messages.length,
  }: {
    where: Where;
    offset?: number;
    limit?: number;
  }) => {
    const matching = messages
      .filter((message) => matchesWhere(message, where))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      rows: matching.slice(offset, offset + limit),
      count: matching.length,
    };
  };

  // The service has a MySQL raw-query fallback for legacy rows. Keep the test
  // isolated when an idempotent read operation legitimately updates zero rows.
  (sequelize as any).query = async () => [undefined, { affectedRows: 0 }];

  try {
    return await run();
  } finally {
    model.update = originalUpdate;
    model.count = originalCount;
    model.findAndCountAll = originalFindAndCountAll;
    (sequelize as any).query = originalQuery;
  }
}

function byId(messages: FakeMessage[], id: number) {
  const message = messages.find((entry) => entry.id === id);
  assert.ok(message, `Expected message ${id}`);
  return message;
}

async function testMarkAllIsInboundAndSchoolScoped() {
  const schoolA = 1;
  const schoolB = 2;
  const teacher = 10;
  const studentOne = 20;
  const studentTwo = 21;

  const messages: FakeMessage[] = [
    fakeMessage({ id: 1, schoolId: schoolA, senderUserId: studentOne }),
    fakeMessage({
      id: 2,
      schoolId: schoolA,
      subjectId: 101,
      senderUserId: studentTwo,
      isRead: 0,
    }),
    fakeMessage({
      id: 3,
      schoolId: schoolA,
      senderUserId: teacher,
      receiverUserId: studentOne,
    }),
    fakeMessage({ id: 4, schoolId: schoolA, senderUserId: studentOne, isRead: true }),
    fakeMessage({ id: 5, schoolId: schoolA, receiverUserId: 99 }),
    fakeMessage({ id: 6, schoolId: schoolB, senderUserId: studentOne }),
    fakeMessage({ id: 7, schoolId: schoolA, senderUserId: studentOne, isRead: null }),
  ];

  await withInMemoryMessages(messages, async () => {
    assert.equal(
      await getUnreadChatCount({ userId: teacher, schoolId: schoolA }),
      3,
      "outgoing, already-read, other-user, and other-school rows do not count",
    );

    const marked = await markAllChatMessagesRead({
      userId: teacher,
      schoolId: schoolA,
    });
    assert.deepEqual(marked, { updated: 3, unreadCount: 0 });

    assert.equal(byId(messages, 1).isRead, true);
    assert.equal(byId(messages, 2).isRead, true);
    assert.equal(byId(messages, 7).isRead, true);
    assert.equal(byId(messages, 3).isRead, false, "outgoing messages stay unread for their recipient");
    assert.equal(byId(messages, 5).isRead, false, "another receiver is untouched");
    assert.equal(byId(messages, 6).isRead, false, "another school is untouched");

    assert.deepEqual(
      await markAllChatMessagesRead({ userId: teacher, schoolId: schoolA }),
      { updated: 0, unreadCount: 0 },
      "mark-all is idempotent",
    );
    assert.equal(
      await getUnreadChatCount({ userId: teacher, schoolId: schoolB }),
      1,
      "the current-school mutation never changes another school's count",
    );
  });
}

async function testVisiblePageAcknowledgesOnlyReturnedMessages() {
  const schoolId = 1;
  const subjectId = 100;
  const teacher = 10;
  const student = 20;
  const messages = Array.from({ length: 101 }, (_, index) =>
    fakeMessage({
      id: index + 1,
      schoolId,
      subjectId,
      senderUserId: student,
      receiverUserId: teacher,
      createdAt: `2026-09-23T00:${String(index).padStart(2, "0")}:00.000Z`,
    }),
  );

  await withInMemoryMessages(messages, async () => {
    const page = await getConversation({
      schoolId,
      subjectId,
      userAId: teacher,
      userBId: student,
      page: 1,
      limit: 100,
    });
    const returnedIds = (page.messages as unknown as FakeMessage[]).map(
      (message) => message.id,
    );
    assert.equal(returnedIds.length, 100);
    assert.equal(returnedIds[returnedIds.length - 1], 100);

    // Simulates a new incoming message arriving after the page snapshot.
    messages.push(
      fakeMessage({
        id: 102,
        schoolId,
        subjectId,
        senderUserId: student,
        receiverUserId: teacher,
        createdAt: "2026-09-23T02:00:00.000Z",
      }),
    );
    // This outgoing row is intentionally supplied too; sender/receiver scope
    // must still prevent it from being treated as a teacher's unread message.
    messages.push(
      fakeMessage({
        id: 103,
        schoolId,
        subjectId,
        senderUserId: teacher,
        receiverUserId: student,
        createdAt: "2026-09-23T02:01:00.000Z",
      }),
    );

    const marked = await markVisibleMessagesReadWithCounts({
      schoolId,
      subjectId,
      senderUserId: student,
      receiverUserId: teacher,
      messageIds: [...returnedIds, 103],
    });

    assert.deepEqual(marked, {
      updated: 100,
      conversationUnreadCount: 2,
      unreadCount: 2,
    });
    for (const id of returnedIds) {
      assert.equal(byId(messages, id).isRead, true, `returned message ${id} is read`);
    }
    assert.equal(byId(messages, 101).isRead, false, "unreturned page message remains unread");
    assert.equal(byId(messages, 102).isRead, false, "message received after snapshot remains unread");
    assert.equal(byId(messages, 103).isRead, false, "outgoing message is never acknowledged as inbound");

    const emptyPage = await markVisibleMessagesReadWithCounts({
      schoolId,
      subjectId,
      senderUserId: student,
      receiverUserId: teacher,
      messageIds: [],
    });
    assert.deepEqual(emptyPage, {
      updated: 0,
      conversationUnreadCount: 2,
      unreadCount: 2,
    });
  });
}

async function run() {
  await testMarkAllIsInboundAndSchoolScoped();
  await testVisiblePageAcknowledgesOnlyReturnedMessages();
  console.log("chat unread regression tests passed");
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
