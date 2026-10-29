/**
 * 게시 앱 계약: shuttle
 * 실행: npx tsx src/pages/workspace/publishedApps/shuttle.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('shuttle');
assertPublishedAppContract(app);
console.log('publishedApps/shuttle.contract.test.ts: ok');
