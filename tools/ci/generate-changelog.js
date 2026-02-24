/**
 * Generate changelog from conventional commits
 * Groups commits by type and formats as markdown
 */

const { execSync } = require('node:child_process');

/**
 * Parse conventional commit message
 * @param {string} message - Full commit message
 * @returns {object} Parsed commit info
 */
function parseCommit(message) {
  const lines = message.split('\n').filter((l) => l.trim());
  const firstLine = lines[0];

  // Parse first line: type(scope)!: subject
  const match = firstLine.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);

  if (!match) {
    return null;
  }

  const [, type, scope, breaking, subject] = match;

  // Extract breaking change description from footer
  let breakingDescription = null;
  for (const line of lines) {
    if (line.startsWith('BREAKING CHANGE:')) {
      breakingDescription = line.replace('BREAKING CHANGE:', '').trim();
      break;
    }
  }

  return {
    type,
    scope: scope || null,
    breaking: !!breaking || !!breakingDescription,
    breakingDescription,
    subject,
    message: firstLine,
  };
}

/**
 * Group commits by type
 * @param {Array<object>} commits - Parsed commits
 * @returns {object} Commits grouped by type
 */
function groupCommitsByType(commits) {
  const groups = {
    breaking: [],
    feat: [],
    fix: [],
    perf: [],
    refactor: [],
    docs: [],
    other: [],
  };

  for (const commit of commits) {
    if (commit.breaking) {
      groups.breaking.push(commit);
    }

    if (groups[commit.type]) {
      groups[commit.type].push(commit);
    } else {
      groups.other.push(commit);
    }
  }

  return groups;
}

/**
 * Format changelog section
 * @param {string} title - Section title
 * @param {Array<object>} commits - Commits for this section
 * @returns {string} Formatted markdown section
 */
function formatSection(title, commits) {
  if (commits.length === 0) {
    return '';
  }

  let section = `### ${title}\n\n`;

  for (const commit of commits) {
    const scope = commit.scope ? `**${commit.scope}**: ` : '';
    const description = commit.breakingDescription || commit.subject;
    section += `* ${scope}${description}\n`;
  }

  return section + '\n';
}

/**
 * Generate changelog from commits
 * @param {Array<string>} commitMessages - Array of commit messages
 * @param {string} version - Version number
 * @param {string} date - Release date (ISO format)
 * @returns {string} Formatted changelog
 */
function generateChangelog(commitMessages, version, date) {
  const parsedCommits = commitMessages.map(parseCommit).filter((c) => c !== null);

  if (parsedCommits.length === 0) {
    return '';
  }

  const groups = groupCommitsByType(parsedCommits);

  let changelog = `## [${version}] - ${date}\n\n`;

  // Breaking changes first
  if (groups.breaking.length > 0) {
    changelog += '### ⚠ BREAKING CHANGES\n\n';
    for (const commit of groups.breaking) {
      const description = commit.breakingDescription || commit.subject;
      changelog += `* ${description}\n`;
    }
    changelog += '\n';
  }

  // Features
  changelog += formatSection('Features', groups.feat);

  // Bug Fixes
  changelog += formatSection('Bug Fixes', groups.fix);

  // Performance Improvements
  changelog += formatSection('Performance Improvements', groups.perf);

  // Code Refactoring
  changelog += formatSection('Code Refactoring', groups.refactor);

  // Documentation
  changelog += formatSection('Documentation', groups.docs);

  return changelog;
}

/**
 * Get commits since last tag
 * @returns {Array<string>} Array of commit messages
 */
function getCommitsSinceLastTag() {
  try {
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:%B%n---COMMIT---`, { encoding: 'utf8' })
      .split('---COMMIT---')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    return commits;
  } catch {
    return [];
  }
}

function main() {
  const version = process.argv[2] || '0.0.0';
  const date = new Date().toISOString().split('T')[0];

  const commits = getCommitsSinceLastTag();
  const changelog = generateChangelog(commits, version, date);

  console.log(changelog);
}

if (require.main === module) {
  main();
}

module.exports = { generateChangelog, parseCommit, groupCommitsByType };
