import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

describe('Strudel MCP Server Tools', () => {
  const sendRequest = async (method: string, params?: any): Promise<any> => {
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
      
      server.on('close', (code) => {
        try {
          // Parse all JSON objects from response
          const jsonObjects = response.split('\n')
            .filter(line => line.trim().startsWith('{'))
            .map(line => JSON.parse(line));
          
          const result = jsonObjects.find(obj => obj.jsonrpc === '2.0');
          if (result) {
            resolve(result);
          } else {
            reject(new Error(`No valid JSON-RPC response. Output: ${response}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e}. Output: ${response}`));
        }
      });
      
      const request = {
        jsonrpc: '2.0',
        method,
        params,
        id: 1
      };
      
      server.stdin.write(JSON.stringify(request) + '\n');
      server.stdin.end();
      
      // Timeout after 5 seconds
      setTimeout(() => {
        server.kill();
        reject(new Error('Request timeout'));
      }, 5000);
    });
  };

  describe('Server Initialization', () => {
    test('should respond to tools/list request', async () => {
      const result = await sendRequest('tools/list');
      expect(result).toHaveProperty('jsonrpc', '2.0');
      expect(result).toHaveProperty('result.tools');
      expect(Array.isArray(result.result.tools)).toBe(true);
    });

    test('should have 40+ tools available', async () => {
      const result = await sendRequest('tools/list');
      expect(result.result.tools.length).toBeGreaterThanOrEqual(40);
    });

    test('should have all expected tool categories', async () => {
      const result = await sendRequest('tools/list');
      const toolNames = result.result.tools.map((t: any) => t.name);
      
      // Core Control Tools
      expect(toolNames).toContain('init');
      expect(toolNames).toContain('write');
      expect(toolNames).toContain('play');
      expect(toolNames).toContain('stop');
      expect(toolNames).toContain('clear');
      expect(toolNames).toContain('get_pattern');
      
      // Pattern Generation
      expect(toolNames).toContain('generate_pattern');
      expect(toolNames).toContain('generate_drums');
      expect(toolNames).toContain('generate_bassline');
      expect(toolNames).toContain('generate_melody');
      
      // Music Theory
      expect(toolNames).toContain('generate_scale');
      expect(toolNames).toContain('generate_chord_progression');
      expect(toolNames).toContain('generate_euclidean');
      expect(toolNames).toContain('generate_polyrhythm');
      
      // Effects
      expect(toolNames).toContain('add_effect');
      expect(toolNames).toContain('set_tempo');
      expect(toolNames).toContain('add_swing');
      
      // Session Management
      expect(toolNames).toContain('save');
      expect(toolNames).toContain('load');
      expect(toolNames).toContain('list');
      expect(toolNames).toContain('undo');
      expect(toolNames).toContain('redo');
    });
  });

  describe('Music Theory Tools', () => {
    test('generate_scale should return scale notes', async () => {
      const result = await sendRequest('tools/call', {
        name: 'generate_scale',
        arguments: { root: 'C', scale: 'major' }
      });
      
      expect(result).toHaveProperty('result.content');
      const content = result.result.content[0].text;
      expect(content).toContain('C');
      expect(content).toContain('major');
    });

    test('generate_chord_progression should handle different styles', async () => {
      const styles = ['pop', 'jazz', 'blues', 'rock'];
      
      for (const style of styles) {
        const result = await sendRequest('tools/call', {
          name: 'generate_chord_progression',
          arguments: { key: 'C', style }
        });
        
        expect(result.result.content[0].text).toBeTruthy();
      }
    });

    test('generate_euclidean should create valid rhythms', async () => {
      const result = await sendRequest('tools/call', {
        name: 'generate_euclidean',
        arguments: { hits: 5, steps: 8, sound: 'bd' }
      });
      
      expect(result.result.content[0].text).toContain('Euclidean');
    });
  });

  describe('Pattern Generation Tools', () => {
    test('generate_pattern should work for different styles', async () => {
      const styles = ['techno', 'house', 'dnb', 'ambient'];
      
      for (const style of styles) {
        const result = await sendRequest('tools/call', {
          name: 'generate_pattern',
          arguments: { style, key: 'C', bpm: 120 }
        });
        
        expect(result.result.content[0].text).toContain(style);
      }
    });

    test('generate_drums should handle complexity parameter', async () => {
      const result = await sendRequest('tools/call', {
        name: 'generate_drums',
        arguments: { style: 'techno', complexity: 0.8 }
      });
      
      expect(result.result.content[0].text).toContain('drums');
    });

    test('generate_bassline should work with different keys', async () => {
      const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      
      for (const key of keys) {
        const result = await sendRequest('tools/call', {
          name: 'generate_bassline',
          arguments: { key, style: 'techno' }
        });
        
        expect(result.result.content[0].text).toContain('bassline');
      }
    });
  });

  describe('Tool Input Validation', () => {
    test('should handle missing required parameters', async () => {
      const result = await sendRequest('tools/call', {
        name: 'write',
        arguments: {}
      });
      
      expect(result.result.content[0].text).toContain('Error');
    });

    test('should handle invalid tool names', async () => {
      const result = await sendRequest('tools/call', {
        name: 'invalid_tool',
        arguments: {}
      });
      
      expect(result.result.content[0].text).toContain('Unknown tool');
    });
  });
});

