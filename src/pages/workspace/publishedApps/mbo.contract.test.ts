/**
 * 게시 앱 계약: mbo
 * 실행: npx tsx src/pages/workspace/publishedApps/mbo.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('mbo');
assertPublishedAppContract(app);
console.log('publishedApps/mbo.contract.test.ts: ok');
