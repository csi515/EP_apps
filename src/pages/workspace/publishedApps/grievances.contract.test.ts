/**
 * 게시 앱 계약: grievances
 * 실행: npx tsx src/pages/workspace/publishedApps/grievances.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('grievances');
assertPublishedAppContract(app);
console.log('publishedApps/grievances.contract.test.ts: ok');
