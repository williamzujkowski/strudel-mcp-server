import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { StrudelController } from '../StrudelController.js';
import { PatternStore } from '../PatternStore.js';
import { MusicTheory } from '../services/MusicTheory.js';
import { PatternGenerator } from '../services/PatternGenerator.js';
import { GeminiService, CreativeFeedback, AudioFeedback } from '../services/GeminiService.js';
import { AudioCaptureService } from '../services/AudioCaptureService.js';
import { readFileSync, existsSync } from 'fs';
import { Logger } from '../utils/Logger.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { InputValidator } from '../utils/InputValidator.js';

const configPath = './config.json';
const config = existsSync(configPath) 
  ? JSON.parse(readFileSync(configPath, 'utf-8'))
  : { headless: false };

/** History entry with metadata for pattern browsing */
interface HistoryEntry {
  id: number;
  pattern: string;
  timestamp: Date;
  action: string;
}

export class EnhancedMCPServerFixed {
  private server: Server;
  private controller: StrudelController;
  private store: PatternStore;
  private theory: MusicTheory;
  private generator: PatternGenerator;
  private geminiService: GeminiService;
  private audioCaptureService: AudioCaptureService | null = null;
  private logger: Logger;
  private perfMonitor: PerformanceMonitor;
  private sessionHistory: string[] = [];
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  /** Pattern history with metadata for browsing (#41) */
  private historyStack: HistoryEntry[] = [];
  private historyIdCounter: number = 0;
  /** Maximum history entries to prevent memory leaks */
  private readonly MAX_HISTORY = 100;
  private isInitialized: boolean = false;
  private generatedPatterns: Map<string, string> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'strudel-mcp-enhanced',
        version: '2.0.1',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.controller = new StrudelController(config.headless);
    this.store = new PatternStore('./patterns');
    this.theory = new MusicTheory();
    this.generator = new PatternGenerator();
    this.geminiService = new GeminiService();
    this.logger = new Logger();
    this.perfMonitor = new PerformanceMonitor();
    this.setupHandlers();
  }

  private getTools(): Tool[] {
    // Same tools as before - keeping the same structure
    return [
      // Core Control Tools (10)
      {
        name: 'init',
        description: 'Initialize Strudel in browser',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'write',
        description: 'Write pattern to editor with optional auto-play and validation',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Pattern code' },
            auto_play: { type: 'boolean', description: 'Start playback immediately after writing (default: false)' },
            validate: { type: 'boolean', description: 'Validate pattern before writing (default: true)' }
          },
          required: ['pattern']
        }
      },
      {
        name: 'append',
        description: 'Append code to current pattern',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to append' }
          },
          required: ['code']
        }
      },
      {
        name: 'insert',
        description: 'Insert code at specific line',
        inputSchema: {
          type: 'object',
          properties: {
            position: { type: 'number', description: 'Line number' },
            code: { type: 'string', description: 'Code to insert' }
          },
          required: ['position', 'code']
        }
      },
      {
        name: 'replace',
        description: 'Replace pattern section',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Text to replace' },
            replace: { type: 'string', description: 'Replacement text' }
          },
          required: ['search', 'replace']
        }
      },
      {
        name: 'play',
        description: 'Start playing pattern',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'pause',
        description: 'Pause playback',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'stop',
        description: 'Stop playback',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'clear',
        description: 'Clear the editor',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_pattern',
        description: 'Get current pattern code',
        inputSchema: { type: 'object', properties: {} }
      },

      // Pattern Manipulation (10)
      {
        name: 'transpose',
        description: 'Transpose notes by semitones',
        inputSchema: {
          type: 'object',
          properties: {
            semitones: { type: 'number', description: 'Semitones to transpose' }
          },
          required: ['semitones']
        }
      },
      {
        name: 'reverse',
        description: 'Reverse pattern',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'stretch',
        description: 'Time stretch pattern',
        inputSchema: {
          type: 'object',
          properties: {
            factor: { type: 'number', description: 'Stretch factor' }
          },
          required: ['factor']
        }
      },
      {
        name: 'quantize',
        description: 'Quantize to grid',
        inputSchema: {
          type: 'object',
          properties: {
            grid: { type: 'string', description: 'Grid size (e.g., "1/16")' }
          },
          required: ['grid']
        }
      },
      {
        name: 'humanize',
        description: 'Add human timing variation',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Humanization amount (0-1)' }
          }
        }
      },
      {
        name: 'generate_variation',
        description: 'Create pattern variations',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Variation type (subtle/moderate/extreme/glitch/evolving)' }
          }
        }
      },
      {
        name: 'generate_pattern',
        description: 'Generate complete pattern from style with optional auto-play',
        inputSchema: {
          type: 'object',
          properties: {
            style: { type: 'string', description: 'Music style (techno/house/dnb/ambient/etc)' },
            key: { type: 'string', description: 'Musical key' },
            bpm: { type: 'number', description: 'Tempo in BPM' },
            auto_play: { type: 'boolean', description: 'Start playback immediately (default: false)' }
          },
          required: ['style']
        }
      },
      {
        name: 'generate_drums',
        description: 'Generate drum pattern',
        inputSchema: {
          type: 'object',
          properties: {
            style: { type: 'string', description: 'Drum style' },
            complexity: { type: 'number', description: 'Complexity (0-1)' }
          },
          required: ['style']
        }
      },
      {
        name: 'generate_bassline',
        description: 'Generate bassline',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Musical key' },
            style: { type: 'string', description: 'Bass style' }
          },
          required: ['key', 'style']
        }
      },
      {
        name: 'generate_melody',
        description: 'Generate melody from scale',
        inputSchema: {
          type: 'object',
          properties: {
            scale: { type: 'string', description: 'Scale name' },
            root: { type: 'string', description: 'Root note' },
            length: { type: 'number', description: 'Number of notes' }
          },
          required: ['scale', 'root']
        }
      },

      // Audio Analysis (5)
      {
        name: 'analyze',
        description: 'Complete audio analysis',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'analyze_spectrum',
        description: 'FFT spectrum analysis',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'analyze_rhythm',
        description: 'Rhythm analysis',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'detect_tempo',
        description: 'BPM detection',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'detect_key',
        description: 'Key detection',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'validate_pattern_runtime',
        description: 'Validate pattern with runtime error checking (monitors Strudel console for errors)',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Pattern code to validate' },
            waitMs: { type: 'number', description: 'How long to wait for errors (default 500ms)' }
          },
          required: ['pattern']
        }
      },

      // Effects & Processing (5)
      {
        name: 'add_effect',
        description: 'Add effect to pattern',
        inputSchema: {
          type: 'object',
          properties: {
            effect: { type: 'string', description: 'Effect name' },
            params: { type: 'string', description: 'Effect parameters' }
          },
          required: ['effect']
        }
      },
      {
        name: 'remove_effect',
        description: 'Remove effect',
        inputSchema: {
          type: 'object',
          properties: {
            effect: { type: 'string', description: 'Effect to remove' }
          },
          required: ['effect']
        }
      },
      {
        name: 'set_tempo',
        description: 'Set BPM',
        inputSchema: {
          type: 'object',
          properties: {
            bpm: { type: 'number', description: 'Tempo in BPM' }
          },
          required: ['bpm']
        }
      },
      {
        name: 'add_swing',
        description: 'Add swing to pattern',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Swing amount (0-1)' }
          },
          required: ['amount']
        }
      },
      {
        name: 'apply_scale',
        description: 'Apply scale to notes',
        inputSchema: {
          type: 'object',
          properties: {
            scale: { type: 'string', description: 'Scale name' },
            root: { type: 'string', description: 'Root note' }
          },
          required: ['scale', 'root']
        }
      },

      // Session Management (5)
      {
        name: 'save',
        description: 'Save pattern with metadata',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Pattern name' },
            tags: { type: 'array', items: { type: 'string' } }
          },
          required: ['name']
        }
      },
      {
        name: 'load',
        description: 'Load saved pattern',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Pattern name' }
          },
          required: ['name']
        }
      },
      {
        name: 'list',
        description: 'List saved patterns',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by tag' }
          }
        }
      },
      {
        name: 'undo',
        description: 'Undo last action',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'redo',
        description: 'Redo action',
        inputSchema: { type: 'object', properties: {} }
      },

      // Pattern History Tools (#41)
      {
        name: 'list_history',
        description: 'List recent pattern history with timestamps and previews',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum entries to return (default: 10)' }
          }
        }
      },
      {
        name: 'restore_history',
        description: 'Restore a previous pattern from history by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'History entry ID to restore' }
          },
          required: ['id']
        }
      },
      {
        name: 'compare_patterns',
        description: 'Compare two patterns from history showing differences',
        inputSchema: {
          type: 'object',
          properties: {
            id1: { type: 'number', description: 'First pattern ID' },
            id2: { type: 'number', description: 'Second pattern ID (default: current pattern)' }
          },
          required: ['id1']
        }
      },

      // Additional Music Theory Tools (5)
      {
        name: 'generate_scale',
        description: 'Generate scale notes',
        inputSchema: {
          type: 'object',
          properties: {
            root: { type: 'string', description: 'Root note' },
            scale: { type: 'string', description: 'Scale type' }
          },
          required: ['root', 'scale']
        }
      },
      {
        name: 'generate_chord_progression',
        description: 'Generate chord progression',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key' },
            style: { type: 'string', description: 'Style (pop/jazz/blues/etc)' }
          },
          required: ['key', 'style']
        }
      },
      {
        name: 'generate_euclidean',
        description: 'Generate Euclidean rhythm',
        inputSchema: {
          type: 'object',
          properties: {
            hits: { type: 'number', description: 'Number of hits' },
            steps: { type: 'number', description: 'Total steps' },
            sound: { type: 'string', description: 'Sound to use' }
          },
          required: ['hits', 'steps']
        }
      },
      {
        name: 'generate_polyrhythm',
        description: 'Generate polyrhythm',
        inputSchema: {
          type: 'object',
          properties: {
            sounds: { type: 'array', items: { type: 'string' }, description: 'Sounds to use' },
            patterns: { type: 'array', items: { type: 'number' }, description: 'Pattern numbers' }
          },
          required: ['sounds', 'patterns']
        }
      },
      {
        name: 'generate_fill',
        description: 'Generate drum fill',
        inputSchema: {
          type: 'object',
          properties: {
            style: { type: 'string', description: 'Fill style' },
            bars: { type: 'number', description: 'Number of bars' }
          },
          required: ['style']
        }
      },

      // Performance Monitoring (2)
      {
        name: 'performance_report',
        description: 'Get performance metrics and bottlenecks',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'memory_usage',
        description: 'Get current memory usage statistics',
        inputSchema: { type: 'object', properties: {} }
      },

      // UX Tools - Browser Control (#37)
      {
        name: 'show_browser',
        description: 'Bring browser window to foreground for visual feedback',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'screenshot',
        description: 'Take a screenshot of the current Strudel editor state',
        inputSchema: {
          type: 'object',
          properties: {
            filename: { type: 'string', description: 'Optional filename for screenshot' }
          }
        }
      },

      // UX Tools - Status & Diagnostics (#39)
      {
        name: 'status',
        description: 'Get current browser and playback status (quick state check)',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'diagnostics',
        description: 'Get detailed browser diagnostics including cache, errors, and performance',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'show_errors',
        description: 'Display captured console errors and warnings from Strudel',
        inputSchema: { type: 'object', properties: {} }
      },

      // UX Tools - High-level Compose (#42, #73)
      {
        name: 'compose',
        description: 'Generate, write, and play a complete pattern in one step. Auto-initializes browser if needed.',
        inputSchema: {
          type: 'object',
          properties: {
            style: { type: 'string', description: 'Genre: techno, house, dnb, ambient, trap, jungle, jazz, experimental' },
            tempo: { type: 'number', description: 'BPM (default: genre-appropriate)' },
            key: { type: 'string', description: 'Musical key (default: C)' },
            auto_play: { type: 'boolean', description: 'Start playback immediately (default: true)' },
            get_feedback: { type: 'boolean', description: 'Get AI feedback on the generated pattern (default: false)' }
          },
          required: ['style']
        }
      },

      // AI Feedback Tools (#67)
      {
        name: 'get_pattern_feedback',
        description: 'Get AI-powered creative feedback on the current pattern using Google Gemini. Analyzes pattern structure and optionally audio.',
        inputSchema: {
          type: 'object',
          properties: {
            includeAudio: { type: 'boolean', description: 'Include audio analysis (plays pattern briefly). Default: false' },
            style: { type: 'string', description: 'Optional style hint for context (e.g., "techno", "ambient")' }
          }
        }
      },

      // Audio Capture Tools (#72)
      {
        name: 'start_audio_capture',
        description: 'Start capturing audio from Strudel output. Audio must be playing for capture to work.',
        inputSchema: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['webm', 'opus'], description: 'Audio format (default: webm)' },
            maxDuration: { type: 'number', description: 'Maximum capture duration in milliseconds' }
          }
        }
      },
      {
        name: 'stop_audio_capture',
        description: 'Stop audio capture and return the recorded audio as base64-encoded data.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'capture_audio_sample',
        description: 'Capture a fixed-duration audio sample from Strudel output. Audio must be playing.',
        inputSchema: {
          type: 'object',
          properties: {
            duration: { type: 'number', description: 'Duration in milliseconds (default: 5000)' }
          }
        }
      }
    ];
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        this.logger.info(`Executing tool: ${name}`, args);

        // Measure performance
        const result = await this.perfMonitor.measureAsync(
          name,
          () => this.executeTool(name, args)
        );

        return {
          content: [{
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }],
        };
      } catch (error: any) {
        this.logger.error(`Tool execution failed: ${name}`, error);
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
        };
      }
    });
  }

  private requiresInitialization(toolName: string): boolean {
    const toolsRequiringInit = [
      'write', 'append', 'insert', 'replace', 'play', 'pause', 'stop',
      'clear', 'get_pattern', 'analyze', 'analyze_spectrum', 'analyze_rhythm',
      'transpose', 'reverse', 'stretch', 'humanize', 'generate_variation',
      'add_effect', 'add_swing', 'set_tempo', 'save', 'undo', 'redo',
      'validate_pattern_runtime'
    ];
    
    const toolsRequiringWrite = [
      'generate_pattern', 'generate_drums', 'generate_bassline', 'generate_melody',
      'generate_chord_progression', 'generate_euclidean', 'generate_polyrhythm',
      'generate_fill'
    ];
    
    return toolsRequiringInit.includes(toolName) || toolsRequiringWrite.includes(toolName);
  }

  private async getCurrentPatternSafe(): Promise<string> {
    if (!this.isInitialized) {
      // Return the last generated pattern if available
      const lastPattern = Array.from(this.generatedPatterns.values()).pop();
      return lastPattern || '';
    }
    
    try {
      return await this.controller.getCurrentPattern();
    } catch (e) {
      return '';
    }
  }

  private async writePatternSafe(pattern: string): Promise<string> {
    if (!this.isInitialized) {
      // Store the pattern for later use
      const id = `pattern_${Date.now()}`;
      this.generatedPatterns.set(id, pattern);
      return `Pattern generated (initialize Strudel to use it): ${pattern.substring(0, 50)}...`;
    }
    
    return await this.controller.writePattern(pattern);
  }

  private async executeTool(name: string, args: any): Promise<any> {
    // Check if tool needs initialization
    if (this.requiresInitialization(name) && !this.isInitialized && name !== 'init') {
      // For generation tools that don't require browser, handle them specially
      const generationTools = [
        'generate_pattern', 'generate_drums', 'generate_bassline', 'generate_melody',
        'generate_chord_progression', 'generate_euclidean', 'generate_polyrhythm', 'generate_fill'
      ];
      
      if (!generationTools.includes(name)) {
        return `Browser not initialized. Run 'init' first to use ${name}.`;
      }
    }

    // Save current state for undo and history (#41) (only if initialized)
    if (['write', 'append', 'insert', 'replace', 'clear'].includes(name) && this.isInitialized) {
      try {
        const current = await this.controller.getCurrentPattern();
        this.undoStack.push(current);

        // Add to history stack with metadata (#41)
        this.historyIdCounter++;
        this.historyStack.push({
          id: this.historyIdCounter,
          pattern: current,
          timestamp: new Date(),
          action: name
        });

        // Enforce bounds to prevent memory leaks
        if (this.undoStack.length > this.MAX_HISTORY) {
          this.undoStack.shift();
        }
        if (this.historyStack.length > this.MAX_HISTORY) {
          this.historyStack.shift();
        }
        this.redoStack = [];
      } catch (e) {
        // Controller might not be initialized yet
      }
    }

    switch (name) {
      // Core Control
      case 'init':
        const initResult = await this.controller.initialize();
        this.isInitialized = true;
        
        // Write any pending patterns
        if (this.generatedPatterns.size > 0) {
          const lastPattern = Array.from(this.generatedPatterns.values()).pop();
          if (lastPattern) {
            await this.controller.writePattern(lastPattern);
            return `${initResult}. Loaded generated pattern.`;
          }
        }
        return initResult;
      
      case 'write':
        InputValidator.validateStringLength(args.pattern, 'pattern', 10000, true);

        // Validate pattern if requested (default: true) - Issue #40
        if (args.validate !== false && this.isInitialized && typeof this.controller.validatePattern === 'function') {
          try {
            const validation = await this.controller.validatePattern(args.pattern);
            if (validation && !validation.valid) {
              return {
                success: false,
                errors: validation.errors,
                warnings: validation.warnings,
                suggestions: validation.suggestions,
                message: `Pattern validation failed: ${validation.errors.join('; ')}`
              };
            }
          } catch (e) {
            // Validation failed, but we can still try to write
            this.logger.warn('Pattern validation threw error, continuing with write');
          }
        }

        const writeResult = await this.writePatternSafe(args.pattern);

        // Auto-play if requested - Issue #38
        if (args.auto_play && this.isInitialized) {
          await this.controller.play();
          return `${writeResult}. Playing.`;
        }

        return writeResult;

      case 'append':
        InputValidator.validateStringLength(args.code, 'code', 10000, true);
        const current = await this.getCurrentPatternSafe();
        return await this.writePatternSafe(current + '\n' + args.code);

      case 'insert':
        InputValidator.validatePositiveInteger(args.position, 'position');
        InputValidator.validateStringLength(args.code, 'code', 10000, true);
        const lines = (await this.getCurrentPatternSafe()).split('\n');
        lines.splice(args.position, 0, args.code);
        return await this.writePatternSafe(lines.join('\n'));

      case 'replace':
        InputValidator.validateStringLength(args.search, 'search', 1000, true);
        InputValidator.validateStringLength(args.replace, 'replace', 10000, true);
        const pattern = await this.getCurrentPatternSafe();
        // Escape $ in replacement to prevent special sequence injection ($&, $1, $', etc.)
        const safeReplacement = args.replace.replace(/\$/g, '$$$$');
        const replaced = pattern.replace(args.search, safeReplacement);
        return await this.writePatternSafe(replaced);
      
      case 'play':
        return await this.controller.play();
      
      case 'pause':
      case 'stop':
        return await this.controller.stop();
      
      case 'clear':
        return await this.writePatternSafe('');
      
      case 'get_pattern':
        return await this.getCurrentPatternSafe();
      
      // Pattern Generation - These can work without browser
      case 'generate_pattern':
        InputValidator.validateStringLength(args.style, 'style', 100, false);
        if (args.key) {
          InputValidator.validateRootNote(args.key);
        }
        if (args.bpm !== undefined) {
          InputValidator.validateBPM(args.bpm);
        }
        const generated = this.generator.generateCompletePattern(
          args.style,
          args.key || 'C',
          args.bpm || 120
        );
        await this.writePatternSafe(generated);

        // Auto-play if requested - Issue #38
        if (args.auto_play && this.isInitialized) {
          await this.controller.play();
          return `Generated ${args.style} pattern. Playing.`;
        }

        return `Generated ${args.style} pattern`;
      
      case 'generate_drums':
        InputValidator.validateStringLength(args.style, 'style', 100, false);
        if (args.complexity !== undefined) {
          InputValidator.validateNormalizedValue(args.complexity, 'complexity');
        }
        const drums = this.generator.generateDrumPattern(args.style, args.complexity || 0.5);
        const currentDrum = await this.getCurrentPatternSafe();
        const newDrumPattern = currentDrum ? currentDrum + '\n' + drums : drums;
        await this.writePatternSafe(newDrumPattern);
        return `Generated ${args.style} drums`;
      
      case 'generate_bassline':
        InputValidator.validateRootNote(args.key);
        InputValidator.validateStringLength(args.style, 'style', 100, false);
        const bass = this.generator.generateBassline(args.key, args.style);
        const currentBass = await this.getCurrentPatternSafe();
        const newBassPattern = currentBass ? currentBass + '\n' + bass : bass;
        await this.writePatternSafe(newBassPattern);
        return `Generated ${args.style} bassline in ${args.key}`;
      
      case 'generate_melody':
        InputValidator.validateRootNote(args.root);
        InputValidator.validateScaleName(args.scale);
        if (args.length !== undefined) {
          InputValidator.validatePositiveInteger(args.length, 'length');
        }
        const scale = this.theory.generateScale(args.root, args.scale);
        const melody = this.generator.generateMelody(scale, args.length || 8);
        const currentMelody = await this.getCurrentPatternSafe();
        const newMelodyPattern = currentMelody ? currentMelody + '\n' + melody : melody;
        await this.writePatternSafe(newMelodyPattern);
        return `Generated melody in ${args.root} ${args.scale}`;
      
      // Music Theory - These don't require browser
      case 'generate_scale':
        InputValidator.validateRootNote(args.root);
        InputValidator.validateScaleName(args.scale);
        const scaleNotes = this.theory.generateScale(args.root, args.scale);
        return `${args.root} ${args.scale} scale: ${scaleNotes.join(', ')}`;
      
      case 'generate_chord_progression':
        InputValidator.validateRootNote(args.key);
        InputValidator.validateChordStyle(args.style);
        const progression = this.theory.generateChordProgression(args.key, args.style);
        const chordPattern = this.generator.generateChords(progression);
        const currentChords = await this.getCurrentPatternSafe();
        const newChordPattern = currentChords ? currentChords + '\n' + chordPattern : chordPattern;
        await this.writePatternSafe(newChordPattern);
        return `Generated ${args.style} progression in ${args.key}: ${progression}`;
      
      case 'generate_euclidean':
        InputValidator.validateEuclidean(args.hits, args.steps);
        if (args.sound) {
          InputValidator.validateStringLength(args.sound, 'sound', 100, false);
        }
        const euclidean = this.generator.generateEuclideanPattern(
          args.hits,
          args.steps,
          args.sound || 'bd'
        );
        const currentEuc = await this.getCurrentPatternSafe();
        const newEucPattern = currentEuc ? currentEuc + '\n' + euclidean : euclidean;
        await this.writePatternSafe(newEucPattern);
        return `Generated Euclidean rhythm (${args.hits}/${args.steps})`;
      
      case 'generate_polyrhythm':
        args.sounds.forEach((sound: string) => {
          InputValidator.validateStringLength(sound, 'sound', 100, false);
        });
        args.patterns.forEach((pattern: number) => {
          InputValidator.validatePositiveInteger(pattern, 'pattern');
        });
        const poly = this.generator.generatePolyrhythm(args.sounds, args.patterns);
        const currentPoly = await this.getCurrentPatternSafe();
        const newPolyPattern = currentPoly ? currentPoly + '\n' + poly : poly;
        await this.writePatternSafe(newPolyPattern);
        return `Generated polyrhythm`;
      
      case 'generate_fill':
        InputValidator.validateStringLength(args.style, 'style', 100, false);
        if (args.bars !== undefined) {
          InputValidator.validatePositiveInteger(args.bars, 'bars');
        }
        const fill = this.generator.generateFill(args.style, args.bars || 1);
        const currentFill = await this.getCurrentPatternSafe();
        const newFillPattern = currentFill ? currentFill + '\n' + fill : fill;
        await this.writePatternSafe(newFillPattern);
        return `Generated ${args.bars || 1} bar fill`;
      
      // Pattern Manipulation - These require browser
      case 'transpose':
        // Semitones can be positive or negative, just validate it's a number
        if (typeof args.semitones !== 'number' || !Number.isInteger(args.semitones)) {
          throw new Error('Semitones must be an integer');
        }
        const toTranspose = await this.getCurrentPatternSafe();
        const transposed = this.transposePattern(toTranspose, args.semitones);
        await this.writePatternSafe(transposed);
        return `Transposed ${args.semitones} semitones`;
      
      case 'reverse':
        const toReverse = await this.getCurrentPatternSafe();
        const reversed = toReverse + '.rev';
        await this.writePatternSafe(reversed);
        return 'Pattern reversed';
      
      case 'stretch':
        InputValidator.validateGain(args.factor); // Positive number, use gain validator for simplicity
        const toStretch = await this.getCurrentPatternSafe();
        const stretched = toStretch + `.slow(${args.factor})`;
        await this.writePatternSafe(stretched);
        return `Stretched by factor of ${args.factor}`;
      
      case 'humanize':
        if (args.amount !== undefined) {
          InputValidator.validateNormalizedValue(args.amount, 'amount');
        }
        const toHumanize = await this.getCurrentPatternSafe();
        const humanized = toHumanize + `.nudge(rand.range(-${args.amount || 0.01}, ${args.amount || 0.01}))`;
        await this.writePatternSafe(humanized);
        return 'Added human timing';
      
      case 'generate_variation':
        const toVary = await this.getCurrentPatternSafe();
        const varied = this.generator.generateVariation(toVary, args.type || 'subtle');
        await this.writePatternSafe(varied);
        return `Added ${args.type || 'subtle'} variation`;
      
      // Effects - These require browser
      case 'add_effect':
        InputValidator.validateStringLength(args.effect, 'effect', 100, false);
        if (args.params) {
          InputValidator.validateStringLength(args.params, 'params', 1000, true);
        }
        const currentEffect = await this.getCurrentPatternSafe();
        const withEffect = args.params
          ? currentEffect + `.${args.effect}(${args.params})`
          : currentEffect + `.${args.effect}()`;
        await this.writePatternSafe(withEffect);
        return `Added ${args.effect} effect`;
      
      case 'add_swing':
        InputValidator.validateNormalizedValue(args.amount, 'amount');
        const currentSwing = await this.getCurrentPatternSafe();
        const withSwing = currentSwing + `.swing(${args.amount})`;
        await this.writePatternSafe(withSwing);
        return `Added swing: ${args.amount}`;
      
      case 'set_tempo':
        InputValidator.validateBPM(args.bpm);
        const currentTempo = await this.getCurrentPatternSafe();
        const withTempo = `setcpm(${args.bpm})\n${currentTempo}`;
        await this.writePatternSafe(withTempo);
        return `Set tempo to ${args.bpm} BPM`;
      
      // Audio Analysis - Requires browser
      case 'analyze':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        return await this.controller.analyzeAudio();
      
      case 'analyze_spectrum':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        const spectrum = await this.controller.analyzeAudio();
        return spectrum.features || spectrum;
      
      case 'analyze_rhythm':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        const analysis = await this.controller.analyzeAudio();
        return {
          isPlaying: analysis.features?.isPlaying,
          tempo: 'Analysis pending implementation',
          pattern: 'Rhythm pattern analysis'
        };
      
      case 'detect_tempo':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        try {
          const tempoAnalysis = await this.controller.detectTempo();
          if (!tempoAnalysis || tempoAnalysis.bpm === 0) {
            return {
              bpm: 0,
              confidence: 0,
              message: 'No tempo detected. Ensure audio is playing and has a clear rhythmic pattern.'
            };
          }
          return {
            bpm: tempoAnalysis.bpm,
            confidence: Math.round(tempoAnalysis.confidence * 100) / 100,
            method: tempoAnalysis.method,
            message: `Detected ${tempoAnalysis.bpm} BPM with ${Math.round(tempoAnalysis.confidence * 100)}% confidence`
          };
        } catch (error: any) {
          return {
            bpm: 0,
            confidence: 0,
            error: error.message || 'Tempo detection failed'
          };
        }
      
      case 'detect_key':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        try {
          const keyAnalysis = await this.controller.detectKey();
          if (!keyAnalysis || keyAnalysis.confidence < 0.1) {
            return {
              key: 'Unknown',
              scale: 'unknown',
              confidence: 0,
              message: 'No clear key detected. Ensure audio is playing and has tonal content.'
            };
          }

          const result: any = {
            key: keyAnalysis.key,
            scale: keyAnalysis.scale,
            confidence: Math.round(keyAnalysis.confidence * 100) / 100,
            message: `Detected ${keyAnalysis.key} ${keyAnalysis.scale} with ${Math.round(keyAnalysis.confidence * 100)}% confidence`
          };

          // Include alternatives if available and confidence is moderate
          if (keyAnalysis.alternatives && keyAnalysis.alternatives.length > 0) {
            result.alternatives = keyAnalysis.alternatives.map((alt: any) => ({
              key: alt.key,
              scale: alt.scale,
              confidence: Math.round(alt.confidence * 100) / 100
            }));
          }

          return result;
        } catch (error: any) {
          return {
            key: 'Unknown',
            scale: 'unknown',
            confidence: 0,
            error: error.message || 'Key detection failed'
          };
        }

      case 'validate_pattern_runtime':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        InputValidator.validateStringLength(args.pattern, 'pattern', 10000, false);
        const validation = await this.controller.validatePatternRuntime(
          args.pattern,
          args.waitMs || 500
        );

        if (validation.valid) {
          return `✅ Pattern valid - no runtime errors detected`;
        } else {
          return `❌ Pattern has runtime errors:\n${validation.errors.join('\n')}\n` +
                 (validation.warnings.length > 0 ? `\nWarnings:\n${validation.warnings.join('\n')}` : '');
        }

      // Session Management
      case 'save':
        InputValidator.validateStringLength(args.name, 'name', 255, false);
        const toSave = await this.getCurrentPatternSafe();
        if (!toSave) {
          return 'No pattern to save';
        }
        await this.store.save(args.name, toSave, args.tags || []);
        return `Pattern saved as "${args.name}"`;
      
      case 'load':
        InputValidator.validateStringLength(args.name, 'name', 255, false);
        const saved = await this.store.load(args.name);
        if (saved) {
          await this.writePatternSafe(saved.content);
          return `Loaded pattern "${args.name}"`;
        }
        return `Pattern "${args.name}" not found`;
      
      case 'list':
        if (args?.tag) {
          InputValidator.validateStringLength(args.tag, 'tag', 100, false);
        }
        const patterns = await this.store.list(args?.tag);
        return patterns.map(p =>
          `• ${p.name} [${p.tags.join(', ')}] - ${p.timestamp}`
        ).join('\n') || 'No patterns found';
      
      case 'undo':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        if (this.undoStack.length > 0) {
          const currentUndo = await this.controller.getCurrentPattern();
          this.redoStack.push(currentUndo);
          // Enforce bounds to prevent memory leaks
          if (this.redoStack.length > this.MAX_HISTORY) {
            this.redoStack.shift();
          }
          const previous = this.undoStack.pop()!;
          await this.controller.writePattern(previous);
          return 'Undone';
        }
        return 'Nothing to undo';

      case 'redo':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        if (this.redoStack.length > 0) {
          const currentRedo = await this.controller.getCurrentPattern();
          this.undoStack.push(currentRedo);
          // Enforce bounds to prevent memory leaks
          if (this.undoStack.length > this.MAX_HISTORY) {
            this.undoStack.shift();
          }
          const next = this.redoStack.pop()!;
          await this.controller.writePattern(next);
          return 'Redone';
        }
        return 'Nothing to redo';

      // Pattern History (#41)
      case 'list_history':
        if (this.historyStack.length === 0) {
          return 'No pattern history yet. Make some edits to build history.';
        }

        const limit = args?.limit || 10;
        const recentHistory = this.historyStack.slice(-limit).reverse();

        return {
          count: this.historyStack.length,
          showing: recentHistory.length,
          entries: recentHistory.map(entry => ({
            id: entry.id,
            preview: entry.pattern.substring(0, 60) + (entry.pattern.length > 60 ? '...' : ''),
            chars: entry.pattern.length,
            action: entry.action,
            timestamp: this.formatTimeAgo(entry.timestamp)
          }))
        };

      case 'restore_history':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }

        const entryToRestore = this.historyStack.find(e => e.id === args.id);
        if (!entryToRestore) {
          return `History entry #${args.id} not found. Use list_history to see available entries.`;
        }

        // Save current state before restoring
        const currentBeforeRestore = await this.controller.getCurrentPattern();
        this.undoStack.push(currentBeforeRestore);
        if (this.undoStack.length > this.MAX_HISTORY) {
          this.undoStack.shift();
        }

        await this.controller.writePattern(entryToRestore.pattern);
        return `Restored pattern from history #${args.id} (${this.formatTimeAgo(entryToRestore.timestamp)})`;

      case 'compare_patterns':
        const entry1 = this.historyStack.find(e => e.id === args.id1);
        if (!entry1) {
          return `History entry #${args.id1} not found.`;
        }

        let pattern2: string;
        let label2: string;

        if (args.id2) {
          const entry2 = this.historyStack.find(e => e.id === args.id2);
          if (!entry2) {
            return `History entry #${args.id2} not found.`;
          }
          pattern2 = entry2.pattern;
          label2 = `#${args.id2}`;
        } else {
          pattern2 = await this.getCurrentPatternSafe();
          label2 = 'current';
        }

        const diff = this.generateDiff(entry1.pattern, pattern2);
        return {
          pattern1: { id: args.id1, chars: entry1.pattern.length },
          pattern2: { id: label2, chars: pattern2.length },
          diff: diff,
          summary: this.summarizeDiff(entry1.pattern, pattern2)
        };

      // Performance Monitoring
      case 'performance_report':
        const report = this.perfMonitor.getReport();
        const bottlenecks = this.perfMonitor.getBottlenecks(5);
        return `${report}\n\nTop 5 Bottlenecks:\n${JSON.stringify(bottlenecks, null, 2)}`;

      case 'memory_usage':
        const memory = this.perfMonitor.getMemoryUsage();
        return memory ? JSON.stringify(memory, null, 2) : 'Memory usage not available';

      // UX Tools - Browser Control (#37)
      case 'show_browser':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        return await this.controller.showBrowser();

      case 'screenshot':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        return await this.controller.takeScreenshot(args?.filename);

      // UX Tools - Status & Diagnostics (#39)
      case 'status':
        return this.controller.getStatus();

      case 'diagnostics':
        if (!this.isInitialized) {
          return {
            initialized: false,
            message: 'Browser not initialized. Run init first for full diagnostics.'
          };
        }
        return await this.controller.getDiagnostics();

      case 'show_errors':
        const errors = this.controller.getConsoleErrors();
        const warnings = this.controller.getConsoleWarnings();

        if (errors.length === 0 && warnings.length === 0) {
          return 'No errors or warnings captured.';
        }

        let result = '';
        if (errors.length > 0) {
          result += `❌ Errors (${errors.length}):\n${errors.map(e => `  • ${e}`).join('\n')}\n`;
        }
        if (warnings.length > 0) {
          result += `⚠️ Warnings (${warnings.length}):\n${warnings.map(w => `  • ${w}`).join('\n')}`;
        }
        return result.trim();

      // UX Tools - High-level Compose (#42, #73)
      case 'compose':
        InputValidator.validateStringLength(args.style, 'style', 100, false);
        if (args.key) {
          InputValidator.validateRootNote(args.key);
        }
        if (args.tempo !== undefined) {
          InputValidator.validateBPM(args.tempo);
        }

        // Auto-initialize if needed
        if (!this.isInitialized) {
          await this.controller.initialize();
          this.isInitialized = true;
        }

        // Generate pattern
        const composedPattern = this.generator.generateCompletePattern(
          args.style,
          args.key || 'C',
          args.tempo || this.getDefaultTempo(args.style)
        );

        // Write pattern
        await this.controller.writePattern(composedPattern);

        // Auto-play by default (unless explicitly set to false)
        const shouldPlay = args.auto_play !== false;
        if (shouldPlay) {
          await this.controller.play();
        }

        // Build response
        const composeResponse: {
          success: boolean;
          pattern: string;
          metadata: { style: string; bpm: number; key: string };
          status: string;
          message: string;
          feedback?: CreativeFeedback;
        } = {
          success: true,
          pattern: composedPattern.substring(0, 200) + (composedPattern.length > 200 ? '...' : ''),
          metadata: {
            style: args.style,
            bpm: args.tempo || this.getDefaultTempo(args.style),
            key: args.key || 'C'
          },
          status: shouldPlay ? 'playing' : 'ready',
          message: `Created ${args.style} pattern in ${args.key || 'C'}${shouldPlay ? ' - now playing' : ''}`
        };

        // Get AI feedback if requested (#73)
        if (args.get_feedback) {
          if (this.geminiService.isAvailable()) {
            try {
              const feedback = await this.geminiService.getCreativeFeedback(composedPattern);
              composeResponse.feedback = feedback;
              composeResponse.message += ` (AI feedback: ${feedback.complexity} complexity, estimated ${feedback.estimatedStyle})`;
            } catch (error: any) {
              this.logger.warn('Failed to get AI feedback for compose', error);
              // Don't fail the whole operation, just note the feedback failure
              composeResponse.message += ' (AI feedback unavailable)';
            }
          } else {
            composeResponse.message += ' (AI feedback requires GEMINI_API_KEY)';
          }
        }

        return composeResponse;

      // AI Feedback Tools (#67)
      case 'get_pattern_feedback':
        return await this.getPatternFeedback(args?.includeAudio || false, args?.style);

      // Audio Capture Tools (#72)
      case 'start_audio_capture':
        return await this.startAudioCapture(args?.format, args?.maxDuration);

      case 'stop_audio_capture':
        return await this.stopAudioCapture();

      case 'capture_audio_sample':
        return await this.captureAudioSampleTool(args?.duration);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private transposePattern(pattern: string, semitones: number): string {
    // Simple transpose implementation - would need more sophisticated parsing
    return pattern.replace(/([a-g][#b]?)(\d)/gi, (match, note, octave) => {
      const noteMap: Record<string, number> = {
        'c': 0, 'c#': 1, 'd': 2, 'd#': 3, 'e': 4, 'f': 5,
        'f#': 6, 'g': 7, 'g#': 8, 'a': 9, 'a#': 10, 'b': 11
      };

      const currentNote = note.toLowerCase();
      const noteValue = noteMap[currentNote] || 0;
      const newNoteValue = (noteValue + semitones + 12) % 12;
      const noteNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
      const newOctave = parseInt(octave) + Math.floor((noteValue + semitones) / 12);

      return noteNames[newNoteValue] + newOctave;
    });
  }

  /**
   * Gets the default tempo for a given music style
   * @param style - Music style/genre
   * @returns Default BPM for the style
   */
  private getDefaultTempo(style: string): number {
    const tempoMap: Record<string, number> = {
      'techno': 130,
      'house': 125,
      'dnb': 174,
      'drum and bass': 174,
      'ambient': 80,
      'trap': 140,
      'jungle': 160,
      'jazz': 110,
      'experimental': 120,
      'dubstep': 140,
      'trance': 138,
      'breakbeat': 130,
      'garage': 130,
      'electro': 128,
      'downtempo': 90,
      'idm': 115
    };

    return tempoMap[style.toLowerCase()] || 120;
  }

  /**
   * Formats a timestamp as human-readable "time ago" string
   * @param date - Date to format
   * @returns Human-readable string like "2m ago" or "1h ago"
   */
  private formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  /**
   * Generates a simple line-by-line diff between two patterns
   * @param pattern1 - First pattern
   * @param pattern2 - Second pattern
   * @returns Diff output showing additions and removals
   */
  private generateDiff(pattern1: string, pattern2: string): string[] {
    const lines1 = pattern1.split('\n');
    const lines2 = pattern2.split('\n');
    const diff: string[] = [];

    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';

      if (line1 === line2) {
        diff.push(`  ${line1}`);
      } else {
        if (line1) diff.push(`- ${line1}`);
        if (line2) diff.push(`+ ${line2}`);
      }
    }

    return diff;
  }

  /**
   * Summarizes differences between two patterns
   * @param pattern1 - First pattern
   * @param pattern2 - Second pattern
   * @returns Summary of differences
   */
  private summarizeDiff(pattern1: string, pattern2: string): {
    linesAdded: number;
    linesRemoved: number;
    linesChanged: number;
    charsDiff: number;
  } {
    const lines1 = pattern1.split('\n');
    const lines2 = pattern2.split('\n');

    let linesAdded = 0;
    let linesRemoved = 0;
    let linesChanged = 0;

    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i];
      const line2 = lines2[i];

      if (line1 === undefined && line2 !== undefined) {
        linesAdded++;
      } else if (line1 !== undefined && line2 === undefined) {
        linesRemoved++;
      } else if (line1 !== line2) {
        linesChanged++;
      }
    }

    return {
      linesAdded,
      linesRemoved,
      linesChanged,
      charsDiff: pattern2.length - pattern1.length
    };
  }

  /**
   * Gets AI-powered creative feedback on the current pattern
   * Uses Google Gemini for pattern analysis and optionally audio analysis
   * @param includeAudio - Whether to include audio analysis (plays pattern briefly)
   * @param style - Optional style hint for context
   * @returns Feedback object with pattern_analysis and optionally audio_analysis
   */
  private async getPatternFeedback(
    includeAudio: boolean,
    style?: string
  ): Promise<{
    pattern_analysis?: CreativeFeedback;
    audio_analysis?: AudioFeedback;
    error?: string;
    gemini_available: boolean;
  }> {
    // Check if Gemini is available
    if (!this.geminiService.isAvailable()) {
      return {
        gemini_available: false,
        error: 'Gemini API not configured. Set GEMINI_API_KEY environment variable to enable AI feedback.'
      };
    }

    // Get current pattern
    const pattern = await this.getCurrentPatternSafe();
    if (!pattern || pattern.trim().length === 0) {
      return {
        gemini_available: true,
        error: 'No pattern to analyze. Write a pattern first.'
      };
    }

    const result: {
      pattern_analysis?: CreativeFeedback;
      audio_analysis?: AudioFeedback;
      error?: string;
      gemini_available: boolean;
    } = {
      gemini_available: true
    };

    // Get pattern analysis
    try {
      result.pattern_analysis = await this.geminiService.getCreativeFeedback(pattern);
    } catch (error: any) {
      this.logger.error('Pattern feedback failed', error);

      // Handle rate limit errors gracefully
      if (error.message?.includes('rate limit') || error.message?.includes('Rate limit')) {
        return {
          gemini_available: true,
          error: 'Rate limit exceeded. Wait a minute before requesting more feedback.'
        };
      }

      result.error = `Pattern analysis failed: ${error.message}`;
    }

    // Get audio analysis if requested
    if (includeAudio && this.isInitialized) {
      try {
        // Capture audio by playing the pattern briefly
        const audioBlob = await this.captureAudioSample();

        if (audioBlob) {
          result.audio_analysis = await this.geminiService.analyzeAudio(audioBlob, {
            style: style,
            duration: 5
          });
        } else {
          this.logger.warn('Audio capture returned no data');
        }
      } catch (error: any) {
        this.logger.error('Audio analysis failed', error);

        // Don't fail the whole request if audio analysis fails
        if (!result.error) {
          result.error = `Audio analysis failed: ${error.message}`;
        }
      }
    } else if (includeAudio && !this.isInitialized) {
      if (!result.error) {
        result.error = 'Audio analysis requires browser initialization. Run init first or set includeAudio to false.';
      }
    }

    return result;
  }

  /**
   * Captures a brief audio sample from the playing pattern
   * Plays the pattern for ~5 seconds and captures audio using MediaRecorder
   * @returns Audio blob or null if capture failed
   */
  private async captureAudioSample(): Promise<Blob | null> {
    if (!this._page) {
      this.logger.warn('Cannot capture audio: page not available');
      return null;
    }

    const page = this.controller.page;
    if (!page) {
      this.logger.warn('Cannot capture audio: controller page not available');
      return null;
    }

    try {
      // Inject audio capture code and start recording
      const audioData = await page.evaluate(async () => {
        return new Promise<string | null>((resolve) => {
          const analyzer = (window as any).strudelAudioAnalyzer;

          if (!analyzer || !analyzer.analyser) {
            resolve(null);
            return;
          }

          try {
            const audioCtx = analyzer.analyser.context as AudioContext;
            const destination = audioCtx.createMediaStreamDestination();

            // Connect analyzer to destination for recording
            analyzer.analyser.connect(destination);

            const mediaRecorder = new MediaRecorder(destination.stream, {
              mimeType: 'audio/webm;codecs=opus'
            });

            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                chunks.push(e.data);
              }
            };

            mediaRecorder.onstop = async () => {
              // Disconnect to avoid audio routing issues
              try {
                analyzer.analyser.disconnect(destination);
              } catch (e) {
                // Ignore disconnect errors
              }

              if (chunks.length === 0) {
                resolve(null);
                return;
              }

              const blob = new Blob(chunks, { type: 'audio/webm' });

              // Convert to base64 for transport
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result as string;
                resolve(base64.split(',')[1] || null);
              };
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            };

            // Start recording
            mediaRecorder.start();

            // Record for 5 seconds
            setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            }, 5000);

          } catch (e) {
            resolve(null);
          }
        });
      });

      if (!audioData) {
        return null;
      }

      // Convert base64 back to Blob
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Blob([bytes], { type: 'audio/webm' });

    } catch (error: any) {
      this.logger.error('Audio capture failed', error);
      return null;
    }
  }

  /**
   * Getter for page access in audio capture
   */
  private get _page() {
    return this.controller.page;
  }

  /**
   * Lazily initializes and returns the AudioCaptureService
   * Injects recorder into page on first use
   */
  private async getAudioCaptureService(): Promise<AudioCaptureService> {
    if (!this.isInitialized || !this._page) {
      throw new Error('Browser not initialized. Run init first.');
    }

    if (!this.audioCaptureService) {
      this.audioCaptureService = new AudioCaptureService();
      await this.audioCaptureService.injectRecorder(this._page);
    }

    return this.audioCaptureService;
  }

  /**
   * Starts audio capture from Strudel output
   * @param format - Audio format ('webm' or 'opus')
   * @param maxDuration - Maximum capture duration in ms (optional)
   * @returns Status message
   */
  private async startAudioCapture(
    format?: 'webm' | 'opus',
    maxDuration?: number
  ): Promise<{ success: boolean; message: string; format?: string }> {
    try {
      const captureService = await this.getAudioCaptureService();

      if (captureService.isCapturing()) {
        return {
          success: false,
          message: 'Audio capture already in progress. Stop it first.'
        };
      }

      await captureService.startCapture(this._page!, { format });

      return {
        success: true,
        message: 'Audio capture started. Use stop_audio_capture to get the recorded audio.',
        format: format || 'webm'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to start audio capture: ${error.message}`
      };
    }
  }

  /**
   * Stops audio capture and returns base64-encoded audio data
   * @returns Captured audio as base64 with metadata
   */
  private async stopAudioCapture(): Promise<{
    success: boolean;
    message: string;
    audio?: string;
    duration?: number;
    format?: string;
  }> {
    try {
      const captureService = await this.getAudioCaptureService();

      if (!captureService.isCapturing()) {
        return {
          success: false,
          message: 'No audio capture in progress. Start capture first.'
        };
      }

      const result = await captureService.stopCapture(this._page!);

      // Convert Blob to base64
      const arrayBuffer = await result.blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      return {
        success: true,
        message: `Captured ${result.duration}ms of audio`,
        audio: base64,
        duration: result.duration,
        format: result.format
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to stop audio capture: ${error.message}`
      };
    }
  }

  /**
   * Captures a fixed-duration audio sample (MCP tool handler)
   * @param duration - Duration in milliseconds (default: 5000)
   * @returns Captured audio as base64 with metadata
   */
  private async captureAudioSampleTool(duration?: number): Promise<{
    success: boolean;
    message: string;
    audio?: string;
    duration?: number;
    format?: string;
  }> {
    const durationMs = duration || 5000;

    // Validate duration
    if (durationMs < 100 || durationMs > 60000) {
      return {
        success: false,
        message: 'Duration must be between 100ms and 60000ms (1 minute)'
      };
    }

    try {
      const captureService = await this.getAudioCaptureService();

      if (captureService.isCapturing()) {
        return {
          success: false,
          message: 'Audio capture already in progress. Stop it first.'
        };
      }

      const result = await captureService.captureForDuration(this._page!, durationMs);

      // Convert Blob to base64
      const arrayBuffer = await result.blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      return {
        success: true,
        message: `Captured ${result.duration}ms audio sample`,
        audio: base64,
        duration: result.duration,
        format: result.format
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to capture audio sample: ${error.message}`
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Enhanced Strudel MCP server v2.0.1 running (fixed)');
    
    process.on('SIGINT', async () => {
      this.logger.info('Shutting down...');
      await this.controller.cleanup();
      process.exit(0);
    });
  }
}