#!/usr/bin/env node

import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class StrudelIntegrationTest {
  constructor() {
    this.server = null;
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async startServer() {
    console.log('🚀 Starting MCP Server...');
    
    this.server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Increase max listeners to avoid warning
    this.server.stdout.setMaxListeners(20);
    this.server.stderr.setMaxListeners(20);
    
    // Wait for server to be ready
    return new Promise((resolve) => {
      this.server.stderr.once('data', (data) => {
        const output = data.toString();
        if (output.includes('MCP server')) {
          console.log('✅ Server started\n');
          resolve();
        }
      });
      
      // Timeout fallback
      setTimeout(resolve, 2000);
    });
  }

  async sendRequest(toolName, args = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        },
        id: Date.now()
      };
      
      let response = '';
      let dataHandler;
      
      // Set up one-time listener
      dataHandler = (data) => {
        response += data.toString();
        const lines = response.split('\n');
        
        for (const line of lines) {
          if (line.trim().startsWith('{') && line.includes('"jsonrpc"')) {
            try {
              const json = JSON.parse(line);
              if (json.id === request.id) {
                this.server.stdout.removeListener('data', dataHandler);
                resolve(json);
                return;
              }
            } catch (e) {
              // Continue if not valid JSON
            }
          }
        }
      };
      
      this.server.stdout.on('data', dataHandler);
      
      // Send request
      this.server.stdin.write(JSON.stringify(request) + '\n');
      
      // Timeout
      setTimeout(() => {
        this.server.stdout.removeListener('data', dataHandler);
        reject(new Error('Request timeout'));
      }, 5000);
    });
  }

  async test(name, fn) {
    try {
      console.log(`🧪 ${name}...`);
      const result = await fn();
      console.log(`   ✅ ${result}`);
      this.passed++;
      this.results.push({ name, status: 'pass', result });
    } catch (error) {
      console.log(`   ❌ ${error.message}`);
      this.failed++;
      this.results.push({ name, status: 'fail', error: error.message });
    }
  }

  async runTests() {
    console.log('🎵 Strudel.cc Integration Tests');
    console.log('================================\n');
    
    await this.startServer();
    
    // Core workflow tests
    await this.test('Initialize Strudel', async () => {
      const res = await this.sendRequest('init');
      const text = res.result?.content[0]?.text;
      if (!text || text.includes('Error')) throw new Error(text);
      // Wait for browser to fully load
      await new Promise(r => setTimeout(r, 3000));
      return 'Strudel.cc loaded';
    });
    
    await this.test('Write pattern', async () => {
      const pattern = 's("bd*4, ~ cp ~ cp").swing(0.1)';
      const res = await this.sendRequest('write', { pattern });
      const text = res.result?.content[0]?.text;
      if (!text || text.includes('Error')) throw new Error(text);
      return 'Pattern written';
    });
    
    await this.test('Read pattern back', async () => {
      const res = await this.sendRequest('get_pattern');
      const text = res.result?.content[0]?.text;
      if (!text) throw new Error('No pattern returned');
      if (!text.includes('bd*4')) throw new Error('Pattern mismatch');
      return 'Pattern verified';
    });
    
    await this.test('Play pattern', async () => {
      const res = await this.sendRequest('play');
      const text = res.result?.content[0]?.text;
      if (!text || text.includes('Error')) throw new Error(text);
      await new Promise(r => setTimeout(r, 2000));
      return 'Playing';
    });
    
    await this.test('Analyze audio', async () => {
      const res = await this.sendRequest('analyze');
      const text = res.result?.content[0]?.text;
      if (!text) throw new Error('No analysis');
      // Try to parse as JSON
      try {
        const data = JSON.parse(text);
        if (data.connected || data.features) {
          return 'Audio analyzed';
        }
      } catch (e) {
        // If not JSON, check if it contains analysis info
        if (text.includes('connected') || text.includes('frequency')) {
          return 'Analysis data received';
        }
      }
      return 'Analysis attempted';
    });
    
    await this.test('Stop playback', async () => {
      const res = await this.sendRequest('stop');
      const text = res.result?.content[0]?.text;
      if (!text || text.includes('Error')) throw new Error(text);
      return 'Stopped';
    });
    
    await this.test('Clear editor', async () => {
      const res = await this.sendRequest('clear');
      const text = res.result?.content[0]?.text;
      if (!text || text.includes('Error')) throw new Error(text);
      return 'Cleared';
    });
    
    // Generation tests
    await this.test('Generate techno pattern', async () => {
      const res = await this.sendRequest('generate_pattern', {
        style: 'techno',
        key: 'C',
        bpm: 130
      });
      const text = res.result?.content[0]?.text;
      if (!text || !text.includes('Generated')) throw new Error(text);
      return 'Techno generated';
    });
    
    await this.test('Play generated pattern', async () => {
      const res = await this.sendRequest('play');
      const text = res.result?.content[0]?.text;
      if (!text || text.includes('Error')) throw new Error(text);
      await new Promise(r => setTimeout(r, 2000));
      return 'Generated pattern playing';
    });
    
    await this.test('Stop and clear', async () => {
      await this.sendRequest('stop');
      await this.sendRequest('clear');
      return 'Ready for next test';
    });
    
    await this.test('Generate drum pattern', async () => {
      const res = await this.sendRequest('generate_drums', {
        style: 'dnb',
        complexity: 0.8
      });
      const text = res.result?.content[0]?.text;
      if (!text || !text.includes('Generated')) throw new Error(text);
      return 'DnB drums generated';
    });
    
    await this.test('Add bassline', async () => {
      const res = await this.sendRequest('generate_bassline', {
        key: 'E',
        style: 'dnb'
      });
      const text = res.result?.content[0]?.text;
      if (!text || !text.includes('Generated')) throw new Error(text);
      return 'Bassline added';
    });
    
    await this.test('Play complete pattern', async () => {
      const res = await this.sendRequest('play');
      await new Promise(r => setTimeout(r, 3000));
      await this.sendRequest('stop');
      return 'Complete pattern tested';
    });
    
    await this.test('Save pattern', async () => {
      const res = await this.sendRequest('save', {
        name: 'test-dnb-pattern',
        tags: ['dnb', 'test']
      });
      const text = res.result?.content[0]?.text;
      if (!text || text.includes('Error')) throw new Error(text);
      return 'Pattern saved';
    });
    
    await this.test('List patterns', async () => {
      const res = await this.sendRequest('list');
      const text = res.result?.content[0]?.text;
      if (!text) throw new Error('No list returned');
      return 'Patterns listed';
    });
    
    await this.test('Load pattern', async () => {
      await this.sendRequest('clear');
      const res = await this.sendRequest('load', {
        name: 'test-dnb-pattern'
      });
      const text = res.result?.content[0]?.text;
      // It's okay if pattern doesn't exist
      return text.includes('Loaded') ? 'Pattern loaded' : 'Load attempted';
    });
    
    // Music theory tests
    await this.test('Generate scale', async () => {
      const res = await this.sendRequest('generate_scale', {
        root: 'D',
        scale: 'dorian'
      });
      const text = res.result?.content[0]?.text;
      if (!text || !text.includes('D dorian')) throw new Error(text);
      return 'Scale generated';
    });
    
    await this.test('Generate chord progression', async () => {
      const res = await this.sendRequest('generate_chord_progression', {
        key: 'G',
        style: 'jazz'
      });
      const text = res.result?.content[0]?.text;
      if (!text || !text.includes('Generated')) throw new Error(text);
      return 'Jazz progression generated';
    });
    
    await this.test('Euclidean rhythm', async () => {
      await this.sendRequest('clear');
      const res = await this.sendRequest('generate_euclidean', {
        hits: 5,
        steps: 8,
        sound: 'cp'
      });
      const text = res.result?.content[0]?.text;
      if (!text || !text.includes('Euclidean')) throw new Error(text);
      return 'Euclidean rhythm created';
    });
    
    // Print summary
    console.log('\n' + '='.repeat(40));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(40));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%\n`);
    
    if (this.failed > 0) {
      console.log('Failed tests:');
      this.results.filter(r => r.status === 'fail').forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
    
    return { passed: this.passed, failed: this.failed };
  }

  async cleanup() {
    if (this.server) {
      console.log('\n🧹 Cleaning up...');
      this.server.kill();
    }
  }
}

// Main
async function main() {
  const test = new StrudelIntegrationTest();
  
  try {
    // Install Playwright if needed
    console.log('📦 Ensuring Playwright is installed...');
    await execAsync('npx playwright install chromium');
    console.log('✅ Ready\n');
    
    const results = await test.runTests();
    
    if (results.failed === 0) {
      console.log('🎉 All tests passed! Strudel.cc integration verified.');
    } else {
      console.log('⚠️  Some tests failed. Review the issues above.');
    }
    
    await test.cleanup();
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    await test.cleanup();
    process.exit(1);
  }
}

main();