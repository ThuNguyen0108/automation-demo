const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Auto-detect and set JAVA_HOME if not set or invalid
function detectJavaHome() {
  // Check if JAVA_HOME is already set and valid
  const currentJavaHome = process.env.JAVA_HOME;
  if (currentJavaHome && fs.existsSync(currentJavaHome) && fs.existsSync(path.join(currentJavaHome, 'bin', 'java.exe'))) {
    return currentJavaHome;
  }

  // Try to find Java installation
  const possiblePaths = [
    'C:\\Program Files\\Java\\jdk-11',
    'C:\\Program Files\\Java\\jdk-17',
    'C:\\Program Files\\Java\\jdk-21',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-11.0.27.6-hotspot',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-17',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21',
  ];

  for (const javaPath of possiblePaths) {
    if (fs.existsSync(javaPath) && fs.existsSync(path.join(javaPath, 'bin', 'java.exe'))) {
      process.env.JAVA_HOME = javaPath;
      return javaPath;
    }
  }

  // Try to find from java command
  try {
    const javaVersionOutput = execSync('java -XshowSettings:properties -version 2>&1', { encoding: 'utf-8' });
    const javaHomeMatch = javaVersionOutput.match(/java\.home\s*=\s*(.+)/);
    if (javaHomeMatch && javaHomeMatch[1]) {
      const detectedHome = javaHomeMatch[1].trim();
      if (fs.existsSync(detectedHome)) {
        process.env.JAVA_HOME = detectedHome;
        return detectedHome;
      }
    }
  } catch (err) {
    // Ignore
  }

  return null;
}

const javaHome = detectJavaHome();
if (javaHome) {
  console.log(`✓ JAVA_HOME detected: ${javaHome}`);
} else {
  console.warn('⚠ JAVA_HOME not found. Trying to continue...');
  console.warn('   Tip: Set JAVA_HOME environment variable or install Java');
}

// Auto-detect results directory
const possiblePaths = [
  'build/logs/web.conf/allure/results',
  'build/logs/qe.web/allure/results',
  'build/logs/web/allure/results',
];

let resultsPath = null;
for (const possiblePath of possiblePaths) {
  const fullPath = path.resolve(possiblePath);
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath);
    if (files.length > 0) {
      resultsPath = fullPath;
      break;
    }
  }
}

if (!resultsPath) {
  console.error('❌ No Allure results found. Please run tests first.');
  process.exit(1);
}

const reportsPath = path.dirname(resultsPath);
const reportPath = path.join(reportsPath, 'report');
const unifiedPath = path.join(reportsPath, 'unified_report.html');

console.log(`📊 Generating Allure report from: ${resultsPath}`);

try {
  // Generate full report
  execSync(
    `npx allure generate "${resultsPath}" --clean -o "${reportPath}"`,
    { stdio: 'inherit' }
  );

  // Generate unified report (single HTML file)
  const unifiedDir = path.join(reportsPath, 'unified');
  execSync(
    `npx allure generate "${resultsPath}" --clean --single-file -o "${unifiedDir}"`,
    { stdio: 'inherit' }
  );

  // Copy unified report to root of reports folder
  const unifiedIndex = path.join(unifiedDir, 'index.html');
  if (fs.existsSync(unifiedIndex)) {
    fs.copyFileSync(unifiedIndex, unifiedPath);
    fs.rmSync(unifiedDir, { recursive: true, force: true });
    console.log(`✅ Unified report: ${unifiedPath}`);
  }

  console.log(`✅ Report generated: ${reportPath}`);
  console.log(`\n📖 To view report, run:`);
  console.log(`   npm run report:allure:open`);
  console.log(`   OR open unified report: ${unifiedPath}`);
} catch (error) {
  console.error('❌ Error generating Allure report:', error.message);
  console.error('\n💡 Tip: If Java is not available, use Playwright HTML report instead:');
  console.error('   npx playwright show-report');
  console.error('\n   Or install/configure Java and set JAVA_HOME environment variable.');
  process.exit(1);
}

