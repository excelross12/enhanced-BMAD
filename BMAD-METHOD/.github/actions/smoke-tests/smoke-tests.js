/**
 * Smoke Tests for BMAD Method Documentation Site
 *
 * This script executes a suite of smoke tests against a deployed site:
 * - Homepage loads
 * - Documentation pages accessible
 * - Search functionality works
 * - Assets load correctly
 * - No broken links on homepage
 *
 * Features:
 * - Retry logic for flaky tests (up to 2 retries by default)
 * - Test result reporting and artifact upload
 * - Configurable site URL and timeout
 */

const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');

// Configuration from environment variables
const SITE_URL = process.env.SITE_URL;
const TIMEOUT = Number.parseInt(process.env.TIMEOUT || '300', 10) * 1000; // Convert to ms
const MAX_RETRIES = Number.parseInt(process.env.MAX_RETRIES || '2', 10);

// Test results
const testResults = {
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    duration: 0,
  },
  tests: [],
};

/**
 * Make an HTTP/HTTPS request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: TIMEOUT,
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Extract links from HTML content
 */
function extractLinks(html, baseUrl) {
  const links = [];
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];

    // Skip anchors, javascript, mailto, tel
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    // Convert relative URLs to absolute
    let absoluteUrl;
    if (href.startsWith('http://') || href.startsWith('https://')) {
      absoluteUrl = href;
    } else if (href.startsWith('/')) {
      const base = new URL(baseUrl);
      absoluteUrl = `${base.protocol}//${base.host}${href}`;
    } else {
      const base = new URL(baseUrl);
      absoluteUrl = `${base.protocol}//${base.host}/${href}`;
    }

    // Only include links from the same domain
    const baseHost = new URL(baseUrl).host;
    const linkHost = new URL(absoluteUrl).host;
    if (baseHost === linkHost) {
      links.push(absoluteUrl);
    }
  }

  // Remove duplicates
  return [...new Set(links)];
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a test with retry logic
 */
async function executeTest(testName, testFn, retries = MAX_RETRIES) {
  const startTime = Date.now();
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 2^attempt seconds
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`  Retry ${attempt}/${retries} after ${backoffMs}ms...`);
        await sleep(backoffMs);
      }

      await testFn();

      const duration = Date.now() - startTime;
      return {
        name: testName,
        status: 'passed',
        duration,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        console.log(`  Attempt ${attempt + 1} failed: ${error.message}`);
      }
    }
  }

  const duration = Date.now() - startTime;
  return {
    name: testName,
    status: 'failed',
    duration,
    attempts: retries + 1,
    error: lastError.message,
  };
}

/**
 * Test: Homepage loads
 */
async function testHomepageLoads() {
  const response = await makeRequest(SITE_URL);

  if (response.statusCode !== 200) {
    throw new Error(`Expected status 200, got ${response.statusCode}`);
  }

  const contentType = response.headers['content-type'] || '';
  if (!contentType.includes('text/html')) {
    throw new Error(`Expected content-type to include text/html, got ${contentType}`);
  }

  if (response.body.length === 0) {
    throw new Error('Response body is empty');
  }
}

/**
 * Test: Documentation pages accessible
 */
async function testDocumentationPages() {
  const pages = ['/docs/', '/docs/workflows/', '/docs/agents/'];

  for (const page of pages) {
    const url = `${SITE_URL}${page}`;
    const response = await makeRequest(url);

    if (response.statusCode !== 200) {
      throw new Error(`Page ${page} returned status ${response.statusCode}`);
    }
  }
}

/**
 * Test: Search functionality works
 */
async function testSearchFunctionality() {
  // Check if Pagefind search is available
  const searchUrl = `${SITE_URL}/pagefind/pagefind.js`;
  const response = await makeRequest(searchUrl);

  if (response.statusCode !== 200) {
    throw new Error(`Search script not found (status ${response.statusCode})`);
  }

  if (response.body.length === 0) {
    throw new Error('Search script is empty');
  }
}

