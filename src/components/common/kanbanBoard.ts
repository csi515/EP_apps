export type KanbanColumn = {
  id: string;
  title: string;
};

export type KanbanItem<TMeta = unknown> = {
  id: string;
  columnId: string;
  title: string;
  meta?: TMeta;
};

/**
 * 카드 컬럼 이동. 대상 컬럼이 없으면 원본 배열을 그대로 반환한다.
 */
export function moveKanbanCard<TMeta>(
  items: readonly KanbanItem<TMeta>[],
  cardId: string,
  toColumnId: string,
  knownColumnIds?: readonly string[]
): KanbanItem<TMeta>[] {
  if (!cardId || !toColumnId) return [...items];
  if (knownColumnIds && !knownColumnIds.includes(toColumnId)) {
    return [...items];
  }

  let found = false;
  const next = items.map((item) => {
    if (item.id !== cardId) return item;
    found = true;
    if (item.columnId === toColumnId) return item;
    return { ...item, columnId: toColumnId };
  });

  return found ? next : [...items];
}

export function groupKanbanItemsByColumn<TMeta>(
  columns: readonly KanbanColumn[],
  items: readonly KanbanItem<TMeta>[]
): Record<string, KanbanItem<TMeta>[]> {
  const map: Record<string, KanbanItem<TMeta>[]> = {};
  for (const col of columns) {
    map[col.id] = [];
  }
  for (const item of items) {
    if (!map[item.columnId]) {
      map[item.columnId] = [];
    }
    map[item.columnId].push(item);
  }
  return map;
}
