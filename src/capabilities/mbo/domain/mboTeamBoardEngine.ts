/**
 * MBO 팀 보드 — 담당자별 목표 묶음·계층 정렬 (순수 함수)
 */
import type { MboLevel } from './mboEngine';
import { memberMatchesQuery } from './mboVisibilityEngine';

export type TeamBoardObjective = {
  id: string;
  parentId: string | null;
  level: MboLevel;
  ownerId: string | null;
  ownerName: string;
  title: string;
  status: string;
  startDate: string;
  targetDate: string;
  weight: number;
  progressRate: number;
  departmentName: string;
};

export type PersonObjectiveBucket = {
  ownerKey: string;
  ownerId: string | null;
  ownerName: string;
  isViewer: boolean;
  objectives: TeamBoardObjective[];
  /** 루트 목표와 자식이 depth로 정렬된 플랫 목록 */
  flattened: Array<TeamBoardObjective & { depth: number }>;
  averageProgress: number;
  objectiveCount: number;
};

const LEVEL_ORDER: Record<MboLevel, number> = {
  company: 0,
  department: 1,
  individual: 2,
  project: 3,
};

function flattenHierarchy(objectives: TeamBoardObjective[]): PersonObjectiveBucket['flattened'] {
  const byId = new Map(objectives.map((o) => [o.id, o]));
  const ids = new Set(objectives.map((o) => o.id));

  const roots = objectives
    .filter((o) => !o.parentId || !ids.has(o.parentId))
    .sort(
      (a, b) =>
        LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.title.localeCompare(b.title, 'ko'),
    );

  const out: PersonObjectiveBucket['flattened'] = [];

  const walk = (node: TeamBoardObjective, depth: number) => {
    out.push({ ...node, depth });
    const children = objectives
      .filter((c) => c.parentId === node.id)
      .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.title.localeCompare(b.title, 'ko'));
    for (const child of children) walk(child, depth + 1);
  };

  for (const root of roots) walk(root, 0);
  const attached = new Set(out.map((o) => o.id));
  for (const o of objectives) {
    if (!attached.has(o.id)) out.push({ ...o, depth: 0 });
  }
  return out;
}

export function buildPersonObjectiveBuckets(
  objectives: readonly TeamBoardObjective[],
  opts: {
    viewerUserId?: string | null;
    personQuery?: string;
    ownerFilterUserId?: string | null;
  },
): PersonObjectiveBucket[] {
  const q = (opts.personQuery ?? '').trim();
  let rows = objectives;
  if (opts.ownerFilterUserId) {
    rows = rows.filter((o) => o.ownerId === opts.ownerFilterUserId);
  }

  const byOwner = new Map<string, TeamBoardObjective[]>();
  for (const o of rows) {
    const key = o.ownerId?.trim() ? o.ownerId! : `name:${o.ownerName.trim()}`;
    const list = byOwner.get(key) ?? [];
    list.push(o);
    byOwner.set(key, list);
  }

  const buckets: PersonObjectiveBucket[] = [];
  for (const [ownerKey, list] of byOwner.entries()) {
    const first = list[0]!;
    if (q && !memberMatchesQuery(first.ownerName, q)) continue;

    const avg =
      list.length === 0
        ? 0
        : Math.round(list.reduce((s, o) => s + (o.progressRate || 0), 0) / list.length);

    buckets.push({
      ownerKey,
      ownerId: first.ownerId,
      ownerName: first.ownerName,
      isViewer: Boolean(opts.viewerUserId && first.ownerId === opts.viewerUserId),
      objectives: list,
      flattened: flattenHierarchy(list),
      averageProgress: avg,
      objectiveCount: list.length,
    });
  }

  return buckets.sort((a, b) => {
    if (a.isViewer && !b.isViewer) return -1;
    if (!a.isViewer && b.isViewer) return 1;
    return a.ownerName.localeCompare(b.ownerName, 'ko');
  });
}