/**
 * Test: Assets load correctly
 */
async function testAssetsLoad() {
  const assets = [
    '/favicon.svg',
    '/_astro/', // Check if Astro assets directory is accessible
  ];

  for (const asset of assets) {
    const url = `${SITE_URL}${asset}`;
    const response = await makeRequest(url);

    // Accept 200 (file) or 301/302 (redirect) or 403 (directory listing disabled)
    if (![200, 301, 302, 403].includes(response.statusCode)) {
      throw new Error(`Asset ${asset} returned unexpected status ${response.statusCode}`);
    }
  }
}

/**
 * Test: No broken links on homepage
 */
async function testNoBrokenLinks() {
  // Fetch homepage
  const response = await makeRequest(SITE_URL);

  if (response.statusCode !== 200) {
    throw new Error(`Homepage returned status ${response.statusCode}`);
  }

  // Extract links
  const links = extractLinks(response.body, SITE_URL);
  console.log(`  Found ${links.length} links to check`);

  // Limit to first 20 links to avoid timeout
  const linksToCheck = links.slice(0, 20);
  const brokenLinks = [];

  for (const link of linksToCheck) {
    try {
      const linkResponse = await makeRequest(link);

      // Accept 2xx and 3xx status codes
      if (linkResponse.statusCode >= 400) {
        brokenLinks.push({ url: link, status: linkResponse.statusCode });
      }
    } catch (error) {
      brokenLinks.push({ url: link, error: error.message });
    }
  }

  if (brokenLinks.length > 0) {
    const brokenList = brokenLinks.map((b) => `${b.url} (${b.status || b.error})`).join(', ');
    throw new Error(`Found ${brokenLinks.length} broken links: ${brokenList}`);
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('BMAD Method Smoke Tests');
  console.log('='.repeat(60));
  console.log(`Site URL: ${SITE_URL}`);
  console.log(`Timeout: ${TIMEOUT}ms`);
  console.log(`Max retries: ${MAX_RETRIES}`);
  console.log('='.repeat(60));
  console.log('');

  const tests = [
    { name: 'Homepage loads', fn: testHomepageLoads },
    { name: 'Documentation pages accessible', fn: testDocumentationPages },
    { name: 'Search functionality works', fn: testSearchFunctionality },
    { name: 'Assets load correctly', fn: testAssetsLoad },
    { name: 'No broken links on homepage', fn: testNoBrokenLinks },
  ];

  const overallStartTime = Date.now();

  for (const test of tests) {
    console.log(`Running: ${test.name}`);
    const result = await executeTest(test.name, test.fn);
    testResults.tests.push(result);
    testResults.summary.total++;

    if (result.status === 'passed') {
      testResults.summary.passed++;
      console.log(`✓ PASSED (${result.duration}ms, ${result.attempts} attempt(s))`);
    } else {
      testResults.summary.failed++;
      console.log(`✗ FAILED (${result.duration}ms, ${result.attempts} attempt(s))`);
      console.log(`  Error: ${result.error}`);
    }
    console.log('');
  }

  testResults.summary.duration = Date.now() - overallStartTime;

  // Write results to file
  fs.writeFileSync('/tmp/smoke-test-results.json', JSON.stringify(testResults, null, 2));

  // Set GitHub Actions outputs
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed}`);
  console.log(`Failed: ${testResults.summary.failed}`);
  console.log(`Duration: ${testResults.summary.duration}ms`);
  console.log('='.repeat(60));

  // Set outputs for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const output = [
      `results=${JSON.stringify(testResults)}`,
      `passed=${testResults.summary.failed === 0 ? 'true' : 'false'}`,
      `total=${testResults.summary.total}`,
      `passed-count=${testResults.summary.passed}`,
      `failed-count=${testResults.summary.failed}`,
    ].join('\n');

    fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
  }

  // Exit with appropriate code
  if (testResults.summary.failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running smoke tests:', error);
  process.exit(1);
});
