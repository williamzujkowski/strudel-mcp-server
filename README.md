# Strudel MCP Server

> MCP server for AI-powered music generation with Strudel.cc

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![MCP](https://img.shields.io/badge/MCP-compatible-green.svg)]()
[![License](https://img.shields.io/badge/license-MIT-orange.svg)]()

A production-ready Model Context Protocol (MCP) server that gives Claude direct control over Strudel.cc for AI-assisted music generation and live coding.

## 🎵 Features

- **Direct Strudel Control**: Initialize and control Strudel.cc through browser automation
- **Pattern Management**: Write, play, stop, and manipulate TidalCycles/Strudel patterns
- **Audio Analysis**: Real-time frequency analysis and audio feature extraction
- **Pattern Storage**: Save and load patterns locally with tagging system
- **MCP Integration**: Seamless integration with Claude CLI

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/williamzujkowski/strudel-mcp-server.git
cd strudel-mcp-server

# Install dependencies
npm install

# Install Chromium for Playwright
npx playwright install chromium

# Build the project
npm run build

# Add to Claude CLI
claude mcp add strudel node /path/to/strudel-mcp-server/dist/index.js

# Start using with Claude
claude chat
```

## 📦 Installation

### Prerequisites

- Node.js 18+ installed
- Claude CLI installed
- Internet connection (for accessing Strudel.cc)

### Step-by-Step Setup

1. **Install dependencies:**
```bash
npm install
npx playwright install chromium
```

2. **Build the server:**
```bash
npm run build
```

3. **Add to Claude CLI:**
```bash
claude mcp add strudel node /path/to/strudel-mcp-server/dist/index.js
```

Replace `/path/to/strudel-mcp-server` with the actual path to your installation.

## 🎹 Usage

### Starting a Session

```bash
claude chat
```

The Strudel MCP server will be available automatically once configured.

### Available Tools

The MCP server provides these tools to Claude:

| Tool | Description | Example |
|------|-------------|---------|
| `init` | Initialize Strudel in browser | "Initialize Strudel" |
| `write` | Write a pattern to the editor | "Write pattern: s('bd*4')" |
| `play` | Start playing the current pattern | "Play the pattern" |
| `stop` | Stop playing | "Stop playing" |
| `analyze` | Get audio analysis of current output | "Analyze the audio" |
| `save` | Save current pattern locally | "Save as 'techno-beat'" |
| `load` | Load a saved pattern | "Load pattern 'techno-beat'" |
| `list` | List saved patterns | "List all patterns" |
| `append` | Append code to current pattern | "Add hi-hats" |
| `clear` | Clear the editor | "Clear the editor" |

### Example Conversations

#### Basic Beat Creation
```
You: Initialize Strudel and create a simple drum pattern

Claude: I'll initialize Strudel and create a drum pattern for you.
[Initializes Strudel]
[Writes pattern: s("bd*4, hh*8").swing(0.1)]
[Starts playing]

You: Add a bass line

Claude: [Appends: note("c2 eb2 g2 bb2").s("sawtooth").cutoff(800)]
```

#### Audio Analysis
```
You: Analyze what's playing

Claude: The audio analysis shows:
- Strong bass presence (180/255)
- Pattern is actively playing
- Peak frequency around 120 Hz (kick drum)
- Balanced brightness
```

## 🏗️ Project Structure

```
strudel-mcp-server/
├── src/
│   ├── index.ts           # Main MCP server
│   ├── StrudelController.ts # Browser automation
│   ├── AudioAnalyzer.ts   # Audio analysis injection
│   └── PatternStore.ts    # Local pattern storage
├── patterns/              # Saved patterns directory
├── config.json           # Configuration
├── package.json
└── tsconfig.json
```

## ⚙️ Configuration

Edit `config.json` to customize:

```json
{
  "headless": false,        // Set to true for headless browser
  "strudel_url": "https://strudel.cc/",
  "patterns_dir": "./patterns",
  "audio_analysis": {
    "fft_size": 2048,
    "smoothing": 0.8
  }
}
```

## 🎨 Pattern Examples

### Minimal Techno
```javascript
stack(
  s("bd*4").gain(0.9),
  s("~ cp ~ cp").room(0.2),
  s("hh*16").gain(0.4).pan(sine.range(-0.5, 0.5))
).swing(0.05)
```

### Ambient Drone
```javascript
note("c2 c3 g3 c4")
  .s("sawtooth")
  .attack(2)
  .decay(1)
  .sustain(0.5)
  .release(4)
  .cutoff(sine.slow(8).range(200, 2000))
  .room(0.8)
  .delay(0.5)
```

### Experimental
```javascript
s("bd cp hh oh")
  .sometimes(x => x.speed(2))
  .rarely(x => x.reverse())
  .jux(rev)
  .iter(4)
  .euclid(choose([3,5,7]), 8)
```

## 🔧 Development

### Running in Development Mode
```bash
npm run dev
```

### Testing the Server
```bash
# Test basic functionality
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js

# Test with Claude CLI
claude chat --mcp strudel << EOF
Initialize Strudel
Write a simple pattern: s("bd*4")
Play it
Analyze the audio
EOF
```

## 🚀 Advanced Features

### Audio Analysis

The server injects an audio analyzer into Strudel's Web Audio graph, providing:
- Frequency band analysis (bass, mid, treble)
- Peak frequency detection
- Spectral centroid (brightness)
- Playing/silence detection
- Real-time audio features

### Pattern Storage

Patterns are saved as JSON with metadata:
- Pattern name
- Content
- Tags for categorization
- Timestamp
- Optional audio features

## 🐛 Troubleshooting

### Browser doesn't open
- Ensure Chromium is installed: `npx playwright install chromium`
- Check `config.json` - set `headless: false` to see the browser

### Audio analysis not working
- The analyzer needs audio to be playing
- Wait a moment after starting playback before analyzing

### Claude can't find the server
- Run `npm run configure-claude` again
- Check `~/.config/claude/mcp.json` for the configuration

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- [Strudel.cc](https://strudel.cc) for the amazing live coding environment
- [Anthropic](https://anthropic.com) for Claude and the MCP protocol
- [Playwright](https://playwright.dev) for browser automation

---

**Built with ❤️ for AI-powered music generation**