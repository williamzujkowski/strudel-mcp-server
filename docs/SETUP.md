# Setup Guide

## Prerequisites

- Node.js 18+ installed
- Git installed
- Bash shell available
- Claude API key (get from https://console.anthropic.com)

## Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/yourusername/template-generator.git
cd template-generator
```

2. Set environment variables:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

3. Run setup:
```bash
./setup.sh
```

## Configuration

Edit `.claude/config.yaml` to customize default settings.

## Troubleshooting

If you encounter permission errors:
```bash
chmod +x setup.sh init-project.sh scripts/*.sh
```

For more help, see the main README or open an issue on GitHub.
