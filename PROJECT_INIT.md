# PROJECT_INIT.md - Universal Project Initialization Prompt

> Copy this prompt to Claude CLI to instantly initialize any project with williamzujkowski/standards

## 🚀 The Ultimate Project Kickstart Prompt

```markdown
I need you to act as an expert software architect and create a complete project structure following williamzujkowski/standards. Here are my requirements:

## Project Details
- **Name**: [PROJECT_NAME]
- **Type**: [web|api|cli|library|microservice|data-pipeline|mobile|desktop]
- **Primary Language**: [typescript|python|go|rust|java|csharp]
- **Framework**: [react|nextjs|fastapi|django|express|gin|spring|dotnet]
- **Database**: [postgres|mongodb|redis|dynamodb|firestore|none]
- **Deployment**: [aws|gcp|azure|vercel|netlify|kubernetes|docker]

## Key Features
1. [Feature 1 - e.g., User authentication with OAuth2]
2. [Feature 2 - e.g., Real-time data processing]
3. [Feature 3 - e.g., RESTful API with OpenAPI docs]
4. [Feature 4 - e.g., Admin dashboard]
5. [Feature 5 - e.g., Notification system]

## Requirements
- **Performance**: [e.g., <100ms p95 latency, 10k RPS]
- **Availability**: [e.g., 99.9% uptime]
- **Scalability**: [e.g., Support 1M users]
- **Security**: [NIST 800-53r5 compliant, SOC2, GDPR]
- **Budget**: [e.g., <$1000/month infrastructure]

## Technical Constraints
- Team size: [number]
- Timeline: [weeks/months]
- Existing systems to integrate: [list any]
- Compliance requirements: [any specific regulations]

---

Based on these requirements, please:

1. **GENERATE COMPLETE PROJECT STRUCTURE** following williamzujkowski/standards including:
   - All necessary directories and files
   - Configuration files (package.json, requirements.txt, go.mod, etc.)
   - Docker and docker-compose setup
   - CI/CD pipelines (GitHub Actions)
   - Testing infrastructure
   - Documentation structure

2. **CREATE IMPLEMENTATION PLAN** with:
   - Architecture diagram (Mermaid format)
   - Technology stack justification
   - Development phases and milestones
   - Risk assessment and mitigation strategies

3. **IMPLEMENT CORE BOILERPLATE** including:
   - Main application entry point
   - Router/controller setup
   - Database models and migrations
   - Authentication middleware
   - Error handling
   - Logging configuration
   - Health check endpoints

4. **SET UP TESTING FRAMEWORK** with:
   - Unit test examples
   - Integration test setup
   - E2E test configuration
   - Test data factories
   - Coverage configuration

5. **CONFIGURE SECURITY** with:
   - @nist annotations for all security features
   - Authentication and authorization
   - Input validation
   - Rate limiting
   - CORS configuration
   - Security headers
   - Secrets management

6. **CREATE DOCUMENTATION** including:
   - README.md with setup instructions
   - API documentation
   - Architecture decision records (ADRs)
   - Deployment guide
   - Contributing guidelines

7. **SET UP OBSERVABILITY** with:
   - Structured logging
   - Metrics collection (Prometheus)
   - Distributed tracing
   - Error tracking
   - Performance monitoring
   - Alerting rules

8. **CONFIGURE CLAUDE CLI INTEGRATION** with:
   - .claude/config.yaml
   - Custom workflows for the project
   - Project-specific prompts
   - Standards enforcement rules

9. **IMPLEMENT DEVOPS** including:
   - Infrastructure as Code (Terraform/Pulumi)
   - Kubernetes manifests (if applicable)
   - Auto-scaling configuration
   - Backup strategies
   - Disaster recovery plan

10. **ADD ADVANCED FEATURES**:
    - Self-healing capabilities
    - Feature flags system
    - A/B testing infrastructure
    - Cache layer implementation
    - WebSocket support (if needed)
    - Job queue setup (if needed)

Please ensure all code:
- Follows SOLID principles
- Implements proper error handling
- Includes comprehensive logging
- Has inline documentation
- Uses consistent naming conventions
- Includes type hints/annotations
- Follows the specific language standards from williamzujkowski/standards

For each major component, provide:
- Implementation code
- Unit tests
- Integration tests
- Documentation
- Performance considerations
- Security considerations
- Monitoring approach

Generate everything in a production-ready state with no placeholders or TODOs.
```

## 📊 Project Type Templates

### Web Application
```yaml
focus_areas:
  - Component architecture
  - State management
  - SEO optimization
  - Accessibility (WCAG 2.1)
  - Progressive enhancement
  - Performance budgets
  - Bundle optimization

standards_emphasis:
  - FRONTEND_MOBILE_STANDARDS
  - WEB_DESIGN_UX_STANDARDS
  - SEO_WEB_MARKETING_STANDARDS
```

### API Service
```yaml
focus_areas:
  - RESTful design
  - OpenAPI specification
  - Rate limiting
  - Caching strategies
  - Database optimization
  - API versioning
  - GraphQL (if applicable)

standards_emphasis:
  - CODING_STANDARDS.api
  - MODERN_SECURITY_STANDARDS
  - CLOUD_NATIVE_STANDARDS
```

### Microservice
```yaml
focus_areas:
  - Service mesh integration
  - Circuit breakers
  - Event-driven architecture
  - Service discovery
  - Distributed tracing
  - Saga patterns
  - CQRS/Event Sourcing

standards_emphasis:
  - CLOUD_NATIVE_STANDARDS
  - EVENT_DRIVEN_STANDARDS
  - OBSERVABILITY_STANDARDS
```

