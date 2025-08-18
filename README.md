# 🚀 Template Repository Generator

> AI-powered template repository generator with Claude CLI integration and williamzujkowski/standards compliance

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![Standards](https://img.shields.io/badge/standards-williamzujkowski-green.svg)](https://github.com/williamzujkowski/standards)
[![NIST Compliant](https://img.shields.io/badge/NIST-800--53r5-purple.svg)]()
[![License](https://img.shields.io/badge/license-MIT-orange.svg)]()

## 📋 Overview

This template repository provides a complete, production-ready foundation for new projects with:
- 🤖 Claude AI integration for intelligent code generation
- 📚 Automatic compliance with williamzujkowski/standards
- 🛡️ NIST 800-53r5 security controls built-in
- 🧪 Comprehensive testing infrastructure
- 📊 Full observability and monitoring
- 🚀 CI/CD pipelines ready to go

## ⚡ Quick Start

### Interactive Mode (Recommended for First Time)
```bash
# Clone this template repository
git clone https://github.com/yourusername/template-generator.git
cd template-generator

# Run interactive setup - it will guide you through all options
./setup.sh
```

The interactive mode will guide you through:
1. Choosing a project name
2. Selecting project type (web, api, cli, library, microservice)
3. Picking a language (typescript, python, go, rust, java)
4. Selecting an appropriate framework

### Command Line Mode (For Quick Generation)
```bash
# Basic syntax
./setup.sh <project-name> <project-type> <language> <framework>

# Examples
./setup.sh my-api api typescript express
./setup.sh my-web web typescript react
./setup.sh my-cli cli python click
```

### Using Make Commands
```bash
make web PROJECT_NAME=my-app           # React web app
make api PROJECT_NAME=my-service       # Express API
make microservice PROJECT_NAME=my-ms   # Go microservice
make cli PROJECT_NAME=my-tool          # TypeScript CLI
```

## 📦 Complete List of Project Templates

### 🌐 **Web Applications**

#### TypeScript/JavaScript
```bash
./setup.sh my-web web typescript react        # React SPA
./setup.sh my-web web typescript nextjs       # Next.js Full-stack
./setup.sh my-web web typescript vue          # Vue.js Application
./setup.sh my-web web typescript angular      # Angular Application
./setup.sh my-web web typescript svelte       # Svelte Application
./setup.sh my-web web typescript remix        # Remix Full-stack
```

#### Python
```bash
./setup.sh my-web web python django           # Django Full-stack
./setup.sh my-web web python flask            # Flask Web App
./setup.sh my-web web python fastapi          # FastAPI + Frontend
```

### 🔌 **API Services**

#### TypeScript/JavaScript
```bash
./setup.sh my-api api typescript express      # Express REST API
./setup.sh my-api api typescript nestjs       # NestJS Enterprise API
./setup.sh my-api api typescript fastify      # Fastify High-performance API
./setup.sh my-api api typescript koa          # Koa Minimalist API
./setup.sh my-api api typescript graphql      # GraphQL API (Apollo)
./setup.sh my-api api typescript trpc         # tRPC Type-safe API
```

#### Python
```bash
./setup.sh my-api api python fastapi          # FastAPI Modern API
./setup.sh my-api api python django           # Django REST Framework
./setup.sh my-api api python flask            # Flask REST API
./setup.sh my-api api python tornado          # Tornado Async API
./setup.sh my-api api python aiohttp          # AIOHTTP Async API
```

#### Go
```bash
./setup.sh my-api api go gin                  # Gin HTTP Framework
./setup.sh my-api api go echo                 # Echo Framework
./setup.sh my-api api go fiber                # Fiber Express-like
./setup.sh my-api api go chi                  # Chi Lightweight Router
./setup.sh my-api api go gorilla              # Gorilla Mux
```

#### Rust
```bash
./setup.sh my-api api rust actix              # Actix Web
./setup.sh my-api api rust rocket             # Rocket Framework
./setup.sh my-api api rust warp               # Warp Filter-based
./setup.sh my-api api rust axum               # Axum (Tokio-based)
```

#### Java
```bash
./setup.sh my-api api java spring             # Spring Boot
./setup.sh my-api api java quarkus            # Quarkus Native
./setup.sh my-api api java micronaut          # Micronaut Microservices
./setup.sh my-api api java dropwizard         # Dropwizard REST
```

### 🎮 **CLI Tools**

#### TypeScript/JavaScript
```bash
./setup.sh my-cli cli typescript commander    # Commander.js CLI
./setup.sh my-cli cli typescript oclif        # OCLIF Framework
./setup.sh my-cli cli typescript yargs        # Yargs CLI
./setup.sh my-cli cli typescript inquirer     # Interactive CLI
```

#### Python
```bash
./setup.sh my-cli cli python click            # Click CLI
./setup.sh my-cli cli python typer            # Typer Modern CLI
./setup.sh my-cli cli python argparse         # Argparse Built-in
./setup.sh my-cli cli python fire             # Fire Auto-CLI
```

#### Go
```bash
./setup.sh my-cli cli go cobra                # Cobra CLI Framework
./setup.sh my-cli cli go urfave               # Urfave CLI
./setup.sh my-cli cli go kingpin              # Kingpin CLI
```

#### Rust
```bash
./setup.sh my-cli cli rust clap               # Clap CLI Framework
./setup.sh my-cli cli rust structopt          # StructOpt Derive-based
```

### 📚 **Libraries/Packages**

#### TypeScript/JavaScript
```bash
./setup.sh my-lib library typescript npm      # NPM Package
./setup.sh my-lib library typescript esm      # ES Modules Library
./setup.sh my-lib library typescript umd      # Universal Module
```

#### Python
```bash
./setup.sh my-lib library python pypi         # PyPI Package
./setup.sh my-lib library python conda        # Conda Package
./setup.sh my-lib library python poetry       # Poetry Package
```

#### Go
```bash
./setup.sh my-lib library go module           # Go Module
```

#### Rust
```bash
./setup.sh my-lib library rust crate          # Rust Crate
```

#### Java
```bash
./setup.sh my-lib library java maven          # Maven Package
./setup.sh my-lib library java gradle         # Gradle Package
```

### 🔄 **Microservices**

#### TypeScript/JavaScript
```bash
./setup.sh my-service microservice typescript express    # Express Microservice
./setup.sh my-service microservice typescript nestjs     # NestJS Microservice
./setup.sh my-service microservice typescript moleculer  # Moleculer Framework
```

#### Python
```bash
./setup.sh my-service microservice python fastapi        # FastAPI Microservice
./setup.sh my-service microservice python nameko        # Nameko Microservice
./setup.sh my-service microservice python aiohttp       # AIOHTTP Async Service
```

#### Go
```bash
./setup.sh my-service microservice go gin               # Gin Microservice
./setup.sh my-service microservice go micro             # Go Micro Framework
./setup.sh my-service microservice go kit               # Go Kit Microservice
```

#### Java
```bash
./setup.sh my-service microservice java spring          # Spring Cloud
./setup.sh my-service microservice java quarkus         # Quarkus Native
./setup.sh my-service microservice java micronaut       # Micronaut
```

## 🎯 **Real-World Project Examples**

### E-commerce Platform
```bash
# Complete e-commerce microservices architecture
./setup.sh ecommerce-frontend web typescript nextjs
./setup.sh ecommerce-api api typescript nestjs
./setup.sh payment-service microservice go gin
./setup.sh inventory-service microservice python fastapi
./setup.sh notification-service microservice typescript express
```

### SaaS Application
```bash
# Modern SaaS stack
./setup.sh saas-app web typescript react
./setup.sh saas-backend api python django
./setup.sh auth-service microservice typescript express
./setup.sh billing-service microservice java spring
./setup.sh analytics-service microservice python fastapi
```

### Developer Tools Suite
```bash
# CLI tool with SDK and API
./setup.sh devtool-cli cli go cobra
./setup.sh devtool-sdk library typescript npm
./setup.sh devtool-api api rust actix
./setup.sh devtool-docs web typescript docusaurus
```

### Data Pipeline
```bash
# Data processing pipeline
./setup.sh data-ingestion cli python click
./setup.sh data-processor microservice python fastapi
./setup.sh data-api api go gin
./setup.sh data-dashboard web typescript react
```

### Mobile Backend
```bash
# Mobile app backend services
./setup.sh mobile-api api typescript nestjs
./setup.sh push-service microservice go gin
./setup.sh sync-service microservice python fastapi
./setup.sh media-service microservice typescript express
```

## 📊 **Special Configurations**

### GraphQL APIs
```bash
./setup.sh graphql-api api typescript graphql   # Apollo GraphQL
./setup.sh graphql-api api python graphene      # Python GraphQL
./setup.sh graphql-api api go gqlgen           # Go GraphQL
```

### Real-time Applications
```bash
./setup.sh realtime-app web typescript nextjs
./setup.sh websocket-api api typescript socketio
./setup.sh pubsub-service microservice go centrifugo
```

### Serverless Functions
```bash
./setup.sh function api typescript vercel
./setup.sh function api python lambda
./setup.sh function api go netlify
```

### Machine Learning Services
```bash
./setup.sh ml-api api python fastapi
./setup.sh ml-service microservice python ray
./setup.sh ml-pipeline cli python kubeflow
```

### Blockchain/Web3
```bash
./setup.sh dapp web typescript react
./setup.sh blockchain-api api typescript hardhat
./setup.sh smart-contract library solidity truffle
```

## 💡 **Pro Tips**

### Default Frameworks
If you don't specify a framework, sensible defaults are used:
```bash
./setup.sh my-project api typescript    # Defaults to express
./setup.sh my-project api python        # Defaults to fastapi
./setup.sh my-project api go           # Defaults to gin
./setup.sh my-project web typescript    # Defaults to react
```

### Batch Creation for Microservices
Create an entire microservices ecosystem:
```bash
for service in auth user product order payment notification; do
  ./setup.sh $service-service microservice go gin
done
```

### Environment Variables
Set your Claude API key for AI-powered features:
```bash
export ANTHROPIC_API_KEY='your-claude-api-key-here'
```

## 📁 **What Gets Generated**

Every generated project includes:
```
my-project/
├── CLAUDE.md                # Customized AI interface for your stack
├── .claude/                 # Claude CLI configuration
├── .github/workflows/       # Complete CI/CD pipelines
├── src/                     # Source code with boilerplate
├── tests/                   # Test suite with examples
├── docs/                    # Auto-generated documentation
├── scripts/                 # Utility and deployment scripts
├── config/                  # Environment configurations
├── infrastructure/          # IaC (Terraform, K8s manifests)
├── Dockerfile              # Multi-stage, secure Docker build
├── docker-compose.yml      # Local development environment
└── README.md               # Complete project documentation
```

### Features Included
- ✅ **Complete source code structure** for your chosen stack
- ✅ **CLAUDE.md** customized for your specific technologies
- ✅ **Docker configuration** with security best practices
- ✅ **CI/CD pipelines** (GitHub Actions, GitLab CI)
- ✅ **Testing setup** with 80%+ coverage target
- ✅ **Security controls** (NIST 800-53r5 compliant)
- ✅ **Documentation** auto-generated for your APIs
- ✅ **Git repository** initialized with proper .gitignore
- ✅ **Monitoring** setup (Prometheus, Grafana)
- ✅ **Logging** configuration (structured JSON)

## 🛠️ **Installation & Setup**

### Prerequisites
- Node.js 18+ installed
- Git installed
- Bash shell available
- (Optional) Claude API key for AI features

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/template-generator.git
cd template-generator

# Make scripts executable (if needed)
chmod +x setup.sh init-project.sh scripts/*.sh

# Set Claude API key (optional but recommended)
export ANTHROPIC_API_KEY='your-api-key-here'

# Validate installation
./scripts/validate-template.sh
```

## 📚 **Documentation**

- [Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [CLAUDE.md](CLAUDE.md) - AI development interface documentation
- [PROJECT_INIT.md](PROJECT_INIT.md) - Universal project initialization prompt
- [Standards](https://github.com/williamzujkowski/standards) - Standards repository
- [Claude CLI Docs](https://docs.anthropic.com) - Claude documentation

## 🤝 **Contributing**

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
# Fork and clone
git clone https://github.com/yourusername/template-generator.git
cd template-generator

# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
./setup.sh test-project api typescript express

# Submit PR
git push origin feature/your-feature
```

## 🐛 **Troubleshooting**

### Common Issues

**Permission denied when running scripts**
```bash
chmod +x setup.sh init-project.sh scripts/*.sh
```

**Claude API key not working**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
echo $ANTHROPIC_API_KEY  # Verify it's set
```

**Standards not loading**
```bash
# Manually clone standards
git clone https://github.com/williamzujkowski/standards.git ~/.standards
```

## 📈 **Roadmap**

- [ ] Web UI for project generation
- [ ] VSCode extension integration
- [ ] More language templates (C#, Kotlin, Swift)
- [ ] Cloud deployment wizards (AWS, GCP, Azure)
- [ ] Template marketplace
- [ ] Team collaboration features
- [ ] AI-powered code optimization
- [ ] Automatic dependency updates

## 📝 **License**

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- [williamzujkowski/standards](https://github.com/williamzujkowski/standards) for comprehensive development standards
- [Anthropic](https://anthropic.com) for Claude AI
- The open-source community for amazing frameworks and tools

---

**Built with ❤️ by developers, for developers**

*Making project initialization intelligent, secure, and standards-compliant*