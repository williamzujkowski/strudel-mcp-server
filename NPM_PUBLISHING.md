# npm Publishing Guide

This document explains how to publish the `@williamzujkowski/strudel-mcp-server` package to npm.

## Table of Contents

- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
- [One-Time Setup](#one-time-setup)
- [Publishing Methods](#publishing-methods)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Overview

As of December 2025, npm has revoked all classic tokens and moved to new authentication methods:

1. **OIDC Trusted Publishing** (Recommended) - No tokens required for CI/CD
2. **Granular Access Tokens** - For fallback or manual publishing
3. **Session-Based Auth** - For local development (2-hour expiry)

This package is configured to use OIDC trusted publishing via GitHub Actions, with provenance attestation for supply chain security.

## Authentication Methods

### 1. OIDC Trusted Publishing (Recommended)

OIDC (OpenID Connect) trusted publishing allows GitHub Actions to publish to npm without storing any tokens. npm validates the identity of the GitHub workflow and authorizes the publish.

**Benefits:**
- No tokens to store, rotate, or accidentally expose
- Short-lived, workflow-specific credentials
- Cannot be exfiltrated or reused
- Automatic provenance attestation

**Requirements:**
- npm CLI 11.5.1 or later
- `id-token: write` permission in workflow
- Trusted publisher configured on npmjs.com

### 2. Granular Access Tokens (Fallback)

If OIDC isn't configured, you can use granular access tokens:

```bash
# Create a granular token via CLI
npm token create --publish --cidr-whitelist "0.0.0.0/0"
```

Or create one at: https://www.npmjs.com/settings/~/tokens

**Token Limitations:**
- Write tokens expire after max 90 days
- Must have "Bypass 2FA" enabled for CI/CD use
- Scope to specific packages for security

### 3. Session-Based Auth (Local Development)

For local publishing, use session-based authentication:

```bash
npm login
# Enter your npm credentials
# Creates a 2-hour session token
```

## One-Time Setup

### Step 1: Configure Trusted Publisher on npmjs.com

1. Go to https://www.npmjs.com/package/@williamzujkowski/strudel-mcp-server/access
2. Scroll to "Trusted Publishers" section
3. Click "Add Trusted Publisher"
4. Configure:
   - **Provider**: GitHub Actions
   - **Owner**: `williamzujkowski`
   - **Repository**: `strudel-mcp-server`
   - **Workflow filename**: `publish.yml`
   - **Environment** (optional): `npm-publish`

### Step 2: Create GitHub Environment (Optional)

For additional protection, create a deployment environment:

1. Go to repository Settings > Environments
2. Create environment named `npm-publish`
3. Configure protection rules:
   - Required reviewers (optional)
   - Deployment branches: `main` only

### Step 3: Configure Fallback Token (Optional)

If you want a fallback for OIDC issues:

1. Create granular token on npmjs.com:
   - Read-write access to `@williamzujkowski/strudel-mcp-server`
   - Enable "Bypass 2FA for automation"
   - Set expiration (max 90 days)
2. Add to GitHub Secrets as `NPM_TOKEN`:
   - Go to repository Settings > Secrets and variables > Actions
   - Add new secret: `NPM_TOKEN` = your granular token

## Publishing Methods

### Method 1: Automated Release (Recommended)

Create a GitHub Release to trigger automatic publishing:

```bash
# 1. Ensure you're on main with clean working directory
git checkout main
git pull origin main

# 2. Update version in package.json
npm version patch  # or minor, major

# 3. Push changes and tags
git push && git push --tags

# 4. Create GitHub Release
gh release create v$(node -p "require('./package.json').version") \
  --title "v$(node -p "require('./package.json').version")" \
  --generate-notes
```

The publish workflow triggers automatically on release creation.

### Method 2: Manual Workflow Dispatch

Trigger the workflow manually from GitHub:

1. Go to Actions > "Publish to npm"
2. Click "Run workflow"
3. Select version bump type (patch/minor/major)
4. Click "Run workflow"

### Method 3: Local Publishing

For local publishing (emergency use only):

```bash
# 1. Login to npm (creates 2-hour session)
npm login

# 2. Build and test
npm run build
npm test

# 3. Publish with provenance
npm publish --provenance --access public
```

**Note:** Local publishing requires 2FA confirmation and won't include provenance attestation from a trusted CI environment.

## Version Bump Guidelines

| Change Type | Version | Example | When to Use |
|------------|---------|---------|-------------|
| `patch` | x.x.X | 2.2.1 | Bug fixes, documentation |
| `minor` | x.X.0 | 2.3.0 | New features, backwards compatible |
| `major` | X.0.0 | 3.0.0 | Breaking changes |

## Verifying Publication

After publishing, verify the package:

```bash
# Check npm registry
npm view @williamzujkowski/strudel-mcp-server

# Verify provenance
npm audit signatures

# Check latest version
npm show @williamzujkowski/strudel-mcp-server version
```

## Troubleshooting

### "Not authorized to publish"

1. Ensure trusted publisher is configured on npmjs.com
2. Check workflow filename matches exactly (`publish.yml`)
3. Verify repository owner/name match
4. Ensure `id-token: write` permission is set

### "npm version too old"

The workflow automatically updates npm, but if issues persist:

```yaml
- run: npm install -g npm@latest
```

### "Provenance failed"

Provenance requires:
- Public repository (not private)
- Cloud-hosted GitHub runner (not self-hosted)
- `id-token: write` permission

### "Token expired or invalid"

Classic tokens were revoked December 2025. Create a new granular token:

1. Go to https://www.npmjs.com/settings/~/tokens
2. Generate new granular token with package scope
3. Update `NPM_TOKEN` secret in GitHub

### "2FA required"

For CI/CD publishing:
1. Create granular token with "Bypass 2FA" enabled
2. Or use OIDC trusted publishing (no 2FA needed)

## Security Best Practices

1. **Use OIDC Trusted Publishing** - No tokens to leak
2. **Scope tokens to specific packages** - Never use publish-all tokens
3. **Set token expiration** - Max 90 days for write tokens
4. **Use GitHub Environments** - Require approvals for production
5. **Verify provenance** - Check packages with `npm audit signatures`
6. **Rotate tokens regularly** - Don't wait for expiration
7. **Never commit tokens** - Use GitHub Secrets only

## Workflow File Reference

The publish workflow (`.github/workflows/publish.yml`) includes:

```yaml
permissions:
  contents: write
  id-token: write  # Required for OIDC

jobs:
  publish:
    environment: npm-publish  # Optional protection
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          registry-url: 'https://registry.npmjs.org'

      - run: npm install -g npm@latest  # Ensure npm 11.5.1+
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --provenance --access public
```

## References

- [npm Token Changes Announcement](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/)
- [npm Trusted Publishing with OIDC](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [npm Trusted Publishers Documentation](https://docs.npmjs.com/trusted-publishers/)
- [Generating Provenance Statements](https://docs.npmjs.com/generating-provenance-statements/)
- [GitHub Actions Publishing Guide](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)

---

*Last updated: December 2025*
