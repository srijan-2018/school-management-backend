export const PROFILE_GENDERS = ["male", "female"] as const;

export type ProfileGender = (typeof PROFILE_GENDERS)[number];

/** Keep in sync with the mobile app avatar catalog. */
export const AVATARS_PER_GENDER = 20;

function buildAvatarIds(gender: ProfileGender) {
  return Array.from(
    { length: AVATARS_PER_GENDER },
    (_, index) => `${gender}-${String(index + 1).padStart(2, "0")}`,
  );
}

export const PROFILE_AVATAR_IDS: Record<ProfileGender, string[]> = {
  male: buildAvatarIds("male"),
  female: buildAvatarIds("female"),
};

const ALL_AVATAR_IDS = new Set<string>([
  ...PROFILE_AVATAR_IDS.male,
  ...PROFILE_AVATAR_IDS.female,
]);

export function normalizeProfileGender(value: unknown): ProfileGender | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return PROFILE_GENDERS.includes(normalized as ProfileGender)
    ? (normalized as ProfileGender)
    : null;
}

export function isValidAvatarId(avatarId: unknown, gender?: ProfileGender | null) {
  if (typeof avatarId !== "string" || !avatarId.trim()) {
    return false;
  }

  const id = avatarId.trim();
  if (gender) {
    return (PROFILE_AVATAR_IDS[gender] as readonly string[]).includes(id);
  }

  return ALL_AVATAR_IDS.has(id);
}

export function getAvatarGender(avatarId: string): ProfileGender | null {
  if ((PROFILE_AVATAR_IDS.male as readonly string[]).includes(avatarId)) {
    return "male";
  }
  if ((PROFILE_AVATAR_IDS.female as readonly string[]).includes(avatarId)) {
    return "female";
  }
  return null;
}
