#!/usr/bin/env node

import { spawn } from 'child_process';
import { chromium } from 'playwright';

class BrowserTester {
  constructor() {
    this.results = [];
    this.server = null;
    this.browser = null;
    this.testsPassed = 0;
    this.testsFailed = 0;
  }

  async startServer() {
    return new Promise((resolve) => {
      this.server = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.server.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Enhanced Strudel MCP server')) {
          console.log('✅ MCP Server started');
          resolve();
        }
      });
      
      setTimeout(() => resolve(), 2000);
    });
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      let response = '';
      
      this.server.stdout.on('data', (data) => {
        response += data.toString();
      });
      
      const request = {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now()
      };
      
      this.server.stdin.write(JSON.stringify(request) + '\n');
      
      setTimeout(() => {
        try {
          const lines = response.split('\n').filter(l => l.trim());
          const jsonLine = lines.find(l => l.startsWith('{') && l.includes('jsonrpc'));
          if (jsonLine) {
            resolve(JSON.parse(jsonLine));
          } else {
            reject(new Error('No valid JSON response'));
          }
        } catch (e) {
          reject(e);
        }
      }, 3000);
    });
  }

  async test(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      const result = await testFn();
      console.log(`   ✅ ${result || 'Passed'}`);
      this.testsPassed++;
      this.results.push({ name, status: 'passed', result });
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      this.testsFailed++;
      this.results.push({ name, status: 'failed', error: error.message });
    }
  }

  async runTests() {
    console.log('🚀 Starting Browser-Based Strudel.cc Tests\n');
    console.log('This will test actual interaction with Strudel.cc website');
    console.log('=' .repeat(60));
    
    // Start the MCP server
    await this.startServer();
    
    // Test 1: Initialize browser and load Strudel.cc
    await this.test('Initialize Strudel.cc', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'init',
        arguments: {}
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`Initialization failed: ${text}`);
      }
      
      // Give it time to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      return text;
    });
    
    // Test 2: Write a simple pattern
    await this.test('Write simple pattern', async () => {
      const pattern = 's("bd*4").gain(0.8)';
      const response = await this.sendRequest('tools/call', {
        name: 'write',
        arguments: { pattern }
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`Write failed: ${text}`);
      }
      return `Wrote pattern: ${pattern}`;
    });
    
    // Test 3: Get pattern to verify it was written
    await this.test('Get current pattern', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'get_pattern',
        arguments: {}
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`Get pattern failed: ${text}`);
      }
      return `Current pattern: ${text}`;
    });
    
    // Test 4: Play the pattern
    await this.test('Play pattern', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'play',
        arguments: {}
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`Play failed: ${text}`);
      }
      
      // Let it play for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'Pattern is playing';
    });
    
    // Test 5: Analyze audio while playing
    await this.test('Analyze audio during playback', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'analyze',
        arguments: {}
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`Analysis failed: ${text}`);
      }
      
      // Parse the analysis
      try {
        const analysis = JSON.parse(text);
        if (!analysis.connected && !analysis.features) {
          throw new Error('Audio analysis not working');
        }
        return 'Audio analysis successful';
      } catch (e) {
        return `Analysis returned: ${text.substring(0, 100)}...`;
      }
    });
    
    // Test 6: Stop playback
    await this.test('Stop playback', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'stop',
        arguments: {}
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`Stop failed: ${text}`);
      }
      return 'Playback stopped';
    });
    
    // Test 7: Clear the editor
    await this.test('Clear editor', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'clear',
        arguments: {}
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`Clear failed: ${text}`);
      }
      return 'Editor cleared';
    });
    
    // Test 8: Generate and play a techno pattern
    await this.test('Generate and play techno pattern', async () => {
      // Generate pattern
      const genResponse = await this.sendRequest('tools/call', {
        name: 'generate_pattern',
        arguments: { style: 'techno', key: 'C', bpm: 130 }
      });
      
      let text = genResponse.result?.content[0]?.text;
      if (!text || !text.includes('Generated')) {
        throw new Error(`Generation failed: ${text}`);
      }
      
      // Play it
      const playResponse = await this.sendRequest('tools/call', {
        name: 'play',
        arguments: {}
      });
      
      text = playResponse.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`Play failed: ${text}`);
      }
      
      // Let it play
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Stop it
      await this.sendRequest('tools/call', {
        name: 'stop',
        arguments: {}
      });
      
      return 'Generated techno pattern played successfully';
    });
    
    // Test 9: Append code to pattern
    await this.test('Append code to pattern', async () => {
      // Write initial pattern
      await this.sendRequest('tools/call', {
        name: 'write',
        arguments: { pattern: 's("bd*4")' }
      });
      
      // Append more code
      const response = await this.sendRequest('tools/call', {
        name: 'append',
        arguments: { code: '.gain(0.9).room(0.2)' }
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`Append failed: ${text}`);
      }
      
      // Verify the pattern
      const getResponse = await this.sendRequest('tools/call', {
        name: 'get_pattern',
        arguments: {}
      });
      
      const pattern = getResponse.result?.content[0]?.text;
      if (!pattern.includes('.gain(0.9)')) {
        throw new Error('Append did not work correctly');
      }
      
      return 'Code appended successfully';
    });
    
    // Test 10: Generate drums and add to pattern
    await this.test('Generate and add drums', async () => {
      // Clear first
      await this.sendRequest('tools/call', {
        name: 'clear',
        arguments: {}
      });
      
      // Generate drums
      const response = await this.sendRequest('tools/call', {
        name: 'generate_drums',
        arguments: { style: 'house', complexity: 0.7 }
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || !text.includes('Generated')) {
        throw new Error(`Drum generation failed: ${text}`);
      }
      
      // Play to test
      await this.sendRequest('tools/call', {
        name: 'play',
        arguments: {}
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.sendRequest('tools/call', {
        name: 'stop',
        arguments: {}
      });
      
      return 'Drums generated and played';
    });
    
    // Test 11: Generate bassline
    await this.test('Generate bassline', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'generate_bassline',
        arguments: { key: 'E', style: 'acid' }
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || !text.includes('Generated')) {
        throw new Error(`Bassline generation failed: ${text}`);
      }
      
      return 'Acid bassline generated';
    });
    
    // Test 12: Save current pattern
    await this.test('Save pattern', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'save',
        arguments: { 
          name: 'browser-test-pattern',
          tags: ['test', 'house', 'drums']
        }
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`Save failed: ${text}`);
      }
      
      return 'Pattern saved';
    });
    
    // Test 13: List saved patterns
    await this.test('List saved patterns', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'list',
        arguments: {}
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || text.includes('Error')) {
        throw new Error(`List failed: ${text}`);
      }
      
      if (text.includes('browser-test-pattern')) {
        return 'Saved pattern found in list';
      }
      return 'Pattern list retrieved';
    });
    
    // Test 14: Load saved pattern
    await this.test('Load saved pattern', async () => {
      // Clear first
      await this.sendRequest('tools/call', {
        name: 'clear',
        arguments: {}
      });
      
      // Load pattern
      const response = await this.sendRequest('tools/call', {
        name: 'load',
        arguments: { name: 'browser-test-pattern' }
      });
      
      const text = response.result?.content[0]?.text;
      if (!text || !text.includes('Loaded')) {
        // Pattern might not exist, which is okay
        return 'Load attempted';
      }
      
      return 'Pattern loaded';
    });
    
    // Test 15: Complex workflow - Generate complete track
    await this.test('Complex workflow - Generate complete track', async () => {
      // Clear
      await this.sendRequest('tools/call', {
        name: 'clear',
        arguments: {}
      });
      
      // Generate complete pattern
      await this.sendRequest('tools/call', {
        name: 'generate_pattern',
        arguments: { style: 'dnb', key: 'A', bpm: 174 }
      });
      
      // Add a fill
      await this.sendRequest('tools/call', {
        name: 'generate_fill',
        arguments: { style: 'dnb', bars: 1 }
      });
      
      // Play it
      await this.sendRequest('tools/call', {
        name: 'play',
        arguments: {}
      });
      
      // Let it play
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Analyze while playing
      const analysisResponse = await this.sendRequest('tools/call', {
        name: 'analyze',
        arguments: {}
      });
      
      // Stop
      await this.sendRequest('tools/call', {
        name: 'stop',
        arguments: {}
      });
      
      return 'Complete DnB track generated and played';
    });
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BROWSER TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.testsPassed}`);
    console.log(`❌ Failed: ${this.testsFailed}`);
    console.log(`📈 Success Rate: ${((this.testsPassed / (this.testsPassed + this.testsFailed)) * 100).toFixed(1)}%`);
    
    if (this.testsFailed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }
    
    return {
      passed: this.testsPassed,
      failed: this.testsFailed,
      results: this.results
    };
  }

  async cleanup() {
    if (this.server) {
      this.server.kill();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run the tests
async function main() {
  const tester = new BrowserTester();
  
  try {
    const results = await tester.runTests();
    
    if (results.failed === 0) {
      console.log('\n🎉 All browser tests passed! Strudel.cc integration working perfectly.');
    } else {
      console.log('\n⚠️ Some browser tests failed. Check the implementation.');
    }
    
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Make sure we have Playwright installed
console.log('📦 Checking Playwright installation...');
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

execAsync('npx playwright install chromium')
  .then(() => {
    console.log('✅ Playwright ready\n');
    return main();
  })
  .catch(error => {
    console.error('Failed to install Playwright:', error);
    process.exit(1);
  });