### Data Pipeline
```yaml
focus_areas:
  - ETL/ELT processes
  - Data validation
  - Schema evolution
  - Batch vs streaming
  - Data quality monitoring
  - Lineage tracking
  - Cost optimization

standards_emphasis:
  - DATA_ENGINEERING_STANDARDS
  - OBSERVABILITY_STANDARDS
  - COST_OPTIMIZATION_STANDARDS
```

### CLI Tool
```yaml
focus_areas:
  - Command structure
  - Interactive prompts
  - Progress indicators
  - Error messages
  - Configuration management
  - Plugin system
  - Shell completions

standards_emphasis:
  - CODING_STANDARDS.cli
  - TESTING_STANDARDS
  - KNOWLEDGE_MANAGEMENT_STANDARDS
```

## 🎯 Quick Initialization Commands

### Basic Setup
```bash
# Initialize with defaults
claude init --template=@williamzujkowski/standards

# Interactive setup
claude init --interactive

# From this prompt
claude init --prompt=PROJECT_INIT.md
```

### Language-Specific
```bash
# TypeScript/React
claude init --lang=typescript --framework=react --standards=full

# Python/FastAPI
claude init --lang=python --framework=fastapi --standards=full

# Go Microservice
claude init --lang=go --type=microservice --standards=full
```

### Advanced Initialization
```bash
# With all features
claude init \
  --template=advanced \
  --standards=@williamzujkowski/standards \
  --nist=true \
  --testing=comprehensive \
  --monitoring=full \
  --ci-cd=github \
  --documentation=extensive

# With claude-swarm
claude-swarm init \
  --config=claude-swarm.yaml \
  --workers=8 \
  --parallel=true
```

## 🔄 Continuous Initialization

### Auto-update Standards
```yaml
# .claude/auto-update.yaml
standards:
  source: williamzujkowski/standards
  frequency: weekly
  auto_merge: patch
  notify: true
  
features:
  auto_discover: true
  suggest_improvements: true
  benchmark_against_best: true
```

### Progressive Enhancement
```bash
# Start minimal
claude init --minimal

# Add features progressively
claude enhance --add=authentication
claude enhance --add=caching
claude enhance --add=monitoring
claude enhance --add=ci-cd
```

## 🧠 AI-Powered Customization

### Smart Detection
```javascript
// Claude automatically detects and suggests:
- Framework from package.json/requirements.txt
- Language from file extensions
- Deployment target from config files
- Team size from git contributors
- Complexity from codebase analysis
```

### Adaptive Configuration
```yaml
# Claude adapts based on:
project_maturity:
  startup: focus on speed and iteration
  growth: focus on scalability and monitoring
  enterprise: focus on compliance and governance

team_expertise:
  junior: more documentation and examples
  mixed: balanced approach
  senior: advanced patterns and optimizations

timeline_pressure:
  high: MVP with upgrade path
  medium: balanced feature set
  low: comprehensive implementation
```

## 🚦 Validation Checklist

After initialization, verify:

- [ ] All tests pass (`npm test` / `pytest` / `go test`)
- [ ] Linting passes (`npm run lint` / `flake8` / `golint`)
- [ ] Type checking passes (TypeScript/mypy)
- [ ] Security scan clean (`npm audit` / `safety check`)
- [ ] Docker builds successfully
- [ ] CI/CD pipeline runs
- [ ] Documentation generates
- [ ] NIST annotations present
- [ ] Performance benchmarks baseline established
- [ ] Monitoring endpoints responding

## 🔗 Integration Verification

```bash
# Run comprehensive verification
claude verify --all

# Specific checks
claude verify --standards
claude verify --security
claude verify --performance
claude verify --documentation
```

## 📈 Success Metrics

Track these KPIs post-initialization:

1. **Development Velocity**: 2x faster feature delivery
2. **Code Quality**: 90%+ standards compliance
3. **Security Posture**: 0 critical vulnerabilities
4. **Test Coverage**: 80%+ from day 1
5. **Documentation**: 100% API coverage
6. **Performance**: Meets all defined SLAs
7. **Team Satisfaction**: Reduced boilerplate work

## 🆘 Troubleshooting

### Common Issues

```yaml
token_limit:
  problem: "Prompt too large"
  solution: "Use --split-init flag to initialize in stages"

standards_conflict:
  problem: "Conflicting standards"
  solution: "Use --resolve-conflicts=interactive"

missing_dependencies:
  problem: "Required tools not installed"
  solution: "Run claude doctor --fix"

performance_issues:
  problem: "Slow initialization"
  solution: "Use --parallel --cache-standards"
```

## 🎓 Learning Resources

After initialization, explore:

1. Generated `docs/architecture/` for system design
2. `.claude/tutorials/` for feature implementation guides
3. `tests/examples/` for testing patterns
4. `.github/workflows/` for CI/CD patterns
5. `scripts/` for automation examples

---

## 💫 Pro Tips

1. **Start Small**: Initialize core features first, then enhance
2. **Use Swarm**: For large projects, use claude-swarm for parallel setup
3. **Cache Standards**: Run `claude cache-standards` for faster subsequent inits
4. **Template Your Templates**: Save successful configs as custom templates
5. **Monitor Evolution**: Use `claude track-evolution` to see how project grows
6. **Regular Updates**: Schedule weekly `claude update-standards`
7. **Team Training**: Use `claude generate-onboarding` for new team members

---

*Remember: This prompt is a starting point. Customize based on your specific needs while maintaining alignment with williamzujkowski/standards.*