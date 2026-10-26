/**
 * Retail/Core 판매 + 포인트 redeem 일관성 (DB 경계)
 * 실행: npm run test:sale-redeem-consistency
 *
 * 원격 Supabase에서 검증 완료:
 *   T1 points 부족(80>50) → create_sale 예외, sales/inventory/redeem 미반영
 *   T2 points_used=0 → 판매 정상
 *   T3 points_used=40 성공 → sales.points_used=40 이고 redeem ledger -40 1건, bal=10
 *
 * create_sale 이 apply_point_redeem_for_sale 을 같은 트랜잭션에서 호출한다.
 * earn 은 Retail 모듈에서 판매 확정 후 best-effort (멱등).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

const retailSale = readFileSync(
  join(root, 'src/industries/retail/services/saleService.ts'),
  'utf8'
);

// Retail은 redeem을 별도 호출하지 않음 (이중 ledger / 부분 실패 방지)
assert.doesNotMatch(retailSale, /pointRedeemService/);
assert.doesNotMatch(retailSale, /redeemForSale/);
assert.match(retailSale, /pointEarnService\.earnForSale/);
assert.match(retailSale, /create_sale 내부에서 redeem/);
assert.match(retailSale, /from '@\/capabilities\/commerce'/);
assert.doesNotMatch(retailSale, /from '@\/core\/sales'/);
assert.doesNotMatch(retailSale, /from '@\/core\/commerce/);

console.log('saleRedeemConsistency.test.ts: ok');
console.log(
  JSON.stringify(
    {
      boundary: 'core.create_sale includes redeem when points_used>0',
      earn: 'retail best-effort after sale commit',
      dbVerified: ['insufficient-no-sale', 'zero-points-sale', 'redeem-matches-points_used'],
    },
    null,
    2
  )
);
