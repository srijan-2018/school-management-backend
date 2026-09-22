import { Op } from "sequelize";
import { sequelize } from "../config/db";
import ChatMessage from "../models/chat-message.model";
import SubjectTeacher from "../models/subject-teacher.model";
import Subject from "../models/subject.model";
import Teacher from "../models/teacher.model";
import User from "../models/user.model";

// ---------------------------------------------------------------------------
// Teacher resolution
// ---------------------------------------------------------------------------

export async function getTeacherForSubject(
  subjectId: number,
  schoolId: number,
) {
  const mapping = await SubjectTeacher.findOne({
    where: { subjectId, schoolId },
    include: [
      {
        model: Teacher,
        include: [{ model: User, attributes: ["id", "name", "email", "avatarId"] }],
      },
    ],
  });

  if (!mapping) {
    return null;
  }

  const teacher = (mapping as any).Teacher;
  const user = teacher?.User;

  return {
    teacherId: teacher?.id ?? null,
    userId: user?.id ?? null,
    name: user?.name ?? "Teacher",
    email: user?.email ?? null,
    avatarId: user?.avatarId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Send a message
// ---------------------------------------------------------------------------

export async function sendChatMessage(params: {
  schoolId: number;
  subjectId: number;
  senderUserId: number;
  receiverUserId: number;
  message: string;
}) {
  const { schoolId, subjectId, senderUserId, receiverUserId, message } = params;

  const chatMessage = await ChatMessage.create({
    schoolId,
    subjectId,
    senderUserId,
    receiverUserId,
    message,
    isRead: false,
  });

  return chatMessage;
}

// ---------------------------------------------------------------------------
// Get conversation (paginated)
// ---------------------------------------------------------------------------

export async function getConversation(params: {
  schoolId: number;
  subjectId: number;
  userAId: number;
  userBId: number;
  page: number;
  limit: number;
}) {
  const { schoolId, subjectId, userAId, userBId, page, limit } = params;
  const offset = (page - 1) * limit;

  const { rows: messages, count: total } = await ChatMessage.findAndCountAll({
    where: {
      schoolId,
      subjectId,
      [Op.or]: [
        { senderUserId: userAId, receiverUserId: userBId },
        { senderUserId: userBId, receiverUserId: userAId },
      ],
    },
    order: [["createdAt", "ASC"]],
    limit,
    offset,
    include: [
      { model: User, as: "sender", attributes: ["id", "name", "avatarId"] },
      { model: User, as: "receiver", attributes: ["id", "name", "avatarId"] },
    ],
  });

  return { messages, total };
}

// ---------------------------------------------------------------------------
// Mark messages as read
// ---------------------------------------------------------------------------

export async function markMessagesRead(params: {
  schoolId: number;
  subjectId: number;
  senderUserId: number;
  receiverUserId: number;
}) {
  const schoolId = Number(params.schoolId);
  const subjectId = Number(params.subjectId);
  const senderUserId = Number(params.senderUserId);
  const receiverUserId = Number(params.receiverUserId);

  const [updated] = await ChatMessage.update(
    { isRead: true },
    {
      where: {
        schoolId,
        subjectId,
        senderUserId,
        receiverUserId,
        isRead: false,
      },
    },
  );

  return Math.max(0, Number(updated) || 0);
}

export async function countUnreadFromSender(params: {
  schoolId: number;
  subjectId: number;
  senderUserId: number;
  receiverUserId: number;
}) {
  const count = await ChatMessage.count({
    where: {
      schoolId: Number(params.schoolId),
      subjectId: Number(params.subjectId),
      senderUserId: Number(params.senderUserId),
      receiverUserId: Number(params.receiverUserId),
      isRead: false,
    },
  });

  return Math.max(0, Number(count) || 0);
}

export async function markMessagesReadWithCounts(params: {
  schoolId: number;
  subjectId: number;
  senderUserId: number;
  receiverUserId: number;
}) {
  const updated = await markMessagesRead(params);
  const [conversationUnreadCount, unreadCount] = await Promise.all([
    countUnreadFromSender(params),
    getUnreadChatCount({
      userId: params.receiverUserId,
      schoolId: params.schoolId,
    }),
  ]);

  return {
    updated,
    conversationUnreadCount,
    unreadCount: Math.max(0, Number(unreadCount) || 0),
  };
}

// ---------------------------------------------------------------------------
// Get unread chat count for a user
// ---------------------------------------------------------------------------

export async function getUnreadChatCount(params: {
  userId: number;
  schoolId: number;
}) {
  const userId = Number(params.userId);
  const schoolId = Number(params.schoolId);

  const count = await ChatMessage.count({
    where: {
      schoolId,
      receiverUserId: userId,
      isRead: false,
    },
  });

  return Math.max(0, Number(count) || 0);
}

// ---------------------------------------------------------------------------
// List subjects with active chats for a user
// ---------------------------------------------------------------------------

export async function listChatSubjects(params: {
  userId: number;
  schoolId: number;
}) {
  const userId = Number(params.userId);
  const schoolId = Number(params.schoolId);

  const results: any[] = await ChatMessage.findAll({
    where: {
      schoolId,
      [Op.or]: [{ senderUserId: userId }, { receiverUserId: userId }],
    },
    attributes: [
      "subjectId",
      [sequelize.fn("MAX", sequelize.col("ChatMessage.createdAt")), "lastMessageAt"],
    ],
    group: ["subjectId"],
    include: [
      {
        model: Subject,
        attributes: ["id", "name"],
      },
    ],
    raw: false,
  });

  const subjects = await Promise.all(
    results.map(async (row: any) => {
      const subjectId = Number(row.subjectId);
      const unreadCount = await ChatMessage.count({
        where: {
          schoolId,
          subjectId,
          receiverUserId: userId,
          isRead: false,
        },
      });

      return {
        subjectId,
        subjectName: row.Subject?.name ?? "Unknown",
        lastMessageAt: row.getDataValue("lastMessageAt"),
        unreadCount: Math.max(0, Number(unreadCount) || 0),
      };
    }),
  );

  return subjects.sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

// ---------------------------------------------------------------------------
// List students who have chatted with a teacher for a subject
// ---------------------------------------------------------------------------

export async function listChatStudents(params: {
  teacherUserId: number;
  subjectId: number;
  schoolId: number;
}) {
  const teacherUserId = Number(params.teacherUserId);
  const subjectId = Number(params.subjectId);
  const schoolId = Number(params.schoolId);

  const results: any[] = await ChatMessage.findAll({
    where: {
      schoolId,
      subjectId,
      [Op.or]: [
        { senderUserId: teacherUserId },
        { receiverUserId: teacherUserId },
      ],
    },
    attributes: [
      [
        sequelize.literal(
          `CASE WHEN senderUserId = ${sequelize.escape(teacherUserId)} THEN receiverUserId ELSE senderUserId END`,
        ),
        "studentUserId",
      ],
      [sequelize.fn("MAX", sequelize.col("ChatMessage.createdAt")), "lastMessageAt"],
    ],
    group: [sequelize.literal("studentUserId") as any],
    order: [[sequelize.literal("lastMessageAt"), "DESC"]],
    raw: true,
  });

  const studentUserIds = results
    .map((row) => Number(row.studentUserId) || 0)
    .filter((id) => id > 0);
  if (studentUserIds.length === 0) return [];

  const users = await User.findAll({
    where: { id: { [Op.in]: studentUserIds } },
    attributes: ["id", "name", "avatarId"],
    raw: true,
  });

  const userMap = new Map(users.map((u: any) => [Number(u.id), u]));

  const students = await Promise.all(
    results.map(async (row) => {
      const studentUserId = Number(row.studentUserId) || 0;
      if (studentUserId <= 0) {
        return null;
      }

      const unreadCount = await countUnreadFromSender({
        schoolId,
        subjectId,
        senderUserId: studentUserId,
        receiverUserId: teacherUserId,
      });

      return {
        studentUserId,
        studentName: (userMap.get(studentUserId) as any)?.name ?? "Student",
        avatarId: (userMap.get(studentUserId) as any)?.avatarId ?? null,
        lastMessageAt: row.lastMessageAt,
        unreadCount,
      };
    }),
  );

  return students.filter(
    (student): student is NonNullable<typeof student> => student != null,
  );
}

// ---------------------------------------------------------------------------
// Get unread count for a specific conversation
// ---------------------------------------------------------------------------

export async function getSubjectUnreadCount(params: {
  subjectId: number;
  userId: number;
  schoolId: number;
}) {
  const { subjectId, userId, schoolId } = params;

  const count = await ChatMessage.count({
    where: {
      schoolId,
      subjectId,
      receiverUserId: userId,
      isRead: false,
    },
  });

  return count;
}

/** Mark every unread inbound message for this user (e.g. teacher inbox). */
export async function markAllChatMessagesRead(params: {
  userId: number;
  schoolId: number;
}) {
  const { userId, schoolId } = params;

  const [updated] = await ChatMessage.update(
    { isRead: true },
    {
      where: {
        schoolId,
        receiverUserId: userId,
        isRead: false,
      },
    },
  );

  return updated;
}
