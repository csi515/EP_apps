/**
 * 게시 앱 계약: volunteer
 * 실행: npx tsx src/pages/workspace/publishedApps/volunteer.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('volunteer');
assertPublishedAppContract(app);
console.log('publishedApps/volunteer.contract.test.ts: ok');
