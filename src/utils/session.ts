import crypto from "crypto";

import UserSession from "../models/user-session.model";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function deactivateUserSessions(userId: number) {
  await UserSession.update(
    { isActive: false },
    { where: { userId, isActive: true } },
  );
}

export async function createUserSession(params: {
  userId: number;
  deviceId: string;
  deviceName?: string | null;
  refreshToken: string;
}) {
  return UserSession.create({
    userId: params.userId,
    deviceId: params.deviceId,
    deviceName: params.deviceName?.trim() || null,
    refreshTokenHash: hashToken(params.refreshToken),
    isActive: true,
    lastActiveAt: new Date(),
  });
}

export async function findActiveSessionById(sessionId: number, userId: number) {
  return UserSession.findOne({
    where: {
      id: sessionId,
      userId,
      isActive: true,
    },
  });
}

export async function findActiveSessionByRefreshToken(refreshToken: string) {
  return UserSession.findOne({
    where: {
      refreshTokenHash: hashToken(refreshToken),
      isActive: true,
    },
  });
}
