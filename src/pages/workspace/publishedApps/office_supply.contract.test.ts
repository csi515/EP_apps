/**
 * 게시 앱 계약: office_supply
 * 실행: npx tsx src/pages/workspace/publishedApps/office_supply.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('office_supply');
assertPublishedAppContract(app);
console.log('publishedApps/office_supply.contract.test.ts: ok');
