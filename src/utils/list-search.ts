import { Op } from "sequelize";

export function parseListSearchQuery(
  query: Record<string, unknown> | undefined,
) {
  if (!query) {
    return "";
  }
  return String(query.search ?? query.keyword ?? "").trim();
}

export function buildSearchWhereClause(
  search: string,
  fields: string[],
): Record<string, unknown> | undefined {
  if (!search || fields.length === 0) {
    return undefined;
  }

  const searchLike = `%${search}%`;
  return {
    [Op.or]: fields.map((field) => ({
      [field]: { [Op.like]: searchLike },
    })),
  } as Record<string, unknown>;
}

export function combineWhereClauses(
  ...clauses: Array<Record<string, unknown> | undefined>
) {
  const active = clauses.filter(
    (clause) => clause && Object.keys(clause).length > 0,
  ) as Record<string, unknown>[];

  if (active.length === 0) {
    return undefined;
  }

  if (active.length === 1) {
    return active[0];
  }

  return { [Op.and]: active };
}
