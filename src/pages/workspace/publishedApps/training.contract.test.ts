/**
 * 게시 앱 계약: training
 * 실행: npx tsx src/pages/workspace/publishedApps/training.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('training');
assertPublishedAppContract(app);
console.log('publishedApps/training.contract.test.ts: ok');
