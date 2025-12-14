/**
 * Core Tests for EnhancedMCPServerFixed
 *
 * Tests tool execution paths, state management, and error handling
 * to increase coverage from 35% to 70%+
 */

import { EnhancedMCPServerFixed } from '../server/EnhancedMCPServerFixed';
import { StrudelController } from '../StrudelController';
import { PatternStore } from '../PatternStore';
import { MusicTheory } from '../services/MusicTheory';
import { PatternGenerator } from '../services/PatternGenerator';

// Mock all dependencies
jest.mock('../StrudelController');
jest.mock('../PatternStore');
jest.mock('../services/MusicTheory');
jest.mock('../services/PatternGenerator');
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('{"headless": true}'),
  existsSync: jest.fn().mockReturnValue(true)
}));

describe('EnhancedMCPServerFixed', () => {
  let server: EnhancedMCPServerFixed;
  let mockController: jest.Mocked<StrudelController>;
  let mockStore: jest.Mocked<PatternStore>;
  let mockTheory: jest.Mocked<MusicTheory>;
  let mockGenerator: jest.Mocked<PatternGenerator>;

  beforeEach(() => {
    // Setup mocks
    mockController = {
      initialize: jest.fn().mockResolvedValue('Strudel initialized'),
      getCurrentPattern: jest.fn().mockResolvedValue('s("bd*4")'),
      writePattern: jest.fn().mockResolvedValue('Pattern written: 7 chars'),
      play: jest.fn().mockResolvedValue('Playing'),
      stop: jest.fn().mockResolvedValue('Stopped'),
      analyzeAudio: jest.fn().mockResolvedValue({
        connected: true,
        features: {
          bass: 0.5,
          mid: 0.5,
          treble: 0.5,
          isPlaying: true,
          isSilent: false
        }
      }),
      detectKey: jest.fn().mockResolvedValue({
        key: 'C',
        scale: 'major',
        confidence: 0.85,
        alternatives: []
      }),
      detectTempo: jest.fn().mockResolvedValue({
        bpm: 120,
        confidence: 0.85,
        method: 'autocorrelation'
      }),
      analyzer: {
        detectTempo: jest.fn().mockResolvedValue({
          bpm: 120,
          confidence: 0.85,
          method: 'autocorrelation'
        })
      },
      validatePatternRuntime: jest.fn().mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      }),
      validatePattern: jest.fn().mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: []
      }),
      showBrowser: jest.fn().mockResolvedValue('Browser window brought to foreground'),
      takeScreenshot: jest.fn().mockResolvedValue('Screenshot saved to strudel-screenshot.png'),
      getStatus: jest.fn().mockReturnValue({
        initialized: true,
        playing: false,
        patternLength: 10,
        cacheValid: true,
        errorCount: 0,
        warningCount: 0
      }),
      getDiagnostics: jest.fn().mockResolvedValue({
        browserConnected: true,
        pageLoaded: true,
        editorReady: true,
        audioConnected: false,
        cacheStatus: { hasCache: true, cacheAge: 100 },
        errorStats: {}
      }),
      getConsoleErrors: jest.fn().mockReturnValue([]),
      getConsoleWarnings: jest.fn().mockReturnValue([]),
      page: {}
    } as any;

    mockStore = {
      save: jest.fn().mockResolvedValue(undefined),
      load: jest.fn().mockResolvedValue({
        name: 'test-pattern',
        content: 's("bd cp")',
        tags: ['test'],
        timestamp: new Date().toISOString()
      }),
      list: jest.fn().mockResolvedValue([
        {
          name: 'pattern1',
          tags: ['techno'],
          timestamp: new Date().toISOString()
        }
      ])
    } as any;

    mockTheory = {
      generateScale: jest.fn().mockReturnValue(['C', 'D', 'E', 'F', 'G', 'A', 'B']),
      generateChordProgression: jest.fn().mockReturnValue('I-V-vi-IV')
    } as any;

    mockGenerator = {
      generateCompletePattern: jest.fn().mockReturnValue('s("bd*4 cp*2")'),
      generateDrumPattern: jest.fn().mockReturnValue('s("bd*4")'),
      generateBassline: jest.fn().mockReturnValue('s("c2 e2 g2")'),
      generateMelody: jest.fn().mockReturnValue('note("c4 d4 e4")'),
      generateChords: jest.fn().mockReturnValue('s("C Em Am F")'),
      generateEuclideanPattern: jest.fn().mockReturnValue('s("bd").euclidean(3, 8)'),
      generatePolyrhythm: jest.fn().mockReturnValue('s("bd").euclidean(3, 8)'),
      generateFill: jest.fn().mockReturnValue('s("bd*16")'),
      generateVariation: jest.fn().mockReturnValue('s("bd*4 cp*2").fast(2)')
    } as any;

    // Mock constructors
    (StrudelController as jest.Mock).mockReturnValue(mockController);
    (PatternStore as jest.Mock).mockReturnValue(mockStore);
    (MusicTheory as jest.Mock).mockReturnValue(mockTheory);
    (PatternGenerator as jest.Mock).mockReturnValue(mockGenerator);

    server = new EnhancedMCPServerFixed();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Control Tools', () => {
    describe('init', () => {
      test('should initialize controller', async () => {
        const result = await (server as any).executeTool('init', {});

        expect(mockController.initialize).toHaveBeenCalled();
        expect(result).toContain('initialized');
      });

      test('should load pending patterns after init', async () => {
        // Generate a pattern before init
        await (server as any).executeTool('generate_pattern', { style: 'techno' });
        const result = await (server as any).executeTool('init', {});

        expect(result).toContain('Loaded generated pattern');
        expect(mockController.writePattern).toHaveBeenCalled();
      });
    });

    describe('write', () => {
      beforeEach(async () => {
        await (server as any).executeTool('init', {});
      });

      test('should write pattern', async () => {
        const result = await (server as any).executeTool('write', { pattern: 's("bd*4")' });

        expect(mockController.writePattern).toHaveBeenCalledWith('s("bd*4")');
        expect(result).toContain('Pattern written');
      });

      test('should validate pattern length', async () => {
        const longPattern = 'a'.repeat(10001);

        await expect(
          (server as any).executeTool('write', { pattern: longPattern })
        ).rejects.toThrow('pattern too long');
      });

      test('should save to undo stack', async () => {
        await (server as any).executeTool('write', { pattern: 's("bd*4")' });

        const undoResult = await (server as any).executeTool('undo', {});
        expect(undoResult).toBe('Undone');
      });

      test('should require initialization for write', async () => {
        const uninitServer = new EnhancedMCPServerFixed();
        const result = await (uninitServer as any).executeTool('write', { pattern: 's("bd*4")' });

        expect(result).toContain('not initialized');
      });
    });

    describe('append', () => {
      beforeEach(async () => {
        await (server as any).executeTool('init', {});
      });

      test('should append to current pattern', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        await (server as any).executeTool('append', { code: 's("cp*2")' });

        expect(mockController.writePattern).toHaveBeenCalledWith('s("bd*4")\ns("cp*2")');
      });

      test('should validate code length', async () => {
        const longCode = 'a'.repeat(10001);

        await expect(
          (server as any).executeTool('append', { code: longCode })
        ).rejects.toThrow('code too long');
      });
    });

    describe('insert', () => {
      beforeEach(async () => {
        await (server as any).executeTool('init', {});
      });

      test('should insert at specific line', async () => {
        mockController.getCurrentPattern.mockResolvedValue('line1\nline3');

        await (server as any).executeTool('insert', { position: 1, code: 'line2' });

        expect(mockController.writePattern).toHaveBeenCalledWith('line1\nline2\nline3');
      });

      test('should validate position is positive integer', async () => {
        await expect(
          (server as any).executeTool('insert', { position: -1, code: 'test' })
        ).rejects.toThrow();
      });

      test('should validate position is integer', async () => {
        await expect(
          (server as any).executeTool('insert', { position: 1.5, code: 'test' })
        ).rejects.toThrow('integer');
      });
    });

    describe('replace', () => {
      beforeEach(async () => {
        await (server as any).executeTool('init', {});
      });

      test('should replace text in pattern', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        await (server as any).executeTool('replace', { search: 'bd', replace: 'cp' });

        expect(mockController.writePattern).toHaveBeenCalledWith('s("cp*4")');
      });

      test('should validate search string', async () => {
        const longSearch = 'a'.repeat(1001);

        await expect(
          (server as any).executeTool('replace', { search: longSearch, replace: 'test' })
        ).rejects.toThrow();
      });
    });

    describe('play/pause/stop', () => {
      beforeEach(async () => {
        await (server as any).executeTool('init', {});
      });

      test('should start playback', async () => {
        const result = await (server as any).executeTool('play', {});

        expect(mockController.play).toHaveBeenCalled();
        expect(result).toBe('Playing');
      });

      test('should stop playback with stop', async () => {
        const result = await (server as any).executeTool('stop', {});

        expect(mockController.stop).toHaveBeenCalled();
        expect(result).toBe('Stopped');
      });

      test('should stop playback with pause', async () => {
        const result = await (server as any).executeTool('pause', {});

        expect(mockController.stop).toHaveBeenCalled();
        expect(result).toBe('Stopped');
      });
    });

    describe('clear', () => {
      beforeEach(async () => {
        await (server as any).executeTool('init', {});
      });

      test('should clear editor', async () => {
        await (server as any).executeTool('clear', {});

        expect(mockController.writePattern).toHaveBeenCalledWith('');
      });
    });

    describe('get_pattern', () => {
      beforeEach(async () => {
        await (server as any).executeTool('init', {});
      });

      test('should get current pattern', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        const result = await (server as any).executeTool('get_pattern', {});

        expect(result).toBe('s("bd*4")');
      });
    });
  });

  describe('Pattern Generation Tools', () => {
    describe('generate_pattern', () => {
      test('should generate pattern without initialization', async () => {
        const result = await (server as any).executeTool('generate_pattern', {
          style: 'techno'
        });

        expect(mockGenerator.generateCompletePattern).toHaveBeenCalledWith('techno', 'C', 120);
        expect(result).toContain('Generated techno pattern');
      });

      test('should validate style', async () => {
        await expect(
          (server as any).executeTool('generate_pattern', { style: '' })
        ).rejects.toThrow('cannot be empty');
      });

      test('should validate BPM when provided', async () => {
        await expect(
          (server as any).executeTool('generate_pattern', { style: 'techno', bpm: 500 })
        ).rejects.toThrow('BPM');
      });

      test('should validate key when provided', async () => {
        await expect(
          (server as any).executeTool('generate_pattern', { style: 'techno', key: 'X' })
        ).rejects.toThrow('Invalid root note');
      });

      test('should use default values', async () => {
        await (server as any).executeTool('generate_pattern', { style: 'house' });

        expect(mockGenerator.generateCompletePattern).toHaveBeenCalledWith('house', 'C', 120);
      });
    });

    describe('generate_drums', () => {
      test('should generate drums', async () => {
        await (server as any).executeTool('generate_drums', { style: 'techno' });

        expect(mockGenerator.generateDrumPattern).toHaveBeenCalledWith('techno', 0.5);
      });

      test('should validate complexity range', async () => {
        await expect(
          (server as any).executeTool('generate_drums', { style: 'techno', complexity: 1.5 })
        ).rejects.toThrow('between 0 and 1');
      });

      test('should use provided complexity', async () => {
        await (server as any).executeTool('generate_drums', {
          style: 'techno',
          complexity: 0.8
        });

        expect(mockGenerator.generateDrumPattern).toHaveBeenCalledWith('techno', 0.8);
      });
    });

    describe('generate_bassline', () => {
      test('should generate bassline', async () => {
        const result = await (server as any).executeTool('generate_bassline', {
          key: 'C',
          style: 'acid'
        });

        expect(mockGenerator.generateBassline).toHaveBeenCalledWith('C', 'acid');
        expect(result).toContain('Generated acid bassline in C');
      });

      test('should validate key', async () => {
        await expect(
          (server as any).executeTool('generate_bassline', { key: 'X', style: 'acid' })
        ).rejects.toThrow('Invalid root note');
      });
    });

    describe('generate_melody', () => {
      test('should generate melody', async () => {
        await (server as any).executeTool('generate_melody', {
          root: 'C',
          scale: 'major',
          length: 16
        });

        expect(mockTheory.generateScale).toHaveBeenCalledWith('C', 'major');
        expect(mockGenerator.generateMelody).toHaveBeenCalledWith(
          ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
          16
        );
      });

      test('should use default length', async () => {
        await (server as any).executeTool('generate_melody', {
          root: 'D',
          scale: 'minor'
        });

        expect(mockGenerator.generateMelody).toHaveBeenCalledWith(expect.any(Array), 8);
      });

      test('should validate length is positive', async () => {
        await expect(
          (server as any).executeTool('generate_melody', {
            root: 'C',
            scale: 'major',
            length: 0
          })
        ).rejects.toThrow('positive');
      });
    });

    describe('generate_scale', () => {
      test('should return scale notes', async () => {
        const result = await (server as any).executeTool('generate_scale', {
          root: 'C',
          scale: 'major'
        });

        expect(result).toContain('C major scale');
        expect(result).toContain('C, D, E, F, G, A, B');
      });

      test('should validate scale name', async () => {
        await expect(
          (server as any).executeTool('generate_scale', { root: 'C', scale: 'invalid' })
        ).rejects.toThrow('Invalid scale name');
      });
    });

    describe('generate_chord_progression', () => {
      test('should generate chord progression', async () => {
        const result = await (server as any).executeTool('generate_chord_progression', {
          key: 'C',
          style: 'pop'
        });

        expect(mockTheory.generateChordProgression).toHaveBeenCalledWith('C', 'pop');
        expect(result).toContain('Generated pop progression in C');
      });

      test('should validate chord style', async () => {
        await expect(
          (server as any).executeTool('generate_chord_progression', {
            key: 'C',
            style: 'invalid'
          })
        ).rejects.toThrow('Invalid chord style');
      });
    });

    describe('generate_euclidean', () => {
      test('should generate euclidean pattern', async () => {
        const result = await (server as any).executeTool('generate_euclidean', {
          hits: 3,
          steps: 8,
          sound: 'bd'
        });

        expect(mockGenerator.generateEuclideanPattern).toHaveBeenCalledWith(3, 8, 'bd');
        expect(result).toContain('Euclidean rhythm (3/8)');
      });

      test('should use default sound', async () => {
        await (server as any).executeTool('generate_euclidean', { hits: 5, steps: 16 });

        expect(mockGenerator.generateEuclideanPattern).toHaveBeenCalledWith(5, 16, 'bd');
      });

      test('should validate hits <= steps', async () => {
        await expect(
          (server as any).executeTool('generate_euclidean', { hits: 10, steps: 8 })
        ).rejects.toThrow('cannot exceed steps');
      });
    });

    describe('generate_polyrhythm', () => {
      test('should generate polyrhythm', async () => {
        await (server as any).executeTool('generate_polyrhythm', {
          sounds: ['bd', 'cp', 'hh'],
          patterns: [3, 5, 7]
        });

        expect(mockGenerator.generatePolyrhythm).toHaveBeenCalledWith(
          ['bd', 'cp', 'hh'],
          [3, 5, 7]
        );
      });

      test('should validate pattern numbers are positive', async () => {
        await expect(
          (server as any).executeTool('generate_polyrhythm', {
            sounds: ['bd'],
            patterns: [0]
          })
        ).rejects.toThrow('positive');
      });
    });

    describe('generate_fill', () => {
      test('should generate fill', async () => {
        const result = await (server as any).executeTool('generate_fill', {
          style: 'techno',
          bars: 2
        });

        expect(mockGenerator.generateFill).toHaveBeenCalledWith('techno', 2);
        expect(result).toContain('2 bar fill');
      });

      test('should use default bars', async () => {
        await (server as any).executeTool('generate_fill', { style: 'house' });

        expect(mockGenerator.generateFill).toHaveBeenCalledWith('house', 1);
      });
    });
  });

  describe('Pattern Manipulation Tools', () => {
    beforeEach(async () => {
      await (server as any).executeTool('init', {});
    });

    describe('transpose', () => {
      test('should transpose pattern', async () => {
        mockController.getCurrentPattern.mockResolvedValue('note("c4 d4 e4")');

        const result = await (server as any).executeTool('transpose', { semitones: 5 });

        expect(result).toContain('Transposed 5 semitones');
      });

      test('should accept negative semitones', async () => {
        const result = await (server as any).executeTool('transpose', { semitones: -3 });

        expect(result).toContain('Transposed -3 semitones');
      });

      test('should validate semitones is integer', async () => {
        await expect(
          (server as any).executeTool('transpose', { semitones: 2.5 })
        ).rejects.toThrow('integer');
      });
    });

    describe('reverse', () => {
      test('should add reverse modifier', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        await (server as any).executeTool('reverse', {});

        expect(mockController.writePattern).toHaveBeenCalledWith('s("bd*4").rev');
      });
    });

    describe('stretch', () => {
      test('should add slow modifier', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        await (server as any).executeTool('stretch', { factor: 2 });

        expect(mockController.writePattern).toHaveBeenCalledWith('s("bd*4").slow(2)');
      });

      test('should validate factor is positive', async () => {
        await expect(
          (server as any).executeTool('stretch', { factor: -1 })
        ).rejects.toThrow();
      });
    });

    describe('humanize', () => {
      test('should add humanize effect', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        const result = await (server as any).executeTool('humanize', { amount: 0.05 });

        expect(mockController.writePattern).toHaveBeenCalled();
        expect(result).toBe('Added human timing');
      });

      test('should use default amount', async () => {
        const result = await (server as any).executeTool('humanize', {});

        expect(result).toBe('Added human timing');
      });
    });

    describe('generate_variation', () => {
      test('should generate variation', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        const result = await (server as any).executeTool('generate_variation', {
          type: 'extreme'
        });

        expect(mockGenerator.generateVariation).toHaveBeenCalledWith('s("bd*4")', 'extreme');
        expect(result).toContain('extreme variation');
      });

      test('should use default type', async () => {
        await (server as any).executeTool('generate_variation', {});

        expect(mockGenerator.generateVariation).toHaveBeenCalledWith(expect.any(String), 'subtle');
      });
    });
  });

  describe('Effects and Tempo Tools', () => {
    beforeEach(async () => {
      await (server as any).executeTool('init', {});
    });

    describe('add_effect', () => {
      test('should add effect with params', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        const result = await (server as any).executeTool('add_effect', {
          effect: 'reverb',
          params: '0.5'
        });

        expect(mockController.writePattern).toHaveBeenCalledWith('s("bd*4").reverb(0.5)');
        expect(result).toContain('Added reverb effect');
      });

      test('should add effect without params', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        await (server as any).executeTool('add_effect', { effect: 'distortion' });

        expect(mockController.writePattern).toHaveBeenCalledWith('s("bd*4").distortion()');
      });
    });

    describe('add_swing', () => {
      test('should add swing', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        const result = await (server as any).executeTool('add_swing', { amount: 0.6 });

        expect(mockController.writePattern).toHaveBeenCalledWith('s("bd*4").swing(0.6)');
        expect(result).toContain('Added swing: 0.6');
      });

      test('should validate amount range', async () => {
        await expect(
          (server as any).executeTool('add_swing', { amount: 1.5 })
        ).rejects.toThrow('between 0 and 1');
      });
    });

    describe('set_tempo', () => {
      test('should set tempo', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        const result = await (server as any).executeTool('set_tempo', { bpm: 140 });

        expect(mockController.writePattern).toHaveBeenCalledWith('setcpm(140)\ns("bd*4")');
        expect(result).toContain('Set tempo to 140 BPM');
      });

      test('should validate BPM range', async () => {
        await expect(
          (server as any).executeTool('set_tempo', { bpm: 500 })
        ).rejects.toThrow('BPM must be between');
      });
    });
  });

  describe('Audio Analysis Tools', () => {
    beforeEach(async () => {
      await (server as any).executeTool('init', {});
    });

    describe('analyze', () => {
      test('should analyze audio', async () => {
        const result = await (server as any).executeTool('analyze', {});

        expect(mockController.analyzeAudio).toHaveBeenCalled();
        expect(result.connected).toBe(true);
      });

      test('should require initialization', async () => {
        const uninitServer = new EnhancedMCPServerFixed();
        const result = await (uninitServer as any).executeTool('analyze', {});

        expect(result).toContain('not initialized');
      });
    });

    describe('analyze_spectrum', () => {
      test('should return spectrum features', async () => {
        const result = await (server as any).executeTool('analyze_spectrum', {});

        expect(result).toHaveProperty('bass');
        expect(result).toHaveProperty('mid');
        expect(result).toHaveProperty('treble');
      });
    });

    describe('analyze_rhythm', () => {
      test('should return rhythm analysis', async () => {
        const result = await (server as any).executeTool('analyze_rhythm', {});

        expect(result).toHaveProperty('isPlaying');
        expect(result).toHaveProperty('tempo');
      });
    });

    describe('detect_tempo', () => {
      test('should detect tempo successfully', async () => {
        const result = await (server as any).executeTool('detect_tempo', {});

        expect(result.bpm).toBe(120);
        expect(result.confidence).toBe(0.85);
        expect(result.method).toBe('autocorrelation');
        expect(result.message).toContain('120 BPM');
      });

      test('should handle no tempo detected', async () => {
        mockController.detectTempo.mockResolvedValue({ bpm: 0, confidence: 0 });

        const result = await (server as any).executeTool('detect_tempo', {});

        expect(result.bpm).toBe(0);
        expect(result.message).toContain('No tempo detected');
      });

      test('should handle null tempo result', async () => {
        mockController.detectTempo.mockResolvedValue(null);

        const result = await (server as any).executeTool('detect_tempo', {});

        expect(result.bpm).toBe(0);
        expect(result.message).toContain('No tempo detected');
      });

      test('should handle detection error', async () => {
        mockController.detectTempo.mockRejectedValue(new Error('Detection failed'));

        const result = await (server as any).executeTool('detect_tempo', {});

        expect(result.bpm).toBe(0);
        expect(result.error).toContain('Detection failed');
      });

      test('should require initialization', async () => {
        const uninitServer = new EnhancedMCPServerFixed();
        const result = await (uninitServer as any).executeTool('detect_tempo', {});

        expect(result).toContain('not initialized');
      });
    });

    describe('detect_key', () => {
      test('should detect key successfully', async () => {
        const result = await (server as any).executeTool('detect_key', {});

        expect(result.key).toBe('C');
        expect(result.scale).toBe('major');
        expect(result.confidence).toBe(0.85);
      });

      test('should handle no key detected', async () => {
        mockController.detectKey.mockResolvedValue({ key: 'Unknown', scale: 'unknown', confidence: 0.05 });

        const result = await (server as any).executeTool('detect_key', {});

        expect(result.key).toBe('Unknown');
        expect(result.message).toContain('No clear key detected');
      });

      test('should handle detection error', async () => {
        mockController.detectKey.mockRejectedValue(new Error('Key detection failed'));

        const result = await (server as any).executeTool('detect_key', {});

        expect(result.key).toBe('Unknown');
        expect(result.error).toContain('Key detection failed');
      });

      test('should include alternatives when available', async () => {
        mockController.detectKey.mockResolvedValue({
          key: 'C',
          scale: 'major',
          confidence: 0.75,
          alternatives: [{ key: 'A', scale: 'minor', confidence: 0.65 }]
        });

        const result = await (server as any).executeTool('detect_key', {});

        expect(result.alternatives).toBeDefined();
        expect(result.alternatives[0].key).toBe('A');
      });

      test('should require initialization', async () => {
        const uninitServer = new EnhancedMCPServerFixed();
        const result = await (uninitServer as any).executeTool('detect_key', {});

        expect(result).toContain('not initialized');
      });
    });
  });

  describe('Session Management Tools', () => {
    beforeEach(async () => {
      await (server as any).executeTool('init', {});
    });

    describe('save', () => {
      test('should save pattern', async () => {
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        const result = await (server as any).executeTool('save', {
          name: 'my-pattern',
          tags: ['techno', 'drums']
        });

        expect(mockStore.save).toHaveBeenCalledWith(
          'my-pattern',
          's("bd*4")',
          ['techno', 'drums']
        );
        expect(result).toContain('Pattern saved as "my-pattern"');
      });

      test('should handle empty pattern', async () => {
        mockController.getCurrentPattern.mockResolvedValue('');

        const result = await (server as any).executeTool('save', { name: 'test' });

        expect(result).toBe('No pattern to save');
      });

      test('should validate name length', async () => {
        const longName = 'a'.repeat(256);

        await expect(
          (server as any).executeTool('save', { name: longName })
        ).rejects.toThrow();
      });
    });

    describe('load', () => {
      test('should load pattern', async () => {
        const result = await (server as any).executeTool('load', { name: 'test-pattern' });

        expect(mockStore.load).toHaveBeenCalledWith('test-pattern');
        expect(mockController.writePattern).toHaveBeenCalledWith('s("bd cp")');
        expect(result).toContain('Loaded pattern "test-pattern"');
      });

      test('should handle pattern not found', async () => {
        mockStore.load.mockResolvedValue(null);

        const result = await (server as any).executeTool('load', { name: 'nonexistent' });

        expect(result).toContain('not found');
      });
    });

    describe('list', () => {
      test('should list patterns', async () => {
        const result = await (server as any).executeTool('list', {});

        expect(mockStore.list).toHaveBeenCalledWith(undefined);
        expect(result).toContain('pattern1');
      });

      test('should filter by tag', async () => {
        await (server as any).executeTool('list', { tag: 'techno' });

        expect(mockStore.list).toHaveBeenCalledWith('techno');
      });

      test('should handle empty list', async () => {
        mockStore.list.mockResolvedValue([]);

        const result = await (server as any).executeTool('list', {});

        expect(result).toContain('No patterns found');
      });
    });

    describe('undo', () => {
      test('should undo changes', async () => {
        // First make a change
        await (server as any).executeTool('write', { pattern: 's("bd*4")' });
        mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');

        const result = await (server as any).executeTool('undo', {});

        expect(result).toBe('Undone');
      });

      test('should handle empty undo stack', async () => {
        const result = await (server as any).executeTool('undo', {});

        expect(result).toBe('Nothing to undo');
      });

      test('should require initialization', async () => {
        const uninitServer = new EnhancedMCPServerFixed();
        const result = await (uninitServer as any).executeTool('undo', {});

        expect(result).toContain('not initialized');
      });
    });

    describe('redo', () => {
      test('should redo changes', async () => {
        // Setup: write, undo, then redo
        await (server as any).executeTool('write', { pattern: 's("bd*4")' });
        await (server as any).executeTool('undo', {});

        const result = await (server as any).executeTool('redo', {});

        expect(result).toBe('Redone');
      });

      test('should handle empty redo stack', async () => {
        const result = await (server as any).executeTool('redo', {});

        expect(result).toBe('Nothing to redo');
      });
    });
  });

  describe('Performance Monitoring Tools', () => {
    describe('performance_report', () => {
      test('should return performance report', async () => {
        const result = await (server as any).executeTool('performance_report', {});

        expect(result).toContain('Bottlenecks');
      });
    });

    describe('memory_usage', () => {
      test('should return memory usage', async () => {
        const result = await (server as any).executeTool('memory_usage', {});

        // Result depends on PerformanceMonitor implementation
        expect(result).toBeDefined();
      });
    });
  });

  describe('Pattern Validation', () => {
    beforeEach(async () => {
      await (server as any).executeTool('init', {});
    });

    test('should validate valid pattern', async () => {
      const result = await (server as any).executeTool('validate_pattern_runtime', {
        pattern: 's("bd*4")',
        waitMs: 500
      });

      expect(result).toContain('Pattern valid');
      expect(mockController.validatePatternRuntime).toHaveBeenCalledWith('s("bd*4")', 500);
    });

    test('should detect invalid pattern', async () => {
      mockController.validatePatternRuntime.mockResolvedValue({
        valid: false,
        errors: ['Syntax error'],
        warnings: ['Missing semicolon']
      });

      const result = await (server as any).executeTool('validate_pattern_runtime', {
        pattern: 's("bd*4)'
      });

      expect(result).toContain('runtime errors');
      expect(result).toContain('Syntax error');
    });

    test('should use default waitMs', async () => {
      await (server as any).executeTool('validate_pattern_runtime', {
        pattern: 's("bd*4")'
      });

      expect(mockController.validatePatternRuntime).toHaveBeenCalledWith('s("bd*4")', 500);
    });

    test('should require initialization', async () => {
      const uninitServer = new EnhancedMCPServerFixed();
      const result = await (uninitServer as any).executeTool('validate_pattern_runtime', {
        pattern: 's("bd*4")'
      });

      expect(result).toContain('not initialized');
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown tool', async () => {
      await expect(
        (server as any).executeTool('unknown_tool', {})
      ).rejects.toThrow('Unknown tool');
    });

    test('should require initialization for browser tools', async () => {
      const uninitServer = new EnhancedMCPServerFixed();

      const result = await (uninitServer as any).executeTool('play', {});

      expect(result).toContain('not initialized');
    });

    test('should handle controller errors gracefully', async () => {
      await (server as any).executeTool('init', {});
      mockController.play.mockRejectedValue(new Error('Playback failed'));

      await expect(
        (server as any).executeTool('play', {})
      ).rejects.toThrow('Playback failed');
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await (server as any).executeTool('init', {});
    });

    test('should maintain undo/redo stack', async () => {
      // Write pattern 1
      await (server as any).executeTool('write', { pattern: 's("bd*4")' });

      // Write pattern 2
      mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');
      await (server as any).executeTool('write', { pattern: 's("cp*2")' });

      // Undo should restore pattern 1
      const undoResult = await (server as any).executeTool('undo', {});
      expect(undoResult).toBe('Undone');

      // Redo should restore pattern 2
      const redoResult = await (server as any).executeTool('redo', {});
      expect(redoResult).toBe('Redone');
    });

    test('should clear redo stack on new write', async () => {
      await (server as any).executeTool('write', { pattern: 's("bd*4")' });
      await (server as any).executeTool('undo', {});

      // New write should clear redo stack
      await (server as any).executeTool('write', { pattern: 's("cp*2")' });

      const redoResult = await (server as any).executeTool('redo', {});
      expect(redoResult).toBe('Nothing to redo');
    });
  });

  describe('Tool Integration', () => {
    test('should chain operations correctly', async () => {
      await (server as any).executeTool('init', {});

      // Generate pattern
      await (server as any).executeTool('generate_pattern', { style: 'techno' });

      // Add effect
      mockController.getCurrentPattern.mockResolvedValue('s("bd*4")');
      await (server as any).executeTool('add_effect', { effect: 'reverb', params: '0.5' });

      // Save
      const saveResult = await (server as any).executeTool('save', {
        name: 'techno-reverb',
        tags: ['techno']
      });

      expect(saveResult).toContain('Pattern saved');
    });
  });

  // UX Tools Tests - Issue #37, #38, #39, #40, #42
  describe('UX Tools', () => {
    describe('Browser Control (#37)', () => {
      test('show_browser should bring window to foreground', async () => {
        await (server as any).executeTool('init', {});
        const result = await (server as any).executeTool('show_browser', {});
        expect(result).toContain('foreground');
        expect(mockController.showBrowser).toHaveBeenCalled();
      });

      test('show_browser should require initialization', async () => {
        const result = await (server as any).executeTool('show_browser', {});
        expect(result).toContain('not initialized');
      });

      test('screenshot should save browser state', async () => {
        await (server as any).executeTool('init', {});
        const result = await (server as any).executeTool('screenshot', { filename: 'test.png' });
        expect(result).toContain('Screenshot');
        expect(mockController.takeScreenshot).toHaveBeenCalledWith('test.png');
      });

      test('screenshot should require initialization', async () => {
        const result = await (server as any).executeTool('screenshot', {});
        expect(result).toContain('not initialized');
      });
    });

    describe('Status & Diagnostics (#39)', () => {
      test('status should return current state', async () => {
        const result = await (server as any).executeTool('status', {});
        expect(result).toHaveProperty('initialized');
        expect(result).toHaveProperty('playing');
        expect(result).toHaveProperty('errorCount');
      });

      test('diagnostics should return detailed info when initialized', async () => {
        await (server as any).executeTool('init', {});
        const result = await (server as any).executeTool('diagnostics', {});
        expect(result).toHaveProperty('browserConnected');
        expect(result).toHaveProperty('editorReady');
        expect(result).toHaveProperty('cacheStatus');
      });

      test('diagnostics should indicate not initialized', async () => {
        const result = await (server as any).executeTool('diagnostics', {});
        expect(result.initialized).toBe(false);
        expect(result.message).toContain('not initialized');
      });

      test('show_errors should display captured errors', async () => {
        mockController.getConsoleErrors.mockReturnValue(['Error 1', 'Error 2']);
        mockController.getConsoleWarnings.mockReturnValue(['Warning 1']);

        const result = await (server as any).executeTool('show_errors', {});
        expect(result).toContain('Errors');
        expect(result).toContain('Error 1');
        expect(result).toContain('Warning 1');
      });

      test('show_errors should indicate no errors when empty', async () => {
        mockController.getConsoleErrors.mockReturnValue([]);
        mockController.getConsoleWarnings.mockReturnValue([]);

        const result = await (server as any).executeTool('show_errors', {});
        expect(result).toContain('No errors');
      });
    });

    describe('Auto-play (#38)', () => {
      test('write with auto_play should start playback', async () => {
        await (server as any).executeTool('init', {});
        const result = await (server as any).executeTool('write', {
          pattern: 's("bd*4")',
          auto_play: true
        });
        expect(result).toContain('Playing');
        expect(mockController.play).toHaveBeenCalled();
      });

      test('write without auto_play should not start playback', async () => {
        await (server as any).executeTool('init', {});
        mockController.play.mockClear();
        const result = await (server as any).executeTool('write', {
          pattern: 's("bd*4")',
          auto_play: false
        });
        expect(result).not.toContain('Playing');
        expect(mockController.play).not.toHaveBeenCalled();
      });

      test('generate_pattern with auto_play should start playback', async () => {
        await (server as any).executeTool('init', {});
        mockController.play.mockClear();
        const result = await (server as any).executeTool('generate_pattern', {
          style: 'techno',
          auto_play: true
        });
        expect(result).toContain('Playing');
        expect(mockController.play).toHaveBeenCalled();
      });
    });

    describe('Pattern Validation (#40)', () => {
      test('write with validate=false should skip validation', async () => {
        await (server as any).executeTool('init', {});
        mockController.validatePattern.mockClear();

        await (server as any).executeTool('write', {
          pattern: 's("bd*4")',
          validate: false
        });

        expect(mockController.validatePattern).not.toHaveBeenCalled();
      });

      test('write should validate by default', async () => {
        await (server as any).executeTool('init', {});
        mockController.validatePattern.mockClear();

        await (server as any).executeTool('write', { pattern: 's("bd*4")' });

        expect(mockController.validatePattern).toHaveBeenCalled();
      });

      test('write should return validation errors', async () => {
        await (server as any).executeTool('init', {});
        mockController.validatePattern.mockResolvedValue({
          valid: false,
          errors: ['Syntax error'],
          warnings: [],
          suggestions: ['Check syntax']
        });

        const result = await (server as any).executeTool('write', { pattern: 'invalid{' });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Syntax error');
      });
    });

    describe('Compose Workflow (#42)', () => {
      test('compose should auto-initialize and generate pattern', async () => {
        const result = await (server as any).executeTool('compose', {
          style: 'techno'
        });

        expect(result.success).toBe(true);
        expect(result.metadata.style).toBe('techno');
        expect(result.status).toBe('playing');
        expect(mockController.initialize).toHaveBeenCalled();
        expect(mockController.writePattern).toHaveBeenCalled();
        expect(mockController.play).toHaveBeenCalled();
      });

      test('compose should respect auto_play=false', async () => {
        mockController.play.mockClear();
        const result = await (server as any).executeTool('compose', {
          style: 'ambient',
          auto_play: false
        });

        expect(result.success).toBe(true);
        expect(result.status).toBe('ready');
        expect(mockController.play).not.toHaveBeenCalled();
      });

      test('compose should use custom tempo and key', async () => {
        const result = await (server as any).executeTool('compose', {
          style: 'house',
          tempo: 128,
          key: 'A'
        });

        expect(result.success).toBe(true);
        expect(result.metadata.bpm).toBe(128);
        expect(result.metadata.key).toBe('A');
      });

      test('compose should use genre-appropriate default tempo', async () => {
        const result = await (server as any).executeTool('compose', {
          style: 'dnb'
        });

        expect(result.success).toBe(true);
        expect(result.metadata.bpm).toBe(174); // DnB default
      });
    });
  });
});
