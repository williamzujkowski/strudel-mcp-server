# CLAUDE.md - AI Development Interface
> 🚀 **Version 2.0** | Optimized for Claude CLI & claude-swarm | Token-efficient | NIST 800-53r5 Compliant

## 📋 Quick Start

```bash
# Initialize project with Claude CLI
claude init

# Set up claude-swarm for parallel processing
claude-swarm setup --project-type={type} --standards=@williamzujkowski/standards

# Load this context
@load [CLAUDE.md + PROJECT_CONTEXT]
```

## 🎯 Primary Directives

You are an expert software architect implementing @williamzujkowski/standards. When working on this project:

1. **ALWAYS** follow the battle-tested standards from the standards repository
2. **IMPLEMENT** NIST 800-53r5 security controls with @nist annotations
3. **OPTIMIZE** for token efficiency (90% reduction target)
4. **GENERATE** comprehensive but concise code with proper error handling
5. **DOCUMENT** with Knowledge Management Standards patterns
6. **TEST** according to Testing Standards (80%+ coverage minimum)

## 🏗️ Project Context

### Project Information
```yaml
project_name: {PROJECT_NAME}
project_type: {PROJECT_TYPE}  # web|api|cli|library|microservice|data-pipeline
language: {PRIMARY_LANGUAGE}
framework: {FRAMEWORK}
deployment_target: {DEPLOYMENT}  # aws|gcp|azure|kubernetes|docker
compliance_requirements: [NIST, SOC2, GDPR]  # as applicable
```

### Repository Structure
```
.
├── .claude/                    # Claude CLI configuration
│   ├── context.md             # Project-specific context
│   ├── prompts/               # Custom prompts
│   └── workflows/             # Claude-swarm workflows
├── .github/                   # GitHub Actions
│   └── workflows/
│       ├── claude-review.yml  # AI code review
│       └── nist-compliance.yml
├── src/                       # Source code
├── tests/                     # Test suite
├── docs/                      # Documentation
├── scripts/                   # Automation scripts
└── CLAUDE.md                  # This file
```

## 🔧 Claude CLI Configuration

### .claude/config.yaml
```yaml
version: "1.0"
model: claude-3-opus-20240229
temperature: 0.7
max_tokens: 4096

context:
  - CLAUDE.md
  - .claude/context.md
  - src/**/*.{ext}

standards:
  repository: https://github.com/williamzujkowski/standards
  autoload:
    - UNIFIED_STANDARDS.md
    - CODING_STANDARDS.md
    - TESTING_STANDARDS.md
    - MODERN_SECURITY_STANDARDS.md

workflows:
  code_review:
    trigger: [pre-commit, pull_request]
    standards: [CS, TS, SEC]
    
  generate_tests:
    coverage_target: 80
    framework: {TEST_FRAMEWORK}
    
  security_audit:
    nist_controls: true
    vulnerability_scan: true
```

## 🤖 Advanced Claude-Swarm Patterns

### Parallel Task Execution
```bash
# Split complex tasks across multiple Claude instances
claude-swarm execute --task="refactor" \
  --parallel=4 \
  --strategy="divide-by-module" \
  --standards="CS:solid + TS:unit"
```

### Intelligent Code Generation
```typescript
// @claude-generate: service
// @standards: [CS:api, SEC:auth, TS:integration]
// @nist: [AC-2, AC-3, AU-2]
interface ServiceRequirements {
  authentication: 'jwt' | 'oauth2';
  rateLimit: number;
  caching: boolean;
  monitoring: 'prometheus' | 'datadog';
}
```

### Automated Refactoring Workflow
```yaml
# .claude/workflows/refactor.yaml
name: intelligent-refactor
trigger: manual
steps:
  - analyze:
      standards: [CS:solid, CS:patterns]
      identify: [code-smells, violations]
  
  - plan:
      strategy: incremental
      risk-assessment: true
      
  - execute:
      parallel: true
      test-driven: true
      rollback-on-failure: true
      
  - validate:
      tests: all
      coverage: maintain
      performance: benchmark
```

