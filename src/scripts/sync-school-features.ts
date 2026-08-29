import "dotenv/config";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db";
import School from "../models/school.model";
import SchoolFeature from "../models/school-feature.model";
import {
  SCHOOL_FEATURE_KEYS,
  getSchoolFeatureDefaultEnabled,
} from "../utils/school-features";
import "../models";

const syncSchoolFeatures = async () => {
  await sequelize.authenticate();
  console.log("Connected. Syncing SchoolFeatures...");

  await SchoolFeature.sync({ alter: true });
  console.log("SchoolFeatures table ready");

  const schools = await School.findAll({ attributes: ["id"] });
  let created = 0;

  for (const school of schools) {
    const schoolId = Number(school.id);
    for (const featureKey of SCHOOL_FEATURE_KEYS) {
      const [, wasCreated] = await SchoolFeature.findOrCreate({
        where: { schoolId, featureKey },
        defaults: {
          schoolId,
          featureKey,
          enabled: getSchoolFeatureDefaultEnabled(featureKey),
        },
      });
      if (wasCreated) created += 1;
    }
  }

  console.log(
    `Seeded features for ${schools.length} schools (${created} new rows)`,
  );

  const sample = await sequelize.query(
    "SELECT COUNT(*) as total FROM SchoolFeatures",
    { type: QueryTypes.SELECT },
  );
  console.log("SchoolFeatures count:", sample);

  await sequelize.close();
};

syncSchoolFeatures().catch(async (error) => {
  console.error(error);
  await sequelize.close().catch(() => undefined);
  process.exit(1);
});
