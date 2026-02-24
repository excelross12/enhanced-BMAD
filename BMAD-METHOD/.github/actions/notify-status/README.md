# Notify Status Composite Action

A reusable GitHub Actions composite action for sending status notifications to Discord, creating GitHub deployment statuses, and posting PR comments.

## Features

- **Discord Notifications**: Send formatted notifications to Discord webhooks
- **GitHub Deployment Status**: Create deployment records in GitHub
- **PR Comments**: Post status updates as comments on pull requests
- **Multiple Notification Types**: Support for deployment, security, release, and CI failure notifications
- **Graceful Degradation**: Handles missing webhook URLs without failing

## Usage

### Deployment Notification

```yaml
- name: Notify deployment status
  uses: ./.github/actions/notify-status
  with:
    notification-type: 'deployment'
    status: 'success'
    environment: 'production'
    version: 'v1.2.3'
    commit-sha: ${{ github.sha }}
    deployer: ${{ github.actor }}
    duration: '120'
    discord-webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
    create-deployment-status: 'true'
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Security Alert Notification

```yaml
- name: Notify security alert
  uses: ./.github/actions/notify-status
  with:
    notification-type: 'security'
    severity: 'high'
    title: 'Vulnerability in lodash'
    description: 'Prototype pollution vulnerability detected'
    package: 'lodash'
    cve: 'CVE-2021-23337'
    discord-webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
    create-pr-comment: 'true'
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Release Notification

```yaml
- name: Notify release
  uses: ./.github/actions/notify-status
  with:
    notification-type: 'release'
    version: 'v1.2.3'
    changelog: ${{ steps.changelog.outputs.content }}
    url: ${{ steps.release.outputs.html_url }}
    discord-webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
```

### CI Failure Notification

```yaml
- name: Notify CI failure
  if: failure()
  uses: ./.github/actions/notify-status
  with:
    notification-type: 'ci-failure'
    workflow: ${{ github.workflow }}
    branch: ${{ github.ref_name }}
    commit-sha: ${{ github.sha }}
    error: 'Tests failed with 3 errors'
    url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
    discord-webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
    create-pr-comment: 'true'
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

### Required Inputs

| Input | Description |
|-------|-------------|
| `notification-type` | Type of notification: `deployment`, `security`, `release`, or `ci-failure` |

### Common Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `status` | Status of the event: `success`, `failure`, or `warning` | `success` |
| `commit-sha` | Commit SHA | `${{ github.sha }}` |
| `deployer` | User who triggered the event | `${{ github.actor }}` |
| `branch` | Branch name | `${{ github.ref_name }}` |
| `discord-webhook-url` | Discord webhook URL (from secrets) | - |
| `github-token` | GitHub token for API calls | `${{ github.token }}` |
| `create-deployment-status` | Create GitHub deployment status | `false` |
| `create-pr-comment` | Create PR comment | `false` |

### Deployment-Specific Inputs

| Input | Description |
|-------|-------------|
| `environment` | Target environment (staging, production) |
| `version` | Version being deployed |
| `duration` | Duration in seconds |

### Security-Specific Inputs

| Input | Description |
|-------|-------------|
| `severity` | Severity level (critical, high, medium, low) |
| `title` | Alert title |
| `description` | Alert description |
| `package` | Package name |
| `cve` | CVE identifier |

### Release-Specific Inputs

| Input | Description |
|-------|-------------|
| `version` | Release version |
| `changelog` | Release changelog |
| `url` | Release URL |

### CI Failure-Specific Inputs

| Input | Description |
|-------|-------------|
| `workflow` | Workflow name |
| `error` | Error message |
| `url` | URL to logs |

## Outputs

| Output | Description |
|--------|-------------|
| `notification-sent` | Whether Discord notification was sent successfully |
| `deployment-status-created` | Whether GitHub deployment status was created |
| `pr-comment-created` | Whether PR comment was created |

## Requirements

- The `tools/ci/format-notification.js` script must exist in the repository
- Discord webhook URL should be stored in repository secrets
- GitHub token must have permissions to create deployments and comments

## Error Handling

- **Missing webhook URL**: Action continues without sending Discord notification
- **Discord API failure**: Logs error but doesn't fail the workflow
- **GitHub API failure**: Logs error but doesn't fail the workflow
- **Invalid notification type**: Fails with clear error message

## Examples

### Complete Deployment Workflow

```yaml
name: Deploy to Production

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy
        id: deploy
        run: |
          # Deployment logic here
          echo "duration=120" >> $GITHUB_OUTPUT
      
      - name: Notify success
        if: success()
        uses: ./.github/actions/notify-status
        with:
          notification-type: 'deployment'
          status: 'success'
          environment: 'production'
          version: ${{ github.ref_name }}
          duration: ${{ steps.deploy.outputs.duration }}
          discord-webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
          create-deployment-status: 'true'
      
      - name: Notify failure
        if: failure()
        uses: ./.github/actions/notify-status
        with:
          notification-type: 'deployment'
          status: 'failure'
          environment: 'production'
          version: ${{ github.ref_name }}
          discord-webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
          create-deployment-status: 'true'
```

## Related Actions

- [setup-node-cache](../setup-node-cache/README.md) - Node.js setup with caching
- [smoke-tests](../smoke-tests/README.md) - Smoke test execution

## License

Part of the BMAD Method project.
