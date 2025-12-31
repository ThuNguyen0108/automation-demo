const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Auto-detect unified report
const possiblePaths = [
  'build/logs/web.conf/allure/unified_report.html',
  'build/logs/qe.web/allure/unified_report.html',
  'build/logs/web/allure/unified_report.html',
];

let reportPath = null;
for (const possiblePath of possiblePaths) {
  const fullPath = path.resolve(possiblePath);
  if (fs.existsSync(fullPath)) {
    reportPath = fullPath;
    break;
  }
}

if (!reportPath) {
  console.error('❌ Unified report not found. Run "npm run report:allure:generate" first.');
  process.exit(1);
}

console.log(`📖 Opening unified report: ${reportPath}`);

// Open in default browser (cross-platform)
const platform = process.platform;
if (platform === 'win32') {
  execSync(`start "" "${reportPath}"`, { stdio: 'inherit' });
} else if (platform === 'darwin') {
  execSync(`open "${reportPath}"`, { stdio: 'inherit' });
} else {
  execSync(`xdg-open "${reportPath}"`, { stdio: 'inherit' });
}

