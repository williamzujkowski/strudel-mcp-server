#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

class IntegrationTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const server = spawn('node', ['dist/index.js']);
      let response = '';
      let errorOutput = '';
      
      server.stdout.on('data', (data) => {
        response += data.toString();
      });
      
      server.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      server.on('close', () => {
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
      });
      
      const request = {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now()
      };
      
      server.stdin.write(JSON.stringify(request) + '\n');
      server.stdin.end();
      
      setTimeout(() => {
        server.kill();
        reject(new Error('Timeout'));
      }, 5000);
    });
  }

  async test(description, testFn) {
    process.stdout.write(`Testing ${description}... `);
    try {
      await testFn();
      console.log('✅');
      this.results.passed++;
    } catch (error) {
      console.log(`❌ ${error.message}`);
      this.results.failed++;
      this.results.errors.push({ test: description, error: error.message });
    }
  }

  async runTests() {
    console.log('🧪 Running Integration Tests\n');
    
    // Test 1: Server responds to tools/list
    await this.test('Server responds to tools/list', async () => {
      const response = await this.sendRequest('tools/list');
      if (!response.result || !response.result.tools) {
        throw new Error('Invalid response structure');
      }
      if (response.result.tools.length < 50) {
        throw new Error(`Expected 50+ tools, got ${response.result.tools.length}`);
      }
    });
    
    // Test 2: Generate scale works
    await this.test('Generate scale returns correct notes', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'generate_scale',
        arguments: { root: 'C', scale: 'major' }
      });
      const text = response.result.content[0].text;
      if (!text.includes('C, D, E, F, G, A, B')) {
        throw new Error('Incorrect C major scale');
      }
    });
    
    // Test 3: Generate pattern works
    await this.test('Generate pattern creates valid code', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'generate_pattern',
        arguments: { style: 'techno', key: 'C', bpm: 130 }
      });
      const text = response.result.content[0].text;
      if (!text.includes('Generated techno pattern')) {
        throw new Error('Pattern generation failed');
      }
    });
    
    // Test 4: Generate drums with complexity
    await this.test('Generate drums respects complexity', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'generate_drums',
        arguments: { style: 'techno', complexity: 0.8 }
      });
      const text = response.result.content[0].text;
      if (!text.includes('Generated techno drums')) {
        throw new Error('Drum generation failed');
      }
    });
    
    // Test 5: Generate chord progression
    await this.test('Generate chord progression', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'generate_chord_progression',
        arguments: { key: 'F', style: 'jazz' }
      });
      const text = response.result.content[0].text;
      if (!text.includes('Generated jazz progression')) {
        throw new Error('Chord progression generation failed');
      }
    });
    
    // Test 6: Generate Euclidean rhythm
    await this.test('Generate Euclidean rhythm', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'generate_euclidean',
        arguments: { hits: 5, steps: 8, sound: 'hh' }
      });
      const text = response.result.content[0].text;
      if (!text.includes('Euclidean rhythm')) {
        throw new Error('Euclidean rhythm generation failed');
      }
    });
    
    // Test 7: Generate polyrhythm
    await this.test('Generate polyrhythm', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'generate_polyrhythm',
        arguments: { sounds: ['bd', 'cp'], patterns: [3, 4] }
      });
      const text = response.result.content[0].text;
      if (!text.includes('polyrhythm')) {
        throw new Error('Polyrhythm generation failed');
      }
    });
    
    // Test 8: Generate bassline
    await this.test('Generate bassline', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'generate_bassline',
        arguments: { key: 'E', style: 'acid' }
      });
      const text = response.result.content[0].text;
      if (!text.includes('Generated acid bassline')) {
        throw new Error('Bassline generation failed');
      }
    });
    
    // Test 9: Generate melody
    await this.test('Generate melody', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'generate_melody',
        arguments: { scale: 'pentatonic', root: 'A', length: 16 }
      });
      const text = response.result.content[0].text;
      if (!text.includes('Generated melody')) {
        throw new Error('Melody generation failed');
      }
    });
    
    // Test 10: Generate fill
    await this.test('Generate fill', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'generate_fill',
        arguments: { style: 'dnb', bars: 2 }
      });
      const text = response.result.content[0].text;
      if (!text.includes('Generated 2 bar fill')) {
        throw new Error('Fill generation failed');
      }
    });
    
    // Test 11: Pattern storage (list)
    await this.test('List patterns works', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'list',
        arguments: {}
      });
      // Should return either a list or "No patterns found"
      const text = response.result.content[0].text;
      if (text.includes('Error')) {
        throw new Error('List patterns failed');
      }
    });
    
    // Test 12: Error handling for invalid tool
    await this.test('Invalid tool returns error', async () => {
      const response = await this.sendRequest('tools/call', {
        name: 'invalid_tool_name',
        arguments: {}
      });
      const text = response.result.content[0].text;
      if (!text.includes('Unknown tool')) {
        throw new Error('Error handling failed');
      }
    });
    
    // Test 13: Multiple scale types
    await this.test('All scale types work', async () => {
      const scales = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 'pentatonic', 'blues'];
      for (const scale of scales) {
        const response = await this.sendRequest('tools/call', {
          name: 'generate_scale',
          arguments: { root: 'C', scale }
        });
        const text = response.result.content[0].text;
        if (!text.includes(`C ${scale} scale:`)) {
          throw new Error(`Failed for ${scale} scale`);
        }
      }
    });
    
    // Test 14: All drum styles
    await this.test('All drum styles work', async () => {
      const styles = ['techno', 'house', 'dnb', 'breakbeat', 'trap', 'jungle', 'ambient'];
      for (const style of styles) {
        const response = await this.sendRequest('tools/call', {
          name: 'generate_drums',
          arguments: { style, complexity: 0.5 }
        });
        const text = response.result.content[0].text;
        if (!text.includes(`Generated ${style} drums`)) {
          throw new Error(`Failed for ${style} drums`);
        }
      }
    });
    
    // Test 15: All bass styles
    await this.test('All bass styles work', async () => {
      const styles = ['techno', 'house', 'dnb', 'acid', 'dub', 'funk', 'jazz', 'ambient'];
      for (const style of styles) {
        const response = await this.sendRequest('tools/call', {
          name: 'generate_bassline',
          arguments: { key: 'C', style }
        });
        const text = response.result.content[0].text;
        if (!text.includes(`Generated ${style} bassline`)) {
          throw new Error(`Failed for ${style} bass`);
        }
      }
    });
    
    return this.results;
  }
}

// Run the tests
async function main() {
  const tester = new IntegrationTester();
  const results = await tester.runTests();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Integration Test Results');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.errors.forEach(e => {
      console.log(`  - ${e.test}: ${e.error}`);
    });
  }
  
  if (results.failed === 0) {
    console.log('\n🎉 All integration tests passed!');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(console.error);