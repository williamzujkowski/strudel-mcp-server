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
import { readFileSync, existsSync } from 'fs';
import { Logger } from '../utils/Logger.js';

const configPath = './config.json';
const config = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, 'utf-8'))
  : { headless: false };

export class EnhancedMCPServerFixed {
  private server: Server;
  private controller: StrudelController;
  private store: PatternStore;
  private theory: MusicTheory;
  private generator: PatternGenerator;
  private logger: Logger;
  private sessionHistory: string[] = [];
  private undoStack: string[] = [];
  private redoStack: string[] = [];
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
    this.logger = new Logger();
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
        description: 'Write pattern to editor',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Pattern code' }
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
        name: 'update',
        description: 'Update pattern while playing (clicks update button)',
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
        description: 'Generate complete pattern from style',
        inputSchema: {
          type: 'object',
          properties: {
            style: { type: 'string', description: 'Music style (techno/house/dnb/ambient/etc)' },
            key: { type: 'string', description: 'Musical key' },
            bpm: { type: 'number', description: 'Tempo in BPM' }
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
        let result = await this.executeTool(name, args);

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
      'write', 'append', 'insert', 'replace', 'play', 'update', 'pause', 'stop',
      'clear', 'get_pattern', 'analyze', 'analyze_spectrum', 'analyze_rhythm',
      'transpose', 'reverse', 'stretch', 'humanize', 'generate_variation',
      'add_effect', 'add_swing', 'set_tempo', 'save', 'undo', 'redo'
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

    // Save current state for undo (only if initialized)
    if (['write', 'append', 'insert', 'replace', 'clear'].includes(name) && this.isInitialized) {
      try {
        const current = await this.controller.getCurrentPattern();
        this.undoStack.push(current);
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
        return await this.writePatternSafe(args.pattern);

      case 'append':
        const current = await this.getCurrentPatternSafe();
        return await this.writePatternSafe(current + '\n' + args.code);

      case 'insert':
        const lines = (await this.getCurrentPatternSafe()).split('\n');
        lines.splice(args.position, 0, args.code);
        return await this.writePatternSafe(lines.join('\n'));

      case 'replace':
        const pattern = await this.getCurrentPatternSafe();
        const replaced = pattern.replace(args.search, args.replace);
        return await this.writePatternSafe(replaced);

      case 'play':
        return await this.controller.play();

      case 'update':
        return await this.controller.update();

      case 'pause':
      case 'stop':
        return await this.controller.stop();

      case 'clear':
        return await this.writePatternSafe('');

      case 'get_pattern':
        return await this.getCurrentPatternSafe();

      // Pattern Generation - These can work without browser
      case 'generate_pattern':
        const generated = this.generator.generateCompletePattern(
          args.style,
          args.key || 'C',
          args.bpm || 120
        );
        await this.writePatternSafe(generated);
        return `Generated ${args.style} pattern`;

      case 'generate_drums':
        const drums = this.generator.generateDrumPattern(args.style, args.complexity || 0.5);
        const currentDrum = await this.getCurrentPatternSafe();
        const newDrumPattern = currentDrum ? currentDrum + '\n' + drums : drums;
        await this.writePatternSafe(newDrumPattern);
        return `Generated ${args.style} drums`;

      case 'generate_bassline':
        const bass = this.generator.generateBassline(args.key, args.style);
        const currentBass = await this.getCurrentPatternSafe();
        const newBassPattern = currentBass ? currentBass + '\n' + bass : bass;
        await this.writePatternSafe(newBassPattern);
        return `Generated ${args.style} bassline in ${args.key}`;

      case 'generate_melody':
        const scale = this.theory.generateScale(args.root, args.scale);
        const melody = this.generator.generateMelody(scale, args.length || 8);
        const currentMelody = await this.getCurrentPatternSafe();
        const newMelodyPattern = currentMelody ? currentMelody + '\n' + melody : melody;
        await this.writePatternSafe(newMelodyPattern);
        return `Generated melody in ${args.root} ${args.scale}`;

      // Music Theory - These don't require browser
      case 'generate_scale':
        const scaleNotes = this.theory.generateScale(args.root, args.scale);
        return `${args.root} ${args.scale} scale: ${scaleNotes.join(', ')}`;

      case 'generate_chord_progression':
        const progression = this.theory.generateChordProgression(args.key, args.style);
        const chordPattern = this.generator.generateChords(progression);
        const currentChords = await this.getCurrentPatternSafe();
        const newChordPattern = currentChords ? currentChords + '\n' + chordPattern : chordPattern;
        await this.writePatternSafe(newChordPattern);
        return `Generated ${args.style} progression in ${args.key}: ${progression}`;

      case 'generate_euclidean':
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
        const poly = this.generator.generatePolyrhythm(args.sounds, args.patterns);
        const currentPoly = await this.getCurrentPatternSafe();
        const newPolyPattern = currentPoly ? currentPoly + '\n' + poly : poly;
        await this.writePatternSafe(newPolyPattern);
        return `Generated polyrhythm`;

      case 'generate_fill':
        const fill = this.generator.generateFill(args.style, args.bars || 1);
        const currentFill = await this.getCurrentPatternSafe();
        const newFillPattern = currentFill ? currentFill + '\n' + fill : fill;
        await this.writePatternSafe(newFillPattern);
        return `Generated ${args.bars || 1} bar fill`;

      // Pattern Manipulation - These require browser
      case 'transpose':
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
        const toStretch = await this.getCurrentPatternSafe();
        const stretched = toStretch + `.slow(${args.factor})`;
        await this.writePatternSafe(stretched);
        return `Stretched by factor of ${args.factor}`;

      case 'humanize':
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
        const currentEffect = await this.getCurrentPatternSafe();
        const withEffect = args.params
          ? currentEffect + `.${args.effect}(${args.params})`
          : currentEffect + `.${args.effect}()`;
        await this.writePatternSafe(withEffect);
        return `Added ${args.effect} effect`;

      case 'add_swing':
        const currentSwing = await this.getCurrentPatternSafe();
        const withSwing = currentSwing + `.swing(${args.amount})`;
        await this.writePatternSafe(withSwing);
        return `Added swing: ${args.amount}`;

      case 'set_tempo':
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
        return 'Tempo detection: Coming soon';

      case 'detect_key':
        return 'Key detection: Coming soon';

      // Session Management
      case 'save':
        const toSave = await this.getCurrentPatternSafe();
        if (!toSave) {
          return 'No pattern to save';
        }
        await this.store.save(args.name, toSave, args.tags || []);
        return `Pattern saved as "${args.name}"`;

      case 'load':
        const saved = await this.store.load(args.name);
        if (saved) {
          await this.writePatternSafe(saved.content);
          return `Loaded pattern "${args.name}"`;
        }
        return `Pattern "${args.name}" not found`;

      case 'list':
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
          const next = this.redoStack.pop()!;
          await this.controller.writePattern(next);
          return 'Redone';
        }
        return 'Nothing to redo';

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