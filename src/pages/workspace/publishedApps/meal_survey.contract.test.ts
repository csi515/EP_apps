/**
 * 게시 앱 계약: meal_survey
 * 실행: npx tsx src/pages/workspace/publishedApps/meal_survey.contract.test.ts
 */
import { getPublishedCompanyApp } from '../publishedCompanyApps';
import { assertPublishedAppContract } from './assertPublishedAppContract';

const app = getPublishedCompanyApp('meal_survey');
assertPublishedAppContract(app);
console.log('publishedApps/meal_survey.contract.test.ts: ok');
