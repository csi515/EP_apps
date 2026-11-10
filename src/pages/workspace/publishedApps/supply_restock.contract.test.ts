/**
 * 게시 앱 계약: supply_restock
 * 실행: npx tsx src/pages/workspace/publishedApps/supply_restock.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('supply_restock');
assertPublishedAppContract(app);
console.log('publishedApps/supply_restock.contract.test.ts: ok');
