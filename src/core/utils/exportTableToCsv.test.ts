import assert from 'node:assert/strict';
import { exportTableToCsv, type CsvColumn } from './exportTableToCsv';

let createdBlob: any = null;
let downloadedFilename = '';
let clicked = false;

// Mock DOM Blob and Anchor for Node runtime
class MockBlob {
  content: string;
  type: string;
  constructor(parts: string[], options: { type: string }) {
    this.content = parts.join('');
    this.type = options.type;
  }
  async text() {
    return this.content;
  }
}

(globalThis as any).Blob = MockBlob;
(globalThis as any).window = globalThis;
(globalThis as any).URL = {
  createObjectURL: (blob: any) => {
    createdBlob = blob;
    return 'blob:mock-url';
  },
  revokeObjectURL: () => {},
};

(globalThis as any).document = {
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
  createElement: (tag: string) => {
    return {
      tagName: tag,
      style: {},
      setAttribute: (k: string, v: string) => {
        if (k === 'download') downloadedFilename = v;
      },
      click: () => {
        clicked = true;
      },
    };
  },
};

async function run() {
  interface TestData {
    name: string;
    role: string;
    price: number;
  }

  const columns: CsvColumn<TestData>[] = [
    { header: '이름', key: 'name' },
    { header: '역할', key: 'role' },
    { header: '금액', key: 'price', formatter: (row) => `${row.price}원` },
  ];

  const data: TestData[] = [
    { name: '홍길동', role: '강사, 총괄', price: 10000 },
    { name: '김"철수"', role: '회원', price: 20000 },
  ];

  exportTableToCsv('members.csv', columns, data);

  assert.equal(clicked, true, '다운로드 링크 클릭 트리거됨');
  assert.equal(downloadedFilename, 'members.csv', '파일명 설정 일치');
  assert.ok(createdBlob, 'Blob 생성 확인');

  const text = await createdBlob.text();
  assert.ok(text.startsWith('\uFEFF'), 'UTF-8 BOM 헤더 포함 확인');
  assert.ok(text.includes('이름,역할,금액'), '헤더 행 생성 확인');
  assert.ok(text.includes('"강사, 총괄"'), '쉼표 포함 필드 따옴표 감싸기 확인');
  assert.ok(text.includes('"김""철수"""'), '따옴표 이스케이프 확인');
  assert.ok(text.includes('10000원'), '포맷터 정상 적용 확인');

  console.log('exportTableToCsv.test.ts: ok');
}

run();
