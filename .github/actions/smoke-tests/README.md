# Smoke Tests Action

A reusable composite GitHub Action that executes smoke tests against a deployed site with retry logic and comprehensive result reporting.

## Features

- **Comprehensive Test Suite**: Tests homepage, documentation pages, search functionality, assets, and link integrity
- **Retry Logic**: Automatically retries failed tests up to 2 times (configurable) with exponential backoff
- **Result Reporting**: Generates detailed JSON test results and uploads as artifacts
- **Configurable**: Supports custom site URL, timeout, and retry settings
- **Fast Feedback**: Completes within 5 minutes for typical deployments

## Usage

### Basic Usage

```yaml
- name: Run smoke tests
  uses: ./.github/actions/smoke-tests
  with:
    site-url: https://bmad-method.dev
```

### Advanced Usage

```yaml
- name: Run smoke tests with custom settings
  uses: ./.github/actions/smoke-tests
  with:
    site-url: https://staging.bmad-method.dev
    timeout: 600  # 10 minutes
    max-retries: 3
```

### With Result Handling

```yaml
- name: Run smoke tests
  id: smoke-tests
  uses: ./.github/actions/smoke-tests
  with:
    site-url: ${{ env.SITE_URL }}

- name: Check results
  if: always()
  run: |
    echo "Tests passed: ${{ steps.smoke-tests.outputs.passed }}"
    echo "Total tests: ${{ steps.smoke-tests.outputs.total-tests }}"
    echo "Passed: ${{ steps.smoke-tests.outputs.passed-tests }}"
    echo "Failed: ${{ steps.smoke-tests.outputs.failed-tests }}"

- name: Trigger rollback on failure
  if: failure() && steps.smoke-tests.outputs.passed == 'false'
  run: |
    echo "Smoke tests failed - triggering rollback"
    # Rollback logic here
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `site-url` | URL of the site to test | Yes | - |
| `timeout` | Test timeout in seconds | No | `300` (5 minutes) |
| `max-retries` | Maximum number of retries for failed tests | No | `2` |

## Outputs

| Output | Description | Type |
|--------|-------------|------|
| `test-results` | Complete JSON test results | JSON string |
| `passed` | Whether all tests passed | Boolean string (`true`/`false`) |
| `total-tests` | Total number of tests executed | Number string |
| `passed-tests` | Number of tests that passed | Number string |
| `failed-tests` | Number of tests that failed | Number string |

## Test Suite

The action executes the following smoke tests:

### 1. Homepage Loads
- Verifies the homepage returns HTTP 200
- Checks content-type is `text/html`
- Ensures response body is not empty

### 2. Documentation Pages Accessible
- Tests key documentation pages:
  - `/docs/` - Main documentation index
  - `/docs/workflows/` - Workflows documentation
  - `/docs/agents/` - Agents documentation
- Verifies each page returns HTTP 200

### 3. Search Functionality Works
- Checks if Pagefind search script is available
- Verifies `/pagefind/pagefind.js` returns HTTP 200
- Ensures search script is not empty

### 4. Assets Load Correctly
- Tests critical assets:
  - `/favicon.svg` - Site favicon
  - `/_astro/` - Astro assets directory
- Accepts HTTP 200, 301, 302, or 403 (directory listing disabled)

### 5. No Broken Links on Homepage
- Extracts all links from the homepage
- Tests up to 20 links (to avoid timeout)
- Only checks same-domain links
- Verifies each link returns HTTP 2xx or 3xx
- Reports any broken links with status codes

## Retry Logic

The action implements intelligent retry logic for flaky tests:

- **Exponential Backoff**: Waits 2^attempt seconds between retries (2s, 4s, 8s...)
- **Per-Test Retries**: Each test is retried independently
- **Attempt Tracking**: Records number of attempts for each test
- **Configurable**: Set `max-retries` input to adjust retry count

Example retry sequence:
1. Initial attempt fails
2. Wait 2 seconds, retry (attempt 2)
3. Wait 4 seconds, retry (attempt 3)
4. If still failing, mark test as failed

## Test Results

Test results are saved to `/tmp/smoke-test-results.json` and uploaded as a GitHub Actions artifact.

### Result Format

```json
{
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "duration": 12345
  },
  "tests": [
    {
      "name": "Homepage loads",
      "status": "passed",
      "duration": 234,
      "attempts": 1
    },
    {
      "name": "Documentation pages accessible",
      "status": "failed",
      "duration": 5678,
      "attempts": 3,
      "error": "Page /docs/workflows/ returned status 404"
    }
  ]
}
```

## Artifacts

The action uploads test results as artifacts:

- **Name**: `smoke-test-results-{run-id}`
- **Path**: `/tmp/smoke-test-results.json`
- **Retention**: 7 days

Access artifacts from the GitHub Actions run summary page.

## Error Handling

### Test Failures
- Individual test failures are captured with error messages
- Tests are retried automatically (up to `max-retries`)
- Action exits with code 1 if any test fails after all retries

### Network Errors
- Connection timeouts are caught and reported
- DNS resolution failures are handled gracefully
- SSL/TLS errors are captured with details

### Validation Errors
- Invalid `site-url` format is detected early
- Missing required inputs cause immediate failure
- Clear error messages guide troubleshooting

## Performance

- **Target Duration**: < 5 minutes for typical deployments
- **Timeout**: Configurable per-test timeout (default 5 minutes)
- **Link Checking**: Limited to 20 links to avoid timeout
- **Parallel Execution**: Tests run sequentially but with minimal overhead

## Integration Examples

### Staging Deployment

```yaml
deploy-staging:
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to staging
      run: |
        # Deployment steps
    
    - name: Run smoke tests
      uses: ./.github/actions/smoke-tests
      with:
        site-url: https://staging.bmad-method.dev
        timeout: 300
```

### Production Deployment with Rollback

```yaml
deploy-production:
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to production
      id: deploy
      run: |
        # Deployment steps
    
    - name: Run smoke tests
      id: smoke-tests
      uses: ./.github/actions/smoke-tests
      with:
        site-url: https://bmad-method.dev
    
    - name: Rollback on failure
      if: failure() && steps.smoke-tests.outputs.passed == 'false'
      run: |
        echo "Smoke tests failed - initiating rollback"
        # Trigger rollback workflow
```

### Manual Testing

```yaml
test-site:
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Test custom URL
      uses: ./.github/actions/smoke-tests
      with:
        site-url: ${{ github.event.inputs.url }}
        timeout: 600
        max-retries: 3
```

## Requirements

- **Node.js**: Built-in Node.js (no additional dependencies)
- **Network Access**: Requires outbound HTTPS access to test site
- **Permissions**: No special GitHub token permissions required

## Validation

The action validates requirements:
- **5.2**: Executes smoke tests after staging and production deployments
- **5.6**: Implements retry logic for flaky tests (up to 2 retries)
- **5.6**: Implements test result reporting and artifact upload
- **5.6**: Supports configurable site URL and timeout

## Related Actions

- [setup-node-cache](../setup-node-cache/README.md) - Node.js setup with caching
- [notify-status](../notify-status/README.md) - Status notifications

## License

Part of the BMAD Method project. See repository LICENSE for details.
