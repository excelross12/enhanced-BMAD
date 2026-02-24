/**
 * Generate cache key for CI/CD workflows
 * Computes hash of package-lock.json and includes Node.js version and OS
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function generateCacheKey() {
  const lockfilePath = path.join(process.cwd(), 'package-lock.json');

  if (!fs.existsSync(lockfilePath)) {
    console.error('Error: package-lock.json not found');
    process.exit(1);
  }

  const lockfileContent = fs.readFileSync(lockfilePath, 'utf8');
  const hash = crypto.createHash('sha256').update(lockfileContent).digest('hex');

  const nodeVersion = process.env.NODE_VERSION || process.version.replace('v', '');
  const os = process.env.RUNNER_OS || process.platform;

  const cacheKey = `${os}-node-${nodeVersion}-${hash}`;

  console.log(cacheKey);
  return cacheKey;
}

if (require.main === module) {
  generateCacheKey();
}

module.exports = { generateCacheKey };
