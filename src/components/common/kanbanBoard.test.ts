/**
 * 실행: npx tsx src/components/common/kanbanBoard.test.ts
 */
import assert from 'node:assert/strict';
import {
  groupKanbanItemsByColumn,
  moveKanbanCard,
  type KanbanColumn,
  type KanbanItem,
} from './kanbanBoard';

const columns: KanbanColumn[] = [
  { id: 'todo', title: '할 일' },
  { id: 'doing', title: '진행' },
  { id: 'done', title: '완료' },
];

const items: KanbanItem[] = [
  { id: 'c1', columnId: 'todo', title: '카드1' },
  { id: 'c2', columnId: 'doing', title: '카드2' },
];

{
  const next = moveKanbanCard(items, 'c1', 'doing', columns.map((c) => c.id));
  assert.equal(next.find((i) => i.id === 'c1')?.columnId, 'doing');
  assert.equal(items.find((i) => i.id === 'c1')?.columnId, 'todo', '원본 불변');
}

{
  const same = moveKanbanCard(items, 'c1', 'todo');
  assert.equal(same.find((i) => i.id === 'c1')?.columnId, 'todo');
}

{
  const unknown = moveKanbanCard(items, 'missing', 'done');
  assert.deepEqual(unknown, items);
}

{
  const blocked = moveKanbanCard(items, 'c1', 'ghost', ['todo', 'doing']);
  assert.equal(blocked.find((i) => i.id === 'c1')?.columnId, 'todo');
}

{
  const grouped = groupKanbanItemsByColumn(columns, items);
  assert.equal(grouped.todo.length, 1);
  assert.equal(grouped.doing.length, 1);
  assert.equal(grouped.done.length, 0);
}

console.log('kanbanBoard.test.ts: ok');
