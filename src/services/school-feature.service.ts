import {
  SCHOOL_FEATURE_BY_ROUTE_PREFIX,
  SCHOOL_FEATURE_CATALOG,
  SCHOOL_FEATURE_KEYS,
  type SchoolFeatureKey,
  getSchoolFeatureDefaultEnabled,
  isSchoolFeatureKey,
} from "../utils/school-features";
import SchoolFeature from "../models/school-feature.model";

export async function ensureSchoolFeatures(schoolId: number) {
  const existing = await SchoolFeature.findAll({
    where: { schoolId },
    attributes: ["featureKey"],
  });
  const existingKeys = new Set(existing.map((row) => row.featureKey));
  const missing = SCHOOL_FEATURE_KEYS.filter((key) => !existingKeys.has(key));

  if (missing.length === 0) return;

  await SchoolFeature.bulkCreate(
    missing.map((featureKey) => ({
      schoolId,
      featureKey,
      enabled: getSchoolFeatureDefaultEnabled(featureKey),
    })),
    { ignoreDuplicates: true },
  );
}

export async function getSchoolFeatureMap(schoolId: number) {
  await ensureSchoolFeatures(schoolId);

  const rows = await SchoolFeature.findAll({
    where: { schoolId },
  });

  const byKey = new Map(
    rows.map((row) => [row.featureKey as SchoolFeatureKey, Boolean(row.enabled)]),
  );

  return SCHOOL_FEATURE_CATALOG.map((feature) => ({
    key: feature.key,
    label: feature.label,
    description: feature.description,
    group: feature.group,
    defaultEnabled: getSchoolFeatureDefaultEnabled(feature.key),
    enabled: byKey.has(feature.key)
      ? Boolean(byKey.get(feature.key))
      : getSchoolFeatureDefaultEnabled(feature.key),
  }));
}

export async function isSchoolFeatureEnabled(
  schoolId: number,
  featureKey: SchoolFeatureKey,
) {
  await ensureSchoolFeatures(schoolId);
  const row = await SchoolFeature.findOne({
    where: { schoolId, featureKey },
  });
  return row
    ? Boolean(row.enabled)
    : getSchoolFeatureDefaultEnabled(featureKey);
}

export async function setSchoolFeatures(
  schoolId: number,
  features: Array<{ key: string; enabled: boolean }>,
) {
  await ensureSchoolFeatures(schoolId);

  const updates = features.filter((item) => isSchoolFeatureKey(item.key));

  for (const item of updates) {
    const [row] = await SchoolFeature.findOrCreate({
      where: { schoolId, featureKey: item.key },
      defaults: {
        schoolId,
        featureKey: item.key,
        enabled: item.enabled,
      },
    });
    if (Boolean(row.enabled) !== Boolean(item.enabled)) {
      await row.update({ enabled: Boolean(item.enabled) });
    }
  }

  return getSchoolFeatureMap(schoolId);
}

export function resolveFeatureKeyFromPath(pathname: string): SchoolFeatureKey | null {
  const cleaned = pathname.replace(/^\/api\/?/, "").replace(/^\//, "");
  const segment = cleaned.split("/")[0]?.trim().toLowerCase();
  if (!segment) return null;
  return SCHOOL_FEATURE_BY_ROUTE_PREFIX[segment] ?? null;
}
