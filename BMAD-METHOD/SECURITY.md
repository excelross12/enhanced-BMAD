# Security Policy

## Reporting Security Vulnerabilities

The BMAD Method team takes security seriously. We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions.

### How to Report a Vulnerability

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities through one of the following methods:

1. **GitHub Security Advisories (Preferred)**
   - Navigate to the [Security tab](https://github.com/bmad-code-org/BMAD-METHOD/security/advisories)
   - Click "Report a vulnerability"
   - Fill out the advisory form with details about the vulnerability

2. **Email**
   - Send an email to: security@bmad-method.dev
   - Include "SECURITY" in the subject line
   - Provide detailed information about the vulnerability (see below)

### What to Include in Your Report

To help us understand and address the issue quickly, please include:

- **Description**: A clear description of the vulnerability
- **Impact**: The potential impact and severity of the issue
- **Steps to Reproduce**: Detailed steps to reproduce the vulnerability
- **Proof of Concept**: Code, screenshots, or other evidence demonstrating the issue
- **Affected Versions**: Which versions of BMAD Method are affected
- **Suggested Fix**: If you have ideas for how to fix the issue (optional)
- **Your Contact Information**: How we can reach you for follow-up questions

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Updates**: We will keep you informed of our progress as we investigate and address the issue
- **Resolution Timeline**: We aim to resolve critical vulnerabilities within 30 days
- **Credit**: With your permission, we will credit you in the security advisory and release notes

### Disclosure Policy

- Please allow us reasonable time to address the vulnerability before public disclosure
- We will coordinate with you on the disclosure timeline
- We will publicly acknowledge your responsible disclosure (unless you prefer to remain anonymous)

## Security Scanning Processes

The BMAD Method employs multiple automated security scanning processes to detect and prevent security issues:

### 1. Secret Detection with TruffleHog

**What it does:**
- Scans all commits for hardcoded secrets, API keys, tokens, and credentials
- Uses pattern matching and entropy analysis to detect potential secrets
- Verifies detected secrets when possible to reduce false positives

**When it runs:**
- On every pull request
- On every push to the main branch
- Daily scheduled scan of the entire repository history
- Can be triggered manually via workflow dispatch

**Custom patterns detected:**
- BMAD API keys: `bmad_[a-zA-Z0-9]{32,64}`
- Discord webhooks: `https://discord.com/api/webhooks/...`
- Generic secrets: AWS keys, GitHub tokens, private keys, passwords, etc.

**What happens when secrets are detected:**
- The workflow fails immediately
- A comment is posted on the PR with remediation instructions
- The PR cannot be merged until secrets are removed
- An error is logged in the workflow run

**How to fix:**
1. Remove the secret from your code
2. Rotate/invalidate the exposed credential immediately
3. Use environment variables or GitHub Secrets for sensitive data
4. Push the fix to your branch
5. Re-run the security scan

**Configuration:** See `.trufflehog.yaml` for custom patterns and exclusions

### 2. Dependency Vulnerability Scanning

**What it does:**
- Scans npm dependencies for known security vulnerabilities
- Uses npm audit to check against the National Vulnerability Database
- Identifies high and critical severity vulnerabilities

**When it runs:**
- On every pull request
- On every push to the main branch
- Daily scheduled scan at 9:00 AM UTC
- Can be triggered manually via workflow dispatch

**Severity levels:**
- **Critical**: Immediate action required, blocks PR merge
- **High**: Urgent action required, blocks PR merge
- **Medium**: Should be addressed in next release
- **Low**: Can be addressed in regular maintenance

**What happens when vulnerabilities are detected:**
- High/critical vulnerabilities fail the workflow
- A GitHub issue is automatically created with vulnerability details
- A comment is posted on PRs with remediation instructions
- Audit results are uploaded as workflow artifacts (retained for 30 days)
- Existing open issues are updated rather than creating duplicates

**How to fix:**
1. Review the vulnerability details in the workflow logs or GitHub issue
2. Run `npm audit` locally to see the full report
3. Run `npm audit fix` to automatically fix vulnerabilities where possible
4. For vulnerabilities without automatic fixes:
   - Manually update the affected dependency to a patched version
   - If no patch is available, consider alternative packages
   - Document any accepted risks with justification
5. Verify all tests pass after updates
6. Push the fix to your branch

**Audit results location:**
- Workflow logs: Detailed npm audit output
- Artifacts: `npm-audit-results` (JSON format, 30-day retention)
- GitHub Issues: Automatically created for high/critical findings

### 3. Static Application Security Testing (SAST) with CodeQL

**What it does:**
- Performs deep static analysis of JavaScript code
- Detects security vulnerabilities and code quality issues
- Uses semantic code analysis to understand code behavior

**When it runs:**
- On every pull request
- On every push to the main branch
- Weekly scheduled scan on Mondays at 9:00 AM UTC
- Can be triggered manually via workflow dispatch

**Security issues detected:**
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Command injection
- Path traversal
- Insecure randomness
- Hardcoded credentials
- Unsafe deserialization
- And many more (see CodeQL security queries)

**Query sets used:**
- `security-extended`: Comprehensive security analysis
- Custom queries: BMAD-specific security patterns (see `.github/codeql/codeql-config.yml`)

**What happens when issues are detected:**
- Security findings appear in the Security > Code scanning alerts tab
- High-severity findings fail the workflow
- A comment is posted on PRs with a link to detailed findings
- Alerts are tracked and can be dismissed with justification

**How to fix:**
1. Navigate to Security > Code scanning alerts in the GitHub repository
2. Review the detailed finding with code location and data flow
3. Click on the alert to see the full explanation and remediation guidance
4. Fix the security issue in your code
5. Push the fix to your branch
6. The alert will automatically close when the fix is merged

**Configuration:** See `.github/codeql/codeql-config.yml` for custom queries and settings

### 4. Dependabot Automated Updates

**What it does:**
- Automatically creates pull requests for dependency updates
- Prioritizes security updates over feature updates
- Groups patch updates for easier review

**Update schedule:**
- Security updates: Immediate (as vulnerabilities are discovered)
- Patch updates: Weekly on Mondays (grouped into single PR)
- Minor updates: Weekly on Mondays (separate PRs)
- Major updates: Weekly on Mondays (separate PRs)

**What to review:**
- Release notes and changelog links (included in PR description)
- Test results from CI pipeline
- Breaking changes (for major updates)
- Security advisory details (for security updates)

**Configuration:** See `.github/dependabot.yml` for update settings

## Secret Rotation Policy

### When to Rotate Secrets

Secrets must be rotated immediately in the following situations:

1. **Confirmed Exposure**
   - Secret detected by TruffleHog or other scanning tools
   - Secret accidentally committed to version control
   - Secret shared in public channels (Slack, Discord, email, etc.)
   - Secret visible in logs, screenshots, or documentation

2. **Suspected Compromise**
   - Unauthorized access detected
   - Unusual activity patterns
   - Team member with access leaves the organization
   - Third-party service breach affecting stored secrets

3. **Scheduled Rotation**
   - Production secrets: Every 90 days
   - Staging secrets: Every 180 days
   - Development secrets: Annually or as needed
   - Service account tokens: Every 90 days

### How to Rotate Secrets

#### GitHub Secrets

1. Generate a new secret value
2. Update the secret in GitHub Settings > Secrets and variables > Actions
3. Test the new secret in a non-production environment
4. Deploy to production
5. Invalidate the old secret
6. Document the rotation in the security log

#### Discord Webhooks

1. Create a new webhook in Discord server settings
2. Update the `DISCORD_WEBHOOK` secret in GitHub
3. Test the new webhook with a test notification
4. Delete the old webhook from Discord
5. Verify notifications are working correctly

#### API Keys and Tokens

1. Generate a new key/token from the service provider
2. Update the secret in GitHub Secrets
3. Update any local development environments
4. Test the new key/token
5. Revoke the old key/token from the service provider
6. Notify team members of the rotation

### Secret Storage Best Practices

- **Never commit secrets to version control**
- Use GitHub Secrets for CI/CD workflows
- Use environment variables for local development
- Use `.env` files (added to `.gitignore`) for local secrets
- Use secret management services (AWS Secrets Manager, HashiCorp Vault) for production
- Limit secret access to only those who need it
- Use separate secrets for different environments (dev, staging, production)
- Enable secret scanning on all repositories
- Regularly audit who has access to secrets

## Security Response Workflow

### Severity Classification

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **Critical** | Actively exploited vulnerability, complete system compromise possible | 24 hours | Remote code execution, authentication bypass |
| **High** | Significant security impact, exploitation likely | 7 days | SQL injection, XSS, privilege escalation |
| **Medium** | Moderate security impact, exploitation possible but limited | 30 days | Information disclosure, CSRF, weak cryptography |
| **Low** | Minor security impact, exploitation unlikely or limited | 90 days | Verbose error messages, missing security headers |

### Response Timeline

#### Phase 1: Triage (Day 1-2)
- Acknowledge receipt of vulnerability report
- Assign severity level
- Assign security team member as owner
- Create private security advisory (if not already created)
- Begin initial investigation

#### Phase 2: Investigation (Day 2-5)
- Reproduce the vulnerability
- Assess impact and affected versions
- Identify root cause
- Determine if vulnerability is already being exploited
- Develop remediation plan

#### Phase 3: Remediation (Day 5-30, depending on severity)
- Develop and test fix
- Create patch for affected versions
- Prepare security advisory
- Coordinate disclosure timeline with reporter
- Review fix with security team

#### Phase 4: Release (Day 30 or earlier for critical issues)
- Release patched version
- Publish security advisory
- Update CHANGELOG.md with security fix details
- Notify users through GitHub release notes
- Credit vulnerability reporter (with permission)

#### Phase 5: Post-Release (Day 30+)
- Monitor for exploitation attempts
- Verify fix effectiveness
- Conduct post-mortem analysis
- Update security processes if needed
- Document lessons learned

### Communication Channels

- **Internal**: GitHub Security Advisories (private until disclosure)
- **Public**: GitHub Security Advisories (public after fix), CHANGELOG.md, release notes
- **Reporter**: Email or GitHub Security Advisory comments
- **Users**: GitHub releases, documentation updates, Discord announcements (for critical issues)

### Incident Response Checklist

When a security incident occurs:

- [ ] Confirm the incident and assess severity
- [ ] Activate incident response team
- [ ] Contain the incident (disable affected features, rotate secrets, etc.)
- [ ] Investigate root cause and impact
- [ ] Notify affected users (if applicable)
- [ ] Implement fix and deploy
- [ ] Verify fix effectiveness
- [ ] Conduct post-incident review
- [ ] Update security documentation
- [ ] Implement preventive measures

## Security Best Practices for Contributors

### Code Security

- Validate all user input
- Use parameterized queries to prevent SQL injection
- Sanitize output to prevent XSS
- Use secure random number generation for security-sensitive operations
- Avoid using `eval()` or similar dynamic code execution
- Keep dependencies up to date
- Follow the principle of least privilege
- Use secure defaults

### Dependency Management

- Review dependency changes in pull requests
- Check for known vulnerabilities before adding new dependencies
- Prefer well-maintained packages with active communities
- Minimize the number of dependencies
- Pin dependency versions in `package-lock.json`
- Regularly update dependencies (automated via Dependabot)

### Secret Management

- Never commit secrets, API keys, tokens, or credentials
- Use environment variables for configuration
- Use GitHub Secrets for CI/CD workflows
- Add sensitive files to `.gitignore`
- Use `.env.example` to document required environment variables
- Rotate secrets regularly

### Code Review

- Review code for security issues during PR review
- Use the security checklist in the PR template
- Question unusual patterns or risky operations
- Verify input validation and output encoding
- Check for proper error handling
- Ensure tests cover security-relevant code paths

## Security Resources

### Internal Documentation

- [Contributing Guide](CONTRIBUTING.md) - Contribution workflow and standards
- [CI/CD Documentation](docs/ci-cd-pipeline.md) - Pipeline architecture and security gates
- [CodeQL Configuration](.github/codeql/codeql-config.yml) - SAST configuration
- [TruffleHog Configuration](.trufflehog.yaml) - Secret detection patterns

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Most critical web application security risks
- [CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices) - Securing npm packages
- [GitHub Security Features](https://docs.github.com/en/code-security) - GitHub security tools and features
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/) - Securing Node.js applications

## Security Contacts

- **Security Email**: security@bmad-method.dev
- **GitHub Security Advisories**: [Report a vulnerability](https://github.com/bmad-code-org/BMAD-METHOD/security/advisories)
- **Maintainers**: See [CODEOWNERS](.github/CODEOWNERS) for security-sensitive areas

---

**Last Updated**: 2024-01-15  
**Version**: 1.0.0

Thank you for helping keep BMAD Method secure!
