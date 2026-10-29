/**
 * 게시 앱 계약: resources
 * 실행: npx tsx src/pages/workspace/publishedApps/resources.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('resources');
assertPublishedAppContract(app);
console.log('publishedApps/resources.contract.test.ts: ok');