## 📚 Standards Loading System

### Token-Optimized Loading
```python
# Load only what you need - 90% token reduction
@load [CS:python + TS:pytest + SEC:auth]

# Natural language loading
"Building a REST API with authentication"
→ Loads: CS:api + SEC:auth + TS:integration

# Micro-standard loading (500 tokens each)
@micro [CS-api + SEC-jwt + TS-unit]
```

### Dynamic Context Switching
```javascript
// @context: frontend
// Loads: FE:react, WD:components, TS:unit

// @context: backend  
// Loads: CS:api, SEC:*, TS:integration

// @context: data
// Loads: DE:pipeline, DE:quality, TS:data
```

## 🛡️ Security & Compliance Integration

### NIST Control Annotations
```python
# @nist: AC-2 (Account Management)
# @nist: AC-3 (Access Enforcement)
# @severity: high
class UserAuthenticationService:
    """Handles user authentication with NIST compliance."""
    
    def authenticate(self, credentials: Credentials) -> AuthToken:
        # @nist: IA-2 (Identification and Authentication)
        # Implementation with security controls
        pass
```

### Automated Compliance Checking
```bash
# Pre-commit hook
claude check-compliance --standards="SEC:*" --nist-required

# CI/CD integration
claude generate-ssp --format=oscal --output=compliance/
```

## 🧪 Testing Strategies

### Test Generation
```bash
# Generate comprehensive test suite
claude generate-tests \
  --coverage=90 \
  --types="unit,integration,e2e" \
  --framework={TEST_FRAMEWORK} \
  --standards="TS:*"
```

### Continuous Testing
```yaml
# .claude/workflows/test.yaml
continuous_testing:
  on_file_change: true
  strategies:
    - mutation_testing
    - property_based
    - fuzzing
    - contract_testing
  reporting:
    - coverage_trends
    - performance_regression
    - security_vulnerabilities
```

## 📊 Observability & Monitoring

### Integrated Observability
```typescript
// @claude-instrument: full
// @standards: [OBS:tracing, OBS:metrics, OBS:logging]
class CriticalService {
  // Automatic instrumentation added by Claude
  // - Distributed tracing (OpenTelemetry)
  // - Metrics collection (Prometheus)
  // - Structured logging (JSON)
}
```

## 🚀 Deployment Patterns

### Progressive Deployment
```yaml
# .claude/deployment.yaml
strategy: progressive
stages:
  - canary:
      percentage: 5
      duration: 1h
      rollback_on_error: true
      
  - blue_green:
      traffic_split: 50
      monitoring_period: 2h
      
  - full_rollout:
      approval_required: true
```

## 💡 Advanced Techniques

### 1. Self-Healing Code
```python
# @claude-feature: self-healing
# @monitor: performance, errors
# @auto-fix: true
class ResilientService:
    """Service with automatic error recovery and optimization."""
    pass
```

### 2. Intelligent Caching
```javascript
// @claude-optimize: caching
// @strategy: predictive
// Analyzes usage patterns and pre-caches likely requests
```

### 3. Adaptive Rate Limiting
```go
// @claude-feature: adaptive-rate-limit
// @learn-from: traffic-patterns
// Dynamically adjusts limits based on usage patterns
```

### 4. Code Evolution Tracking
```yaml
# Track how code evolves with standards
evolution:
  track_metrics:
    - complexity
    - maintainability
    - security_score
    - performance
  alert_on_regression: true
  suggest_improvements: weekly
```

## 🔄 Continuous Improvement

### Weekly Analysis
```bash
# Generate improvement recommendations
claude analyze --depth=full --suggest-refactors --estimate-impact
```

### Standards Synchronization
```bash
# Keep standards up-to-date
claude sync-standards --repo=williamzujkowski/standards --auto-update
```

## 📝 Custom Prompts Library

### Code Review Prompt
```markdown
@prompt: code-review
Review this code against:
- williamzujkowski/standards (CS, TS, SEC)
- SOLID principles
- NIST controls if security-related
- Performance implications
- Suggest specific improvements with examples
```

