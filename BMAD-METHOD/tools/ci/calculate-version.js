/**
 * Calculate semantic version bump from conventional commits
 * Analyzes commit messages to determine version bump type (major, minor, patch)
 */

const { execSync } = require('node:child_process');

/**
 * Parse conventional commit message
 * @param {string} message - Commit message
 * @returns {object} Parsed commit info
 */
function parseCommit(message) {
  const lines = message.split('\n');
  const firstLine = lines[0];

  // Check for breaking change indicator in first line
  const hasBreakingInFirstLine = firstLine.includes('!');

  // Extract type from first line (e.g., "feat:", "fix:", "feat(scope)!")
  const typeMatch = firstLine.match(/^(\w+)(\(.+?\))?!?:/);
  const type = typeMatch ? typeMatch[1] : null;

  // Check for BREAKING CHANGE in footer
  const hasBreakingInFooter = message.includes('BREAKING CHANGE:');

  return {
    type,
    breaking: hasBreakingInFirstLine || hasBreakingInFooter,
    message: firstLine,
  };
}

/**
 * Determine version bump type from commits
 * @param {Array<string>} commits - Array of commit messages
 * @returns {string|null} Version bump type: 'major', 'minor', 'patch', or null
 */
function calculateVersionBump(commits) {
  let hasBreaking = false;
  let hasFeat = false;
  let hasFix = false;

  for (const commit of commits) {
    const parsed = parseCommit(commit);

    if (parsed.breaking) {
      hasBreaking = true;
    }

    if (parsed.type === 'feat') {
      hasFeat = true;
    }

    if (['fix', 'perf', 'refactor'].includes(parsed.type)) {
      hasFix = true;
    }
  }

  if (hasBreaking) {
    return 'major';
  } else if (hasFeat) {
    return 'minor';
  } else if (hasFix) {
    return 'patch';
  }

  return null;
}

/**
 * Get commits since last tag
 * @returns {Array<string>} Array of commit messages
 */
function getCommitsSinceLastTag() {
  try {
    // Get last tag
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();

    // Get commits since last tag
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:%B%n---COMMIT---`, { encoding: 'utf8' })
      .split('---COMMIT---')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    return commits;
  } catch {
    // No tags found, get all commits
    try {
      const commits = execSync('git log --pretty=format:%B%n---COMMIT---', { encoding: 'utf8' })
        .split('---COMMIT---')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      return commits;
    } catch (error_) {
      console.error('Error getting commits:', error_.message);
      return [];
    }
  }
}

/**
 * Calculate next version
 * @param {string} currentVersion - Current version (e.g., "1.2.3")
 * @param {string} bump - Bump type: 'major', 'minor', or 'patch'
 * @returns {string} Next version
 */
function calculateNextVersion(currentVersion, bump) {
  const [major, minor, patch] = currentVersion.replace(/^v/, '').split('.').map(Number);

  switch (bump) {
    case 'major': {
      return `${major + 1}.0.0`;
    }
    case 'minor': {
      return `${major}.${minor + 1}.0`;
    }
    case 'patch': {
      return `${major}.${minor}.${patch + 1}`;
    }
    default: {
      return currentVersion;
    }
  }
}

function main() {
  const commits = getCommitsSinceLastTag();

  if (commits.length === 0) {
    console.log('No commits found');
    return;
  }

  const bump = calculateVersionBump(commits);

  if (!bump) {
    console.log('No version bump needed');
    return;
  }

  console.log(bump);
}

if (require.main === module) {
  main();
}

module.exports = { calculateVersionBump, parseCommit, calculateNextVersion };
