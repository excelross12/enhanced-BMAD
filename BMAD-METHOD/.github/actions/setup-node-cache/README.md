# Setup Node.js with Cache

A reusable composite GitHub Action that sets up Node.js with intelligent dependency caching.

## Features

- Sets up Node.js with specified version
- Generates deterministic cache keys based on package-lock.json hash, Node.js version, and OS
- Caches both `~/.npm` and `node_modules` directories
- Automatically installs dependencies on cache miss
- Provides cache-hit status as output
- Gracefully handles cache failures by proceeding with fresh installation

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `node-version` | Node.js version to use | Yes | `20` |
| `working-directory` | Working directory for the action | No | `.` |

## Outputs

| Output | Description |
|--------|-------------|
| `cache-hit` | Whether the cache was hit (`true`/`false`) |
| `cache-key` | The cache key that was used |

## Usage

### Basic Usage

```yaml
- name: Setup Node.js with caching
  uses: ./.github/actions/setup-node-cache
  with:
    node-version: '20'
```

### With Custom Working Directory

```yaml
- name: Setup Node.js with caching
  uses: ./.github/actions/setup-node-cache
  with:
    node-version: '22'
    working-directory: './packages/my-package'
```

### Using Outputs

```yaml
- name: Setup Node.js with caching
  id: setup
  uses: ./.github/actions/setup-node-cache
  with:
    node-version: '20'

- name: Check cache status
  run: |
    echo "Cache hit: ${{ steps.setup.outputs.cache-hit }}"
    echo "Cache key: ${{ steps.setup.outputs.cache-key }}"
```

### Matrix Testing

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js with caching
        uses: ./.github/actions/setup-node-cache
        with:
          node-version: ${{ matrix.node-version }}
```

## Cache Strategy

### Cache Key Generation

The cache key is generated using the format:
```
{OS}-node-{NODE_VERSION}-{PACKAGE_LOCK_HASH}
```

Where:
- `OS`: The runner operating system (e.g., `Linux`, `macOS`, `Windows`)
- `NODE_VERSION`: The Node.js version (e.g., `20`, `22`)
- `PACKAGE_LOCK_HASH`: SHA-256 hash of `package-lock.json`

### Cache Paths

The action caches:
- `~/.npm`: npm's global cache directory
- `node_modules`: Project dependencies

### Cache Invalidation

The cache is automatically invalidated when:
- `package-lock.json` changes (different hash)
- Node.js version changes
- Operating system changes

### Restore Fallback

If an exact cache match is not found, the action attempts to restore from:
```
{OS}-node-{NODE_VERSION}-
```

This allows partial cache hits when only the package-lock.json has changed slightly.

## Performance Targets

- **Cache hit**: Dependency restoration < 30 seconds
- **Cache miss**: Dependency installation < 2 minutes

## Error Handling

The action gracefully handles cache failures:
- If cache restoration fails, it proceeds with fresh `npm ci` installation
- If `package-lock.json` is missing, the cache key generation will fail with a clear error message
- The workflow will not fail due to cache issues alone

## Requirements

This action requires:
- The repository to be checked out first (`actions/checkout`)
- A valid `package-lock.json` file in the working directory
- The `tools/ci/generate-cache-key.js` script to be present in the repository

## Related

- [notify-status](../notify-status/README.md) - Send status notifications
- [smoke-tests](../smoke-tests/README.md) - Run deployment smoke tests