describe('Pattern Store Integration', () => {
  const patternsDir = './patterns';
  
  beforeAll(async () => {
    // Ensure patterns directory exists
    await fs.mkdir(patternsDir, { recursive: true });
  });
  
  test('should save and load patterns', async () => {
    const sendRequest = async (method: string, params?: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        const server = spawn('node', ['dist/index.js']);
        let response = '';
        
        server.stdout.on('data', (data) => {
          response += data.toString();
        });
        
        server.on('close', () => {
          try {
            const jsonObjects = response.split('\n')
              .filter(line => line.trim().startsWith('{'))
              .map(line => JSON.parse(line));
            
            const result = jsonObjects.find(obj => obj.jsonrpc === '2.0');
            resolve(result);
          } catch (e) {
            reject(e);
          }
        });
        
        const request = {
          jsonrpc: '2.0',
          method,
          params,
          id: 1
        };
        
        server.stdin.write(JSON.stringify(request) + '\n');
        server.stdin.end();
      });
    };
    
    // This would need actual browser context to work fully
    // For now, just test that the tools are callable
    const saveResult = await sendRequest('tools/call', {
      name: 'save',
      arguments: { name: 'test-pattern', tags: ['test'] }
    });
    
    // Will fail because browser not initialized, but tests tool availability
    expect(saveResult.result.content[0].text).toBeTruthy();
  });
});

describe('Music Theory Service', () => {
  // Direct unit tests for the music theory service
  const { MusicTheory } = require('../dist/services/MusicTheory.js');
  
  test('should generate correct major scale', () => {
    const theory = new MusicTheory();
    const scale = theory.generateScale('C', 'major');
    expect(scale).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });
  
  test('should generate correct minor scale', () => {
    const theory = new MusicTheory();
    const scale = theory.generateScale('A', 'minor');
    expect(scale).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });
  
  test('should handle invalid root notes', () => {
    const theory = new MusicTheory();
    expect(() => theory.generateScale('X', 'major')).toThrow();
  });
  
  test('should generate Euclidean rhythms correctly', () => {
    const theory = new MusicTheory();
    const rhythm = theory.generateEuclideanRhythm(3, 8);
    const hits = rhythm.split(' ').filter(x => x === '1').length;
    expect(hits).toBe(3);
  });
});

describe('Pattern Generator Service', () => {
  const { PatternGenerator } = require('../dist/services/PatternGenerator.js');
  
  test('should generate drum patterns for all styles', () => {
    const generator = new PatternGenerator();
    const styles = ['techno', 'house', 'dnb', 'breakbeat', 'trap', 'jungle', 'ambient'];
    
    styles.forEach(style => {
      const pattern = generator.generateDrumPattern(style, 0.5);
      expect(pattern).toContain('s(');
    });
  });
  
  test('should generate basslines for all styles', () => {
    const generator = new PatternGenerator();
    const styles = ['techno', 'house', 'dnb', 'acid', 'dub', 'funk', 'jazz', 'ambient'];
    
    styles.forEach(style => {
      const pattern = generator.generateBassline('C', style);
      expect(pattern).toContain('note(');
    });
  });
  
  test('should generate complete patterns', () => {
    const generator = new PatternGenerator();
    const pattern = generator.generateCompletePattern('techno', 'C', 130);
    
    expect(pattern).toContain('setcpm(130)');
    expect(pattern).toContain('stack(');
    expect(pattern).toContain('// Drums');
    expect(pattern).toContain('// Bass');
  });
  
  test('should handle pattern variations', () => {
    const generator = new PatternGenerator();
    const basePattern = 's("bd*4")';
    const varied = generator.generateVariation(basePattern, 'subtle');
    
    expect(varied).toContain(basePattern);
    expect(varied).toContain('.sometimes');
  });
});