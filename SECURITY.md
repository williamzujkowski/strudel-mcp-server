# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue.** Security vulnerabilities should not be disclosed publicly until a fix is available.

2. **Use GitHub Security Advisories:** Navigate to the [Security tab](https://github.com/williamzujkowski/strudel-mcp-server/security/advisories/new) and create a new private security advisory.

3. **Alternatively, email:** Contact the maintainer directly through their GitHub profile.

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix release:** Depends on severity, typically within 2 weeks for critical issues

## Scope

This security policy covers:
- The `@williamzujkowski/strudel-mcp-server` npm package
- The MCP server implementation
- Any browser automation components

Out of scope:
- Strudel.cc itself (report to the Strudel project)
- Third-party dependencies (report to the respective maintainers)

## Supply-Chain Verification

Every release ships with three independent supply-chain artifacts so consumers can verify what they are installing.

### 1. npm publish provenance (registry-side)

The npm registry verifies each release came from this repo's CI via OIDC-trusted publishing. Check it from the command line:

```bash
# Install a specific version
npm install @williamzujkowski/strudel-mcp-server@<version>

# Verify signatures and attestations on the installed package
npm audit signatures
```

If the package was published without provenance, `npm audit signatures` will report it. Trust should match the output.

### 2. GitHub build provenance (CI-side)

Every release attaches a SLSA build provenance attestation to the published tarball (generated via `actions/attest-build-provenance`). Verify it with the GitHub CLI:

```bash
# Download the tarball from the GitHub release page
gh release download <tag> --repo williamzujkowski/strudel-mcp-server \
  --pattern "*.tgz"

# Verify the attestation
gh attestation verify williamzujkowski-strudel-mcp-server-<version>.tgz \
  --owner williamzujkowski
```

A valid attestation proves the tarball was built in this repository's GitHub Actions CI, from the commit referenced in the provenance.

### 3. Software Bill of Materials (SBOM)

Two SBOMs are attached to each release — SPDX (industry standard) and CycloneDX (common tooling). Use whichever your supply-chain tooling prefers:

```bash
gh release download <tag> --repo williamzujkowski/strudel-mcp-server \
  --pattern "sbom.*.json"

# Scan with e.g. Grype
grype sbom:./sbom.cdx.json
```

The SBOM lists every direct and transitive dependency of the published build.

### Mismatch or unexpected output?

If any of the three checks fails — provenance missing, attestation mismatch, SBOM listing an unexpected dependency — open a security advisory per the instructions above. Do not install the package.
