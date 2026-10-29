/**
 * 게시 앱 계약: sop_risk
 * 실행: npx tsx src/pages/workspace/publishedApps/sop_risk.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('sop_risk');
assertPublishedAppContract(app);
console.log('publishedApps/sop_risk.contract.test.ts: ok');
