/**
 * Format notification messages for Discord and other channels
 * Takes deployment data and formats Discord-compatible messages
 */

/**
 * Format deployment notification for Discord
 * @param {object} data - Deployment data
 * @returns {object} Discord webhook payload
 */
function formatDeploymentNotification(data) {
  const { status, environment, version, commit, deployer, duration, timestamp } = data;

  const isSuccess = status === 'success';
  const emoji = isSuccess ? '🚀' : '❌';
  const color = isSuccess ? 3_066_993 : 15_158_332; // Green or Red
  const statusText = isSuccess ? '✅ Success' : '❌ Failed';

  const fields = [
    { name: 'Environment', value: environment, inline: true },
    { name: 'Status', value: statusText, inline: true },
  ];

  if (version) {
    fields.push({ name: 'Version', value: version, inline: true });
  }

  if (commit) {
    const shortCommit = commit.slice(0, 7);
    fields.push({ name: 'Commit', value: shortCommit, inline: true });
  }

  if (deployer) {
    fields.push({ name: 'Deployer', value: `@${deployer}`, inline: true });
  }

  if (duration) {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    fields.push({ name: 'Duration', value: durationText, inline: true });
  }

  return {
    embeds: [
      {
        title: `${emoji} ${environment.charAt(0).toUpperCase() + environment.slice(1)} Deployment`,
        color,
        fields,
        timestamp: timestamp || new Date().toISOString(),
      },
    ],
  };
}

/**
 * Format security alert notification for Discord
 * @param {object} data - Security alert data
 * @returns {object} Discord webhook payload
 */
function formatSecurityNotification(data) {
  const { severity, title, description, package: packageName, cve } = data;

  const fields = [{ name: 'Severity', value: severity, inline: true }];

  if (packageName) {
    fields.push({ name: 'Package', value: packageName, inline: true });
  }

  if (cve) {
    fields.push({ name: 'CVE', value: cve, inline: true });
  }

  return {
    embeds: [
      {
        title: `🔒 ${title}`,
        description,
        color: 15_158_332, // Red
        fields,
        footer: { text: 'Review and address immediately' },
      },
    ],
  };
}

/**
 * Format release notification for Discord
 * @param {object} data - Release data
 * @returns {object} Discord webhook payload
 */
function formatReleaseNotification(data) {
  const { version, changelog, url } = data;

  let description = `Release ${version} has been published`;

  if (url) {
    description += `\n\n[View Release](${url})`;
  }

  if (changelog) {
    // Truncate changelog if too long
    const truncatedChangelog = changelog.length > 500 ? changelog.slice(0, 500) + '...' : changelog;
    description += `\n\n${truncatedChangelog}`;
  }

  return {
    embeds: [
      {
        title: `🎉 Release ${version}`,
        description,
        color: 3_066_993, // Green
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Format CI failure notification for Discord
 * @param {object} data - CI failure data
 * @returns {object} Discord webhook payload
 */
function formatCIFailureNotification(data) {
  const { workflow, branch, commit, error, url } = data;

  const fields = [
    { name: 'Workflow', value: workflow, inline: true },
    { name: 'Branch', value: branch, inline: true },
  ];

  if (commit) {
    const shortCommit = commit.slice(0, 7);
    fields.push({ name: 'Commit', value: shortCommit, inline: true });
  }

  let description = 'CI pipeline failed';

  if (error) {
    description += `\n\n\`\`\`\n${error}\n\`\`\``;
  }

  if (url) {
    description += `\n\n[View Logs](${url})`;
  }

  return {
    embeds: [
      {
        title: '❌ CI Failure',
        description,
        color: 15_158_332, // Red
        fields,
      },
    ],
  };
}

function main() {
  const type = process.argv[2];
  const dataJson = process.argv[3];

  if (!type || !dataJson) {
    console.error('Usage: format-notification.js <type> <json-data>');
    console.error('Types: deployment, security, release, ci-failure');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(dataJson);
  } catch (error) {
    console.error('Error parsing JSON data:', error.message);
    process.exit(1);
  }

  let notification;

  switch (type) {
    case 'deployment': {
      notification = formatDeploymentNotification(data);
      break;
    }
    case 'security': {
      notification = formatSecurityNotification(data);
      break;
    }
    case 'release': {
      notification = formatReleaseNotification(data);
      break;
    }
    case 'ci-failure': {
      notification = formatCIFailureNotification(data);
      break;
    }
    default: {
      console.error(`Unknown notification type: ${type}`);
      process.exit(1);
    }
  }

  console.log(JSON.stringify(notification, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  formatDeploymentNotification,
  formatSecurityNotification,
  formatReleaseNotification,
  formatCIFailureNotification,
};
