# Publishing to npm

## ⚠️ Security First

**IMPORTANT**: Never share npm tokens in chat, commits, or public forums. If a token is exposed, revoke it immediately at https://www.npmjs.com/settings/~/tokens

## Publishing Steps

### 1. Set up npm authentication

```bash
# Login to npm (interactive)
npm login

# OR set token directly (more secure for CI/CD)
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN
```

### 2. Verify package configuration

```bash
# Check what will be published
npm pack --dry-run

# Verify package.json is correct
npm run build
```

### 3. Publish the package

```bash
# For first-time publishing
npm publish --access public

# For updates (after incrementing version)
npm version patch  # or minor/major
npm publish
```

### 4. Verify publication

```bash
# Check on npm
npm view @williamzujkowski/strudel-mcp-server

# Test installation
npm install -g @williamzujkowski/strudel-mcp-server
```

## Automated Publishing (GitHub Actions)

For secure automated publishing, add your npm token as a GitHub secret:

1. Go to Settings → Secrets → Actions
2. Add `NPM_TOKEN` with your token value
3. Use the publish workflow in `.github/workflows/publish.yml`

## Version Management

```bash
# Patch version (1.0.0 → 1.0.1)
npm version patch

# Minor version (1.0.0 → 1.1.0)
npm version minor

# Major version (1.0.0 → 2.0.0)
npm version major

# With commit message
npm version patch -m "Release v%s - Bug fixes"
```

## Pre-publish Checklist

- [ ] All tests pass
- [ ] Documentation is up to date
- [ ] Version number is incremented
- [ ] CHANGELOG is updated
- [ ] Build completes successfully
- [ ] Package contents verified with `npm pack --dry-run`