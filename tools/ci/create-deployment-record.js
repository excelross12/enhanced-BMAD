/**
 * Create deployment record with metadata
 * Validates and stores deployment information
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

/**
 * Validate deployment data
 * @param {object} data - Deployment data
 * @returns {object} Validation result
 */
function validateDeploymentData(data) {
  const errors = [];

  // Required fields
  if (!data.environment) {
    errors.push('environment is required');
  } else if (!['staging', 'production'].includes(data.environment)) {
    errors.push('environment must be "staging" or "production"');
  }

  if (!data.commit) {
    errors.push('commit is required');
  } else if (!/^[a-f0-9]{40}$/.test(data.commit)) {
    errors.push('commit must be a valid 40-character SHA');
  }

  if (!data.deployer) {
    errors.push('deployer is required');
  }

  if (!data.status) {
    errors.push('status is required');
  } else if (!['pending', 'success', 'failed', 'rolled_back'].includes(data.status)) {
    errors.push('status must be one of: pending, success, failed, rolled_back');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create deployment record
 * @param {object} data - Deployment data
 * @returns {object} Deployment record
 */
function createDeploymentRecord(data) {
  const validation = validateDeploymentData(data);

  if (!validation.valid) {
    throw new Error(`Invalid deployment data: ${validation.errors.join(', ')}`);
  }

  const id = crypto.randomUUID();
  const timestamp = data.timestamp || new Date().toISOString();

  const record = {
    id,
    environment: data.environment,
    version: data.version || null,
    commit: data.commit,
    timestamp,
    deployer: data.deployer,
    status: data.status,
    duration: data.duration || null,
    smoke_tests: data.smoke_tests || null,
    rollback_target: data.rollback_target || null,
  };

  return record;
}

/**
 * Save deployment record to file
 * @param {object} record - Deployment record
 * @param {string} outputDir - Output directory
 */
function saveDeploymentRecord(record, outputDir = '.') {
  const filename = `deployment-${record.id}.json`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(record, null, 2));

  return filepath;
}

function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const data = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    data[key] = value;
  }

  try {
    const record = createDeploymentRecord(data);
    console.log(JSON.stringify(record, null, 2));

    // Optionally save to file if output directory specified
    if (data.output) {
      const filepath = saveDeploymentRecord(record, data.output);
      console.error(`Deployment record saved to: ${filepath}`);
    }
  } catch (error) {
    console.error('Error creating deployment record:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createDeploymentRecord, validateDeploymentData };
