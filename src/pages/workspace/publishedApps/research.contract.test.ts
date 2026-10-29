/**
 * 게시 앱 계약: research
 * 실행: npx tsx src/pages/workspace/publishedApps/research.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('research');
assertPublishedAppContract(app);
console.log('publishedApps/research.contract.test.ts: ok');
