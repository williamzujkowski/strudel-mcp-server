#!/usr/bin/env node

import { spawn } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class MCPTester {
  constructor() {
    this.testResults = [];
    this.currentTest = 0;
    this.server = null;
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

  async testTool(name, args, description) {
    console.log(`\n🧪 Testing: ${name} - ${description}`);
    console.log(`   Args: ${JSON.stringify(args)}`);
    
    try {
      const result = await this.sendRequest('tools/call', {
        name,
        arguments: args
      });
      
      if (result.result && result.result.content) {
        const text = result.result.content[0].text;
        console.log(`   ✅ Success: ${text.substring(0, 100)}...`);
        this.testResults.push({ name, status: 'pass', message: text });
        return true;
      } else if (result.error) {
        console.log(`   ❌ Error: ${result.error.message}`);
        this.testResults.push({ name, status: 'fail', error: result.error.message });
        return false;
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
      this.testResults.push({ name, status: 'error', error: error.message });
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive MCP tool tests...\n');
    
    // Get list of all tools first
    console.log('📋 Fetching tool list...');
    const toolsResponse = await this.sendRequest('tools/list');
    const tools = toolsResponse.result.tools;
    console.log(`Found ${tools.length} tools\n`);
    
    // Test categories
    const testSuite = [
      // Music Theory Tests
      { name: 'generate_scale', args: { root: 'C', scale: 'major' }, desc: 'Generate C major scale' },
      { name: 'generate_scale', args: { root: 'A', scale: 'minor' }, desc: 'Generate A minor scale' },
      { name: 'generate_scale', args: { root: 'D', scale: 'dorian' }, desc: 'Generate D dorian mode' },
      { name: 'generate_scale', args: { root: 'E', scale: 'phrygian' }, desc: 'Generate E phrygian mode' },
      { name: 'generate_scale', args: { root: 'F', scale: 'lydian' }, desc: 'Generate F lydian mode' },
      { name: 'generate_scale', args: { root: 'G', scale: 'mixolydian' }, desc: 'Generate G mixolydian' },
      { name: 'generate_scale', args: { root: 'B', scale: 'locrian' }, desc: 'Generate B locrian mode' },
      { name: 'generate_scale', args: { root: 'C', scale: 'pentatonic' }, desc: 'Generate C pentatonic' },
      { name: 'generate_scale', args: { root: 'E', scale: 'blues' }, desc: 'Generate E blues scale' },
      { name: 'generate_scale', args: { root: 'C', scale: 'chromatic' }, desc: 'Generate chromatic scale' },
      
      // Chord Progressions
      { name: 'generate_chord_progression', args: { key: 'C', style: 'pop' }, desc: 'Pop progression in C' },
      { name: 'generate_chord_progression', args: { key: 'F', style: 'jazz' }, desc: 'Jazz ii-V-I in F' },
      { name: 'generate_chord_progression', args: { key: 'E', style: 'blues' }, desc: '12-bar blues in E' },
      { name: 'generate_chord_progression', args: { key: 'G', style: 'rock' }, desc: 'Rock progression in G' },
      { name: 'generate_chord_progression', args: { key: 'D', style: 'folk' }, desc: 'Folk progression in D' },
      
      // Euclidean Rhythms
      { name: 'generate_euclidean', args: { hits: 3, steps: 8, sound: 'bd' }, desc: 'Euclidean 3/8 kick' },
      { name: 'generate_euclidean', args: { hits: 5, steps: 8, sound: 'hh' }, desc: 'Euclidean 5/8 hihat' },
      { name: 'generate_euclidean', args: { hits: 7, steps: 16, sound: 'cp' }, desc: 'Euclidean 7/16 clap' },
      
      // Polyrhythms
      { name: 'generate_polyrhythm', args: { sounds: ['bd', 'cp'], patterns: [3, 4] }, desc: '3 vs 4 polyrhythm' },
      { name: 'generate_polyrhythm', args: { sounds: ['hh', 'rd', 'sn'], patterns: [5, 7, 3] }, desc: '5:7:3 polyrhythm' },
      
      // Pattern Generation
      { name: 'generate_pattern', args: { style: 'techno', key: 'C', bpm: 130 }, desc: 'Techno in C at 130' },
      { name: 'generate_pattern', args: { style: 'house', key: 'F', bpm: 124 }, desc: 'House in F at 124' },
      { name: 'generate_pattern', args: { style: 'dnb', key: 'A', bpm: 174 }, desc: 'DnB in A at 174' },
      { name: 'generate_pattern', args: { style: 'ambient', key: 'D', bpm: 70 }, desc: 'Ambient in D at 70' },
      { name: 'generate_pattern', args: { style: 'trap', key: 'G', bpm: 140 }, desc: 'Trap in G at 140' },
      { name: 'generate_pattern', args: { style: 'jungle', key: 'E', bpm: 160 }, desc: 'Jungle in E at 160' },
      
      // Drum Patterns
      { name: 'generate_drums', args: { style: 'techno', complexity: 0.3 }, desc: 'Simple techno drums' },
      { name: 'generate_drums', args: { style: 'techno', complexity: 0.7 }, desc: 'Complex techno drums' },
      { name: 'generate_drums', args: { style: 'house', complexity: 0.5 }, desc: 'House drums' },
      { name: 'generate_drums', args: { style: 'dnb', complexity: 0.8 }, desc: 'Complex DnB drums' },
      { name: 'generate_drums', args: { style: 'breakbeat', complexity: 0.6 }, desc: 'Breakbeat drums' },
      { name: 'generate_drums', args: { style: 'trap', complexity: 0.5 }, desc: 'Trap drums' },
      { name: 'generate_drums', args: { style: 'ambient', complexity: 0.2 }, desc: 'Ambient percussion' },
      
      // Basslines
      { name: 'generate_bassline', args: { key: 'C', style: 'techno' }, desc: 'Techno bass in C' },
      { name: 'generate_bassline', args: { key: 'F', style: 'house' }, desc: 'House bass in F' },
      { name: 'generate_bassline', args: { key: 'A', style: 'dnb' }, desc: 'DnB bass in A' },
      { name: 'generate_bassline', args: { key: 'E', style: 'acid' }, desc: 'Acid bass in E' },
      { name: 'generate_bassline', args: { key: 'G', style: 'dub' }, desc: 'Dub bass in G' },
      { name: 'generate_bassline', args: { key: 'D', style: 'funk' }, desc: 'Funk bass in D' },
      { name: 'generate_bassline', args: { key: 'Bb', style: 'jazz' }, desc: 'Jazz bass in Bb' },
      
      // Melodies
      { name: 'generate_melody', args: { scale: 'major', root: 'C', length: 8 }, desc: 'C major melody' },
      { name: 'generate_melody', args: { scale: 'minor', root: 'A', length: 16 }, desc: 'A minor melody' },
      { name: 'generate_melody', args: { scale: 'pentatonic', root: 'E', length: 12 }, desc: 'E pentatonic melody' },
      { name: 'generate_melody', args: { scale: 'blues', root: 'G', length: 8 }, desc: 'G blues melody' },
      
      // Fills
      { name: 'generate_fill', args: { style: 'techno', bars: 1 }, desc: '1-bar techno fill' },
      { name: 'generate_fill', args: { style: 'dnb', bars: 2 }, desc: '2-bar DnB fill' },
      { name: 'generate_fill', args: { style: 'trap', bars: 1 }, desc: '1-bar trap fill' },
    ];
    
    // Run all tests
    let passed = 0;
    let failed = 0;
    
    for (const test of testSuite) {
      const result = await this.testTool(test.name, test.args, test.desc);
      if (result) passed++;
      else failed++;
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total: ${passed + failed}`);
    console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    // Show failed tests
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status !== 'pass')
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }
    
    return { passed, failed };
  }
}

// Run tests
const tester = new MCPTester();
console.log('🎵 Strudel MCP Server Tool Tester\n');

tester.runAllTests().then(({ passed, failed }) => {
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The server is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the implementation.');
  }
  process.exit(failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});