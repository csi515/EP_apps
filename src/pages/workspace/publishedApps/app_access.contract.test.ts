/**
 * 게시 앱 계약: app_access
 * 실행: npx tsx src/pages/workspace/publishedApps/app_access.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('app_access');
assertPublishedAppContract(app);
console.log('publishedApps/app_access.contract.test.ts: ok');