### Architecture Decision
```markdown
@prompt: architecture-decision
Evaluate architectural options considering:
- Scalability (10x growth)
- Maintainability (5-year horizon)
- Cost optimization
- Security posture
- Team expertise
Provide decision matrix and recommendation
```

## 🎯 Project-Specific Instructions

### Development Workflow
1. **Before coding**: Load relevant standards context
2. **During coding**: Use inline @claude annotations for guidance
3. **After coding**: Run claude review for instant feedback
4. **Before commit**: Execute compliance checks
5. **In PR**: Automated Claude review provides suggestions

### Quality Gates
- [ ] Code coverage ≥ 80%
- [ ] No critical security vulnerabilities
- [ ] NIST controls documented where applicable
- [ ] Performance benchmarks pass
- [ ] Documentation complete
- [ ] Standards compliance validated

## 🔗 Integration Points

### IDE Integration
```json
// .vscode/settings.json
{
  "claude.autoComplete": true,
  "claude.realTimeStandardsCheck": true,
  "claude.nistControlSuggestions": true,
  "claude.contextFile": "CLAUDE.md"
}
```

### Git Hooks
```bash
# .git/hooks/pre-commit
claude validate --standards --tests --security
```

### CI/CD Pipeline
```yaml
# GitHub Actions integration
- name: Claude Analysis
  uses: anthropic/claude-action@v2
  with:
    command: full-analysis
    standards: williamzujkowski/standards
    fail-on-violation: true
```

## 🚨 Error Recovery

### Automatic Error Handling
```python
# @claude-recovery: automatic
# @fallback: graceful-degradation
# @alert: ops-team
```

### Rollback Strategies
```yaml
rollback:
  automatic: true
  conditions:
    - error_rate > 1%
    - latency_p99 > 2s
    - memory_usage > 90%
  preserve_data: true
```

## 📊 Metrics & Reporting

### Key Metrics Tracked
- **Code Quality**: Complexity, duplication, test coverage
- **Security**: Vulnerability count, NIST compliance %
- **Performance**: Response times, resource usage
- **Development**: Velocity, bug rate, MTTR

### Automated Reports
```bash
# Weekly digest
claude report --type=weekly --include="metrics,violations,suggestions"

# Compliance report
claude report --type=compliance --format=pdf --nist --soc2
```

## 🔍 Troubleshooting

### Common Issues & Solutions
```yaml
issues:
  token_limit_exceeded:
    solution: Use @micro loading or split context
    
  standards_conflict:
    solution: Check STANDARDS_GRAPH.md for precedence
    
  performance_degradation:
    solution: Run 'claude profile --suggest-optimizations'
    
  test_failures:
    solution: Use 'claude debug-test --interactive'
```

## 📚 Additional Resources

- **Standards Repository**: https://github.com/williamzujkowski/standards
- **Claude CLI Docs**: https://docs.anthropic.com/claude-cli
- **NIST Framework**: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf
- **Community**: Join #claude-dev on Discord

---

## ⚡ Quick Commands Reference

```bash
# Most used commands
claude init                      # Initialize project
claude generate {component}       # Generate code
claude test                      # Run tests
claude review                    # Code review
claude optimize                  # Performance optimization
claude secure                    # Security audit
claude deploy                    # Deploy application
claude monitor                   # Real-time monitoring
```

## 🎓 Learning Path

1. **Beginner**: Start with UNIFIED_STANDARDS.md
2. **Intermediate**: Implement TESTING_STANDARDS.md
3. **Advanced**: Master CLOUD_NATIVE_STANDARDS.md
4. **Expert**: Contribute to standards evolution

---

*Remember: This is a living document. Update project-specific sections as your project evolves. Always prioritize security, maintainability, and user value.*

**Last Updated**: {TIMESTAMP}
**Standards Version**: williamzujkowski/standards@latest
**Claude CLI Version**: 2.0+