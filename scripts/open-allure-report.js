const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Auto-detect report directory
const possiblePaths = [
  'build/logs/web.conf/allure/report',
  'build/logs/qe.web/allure/report',
  'build/logs/web/allure/report',
];

let reportPath = null;
for (const possiblePath of possiblePaths) {
  const fullPath = path.resolve(possiblePath);
  if (fs.existsSync(fullPath) && fs.readdirSync(fullPath).length > 0) {
    reportPath = fullPath;
    break;
  }
}

if (!reportPath) {
  console.error('❌ Allure report not found. Run "npm run report:allure:generate" first.');
  process.exit(1);
}

console.log(`📖 Opening Allure report: ${reportPath}`);
execSync(`npx allure open "${reportPath}"`, { stdio: 'inherit' });

