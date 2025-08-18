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

export class EnhancedMCPServer {
  private server: Server;
  private controller: StrudelController;
  private store: PatternStore;
  private theory: MusicTheory;
  private generator: PatternGenerator;
  private logger: Logger;
  private sessionHistory: string[] = [];
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  constructor() {
    this.server = new Server(
      {
        name: 'strudel-mcp-enhanced',
        version: '2.0.0',
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

  private async executeTool(name: string, args: any): Promise<any> {
    // Save current state for undo
    if (['write', 'append', 'insert', 'replace', 'clear'].includes(name)) {
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
        return await this.controller.initialize();
      
      case 'write':
        return await this.controller.writePattern(args.pattern);
      
      case 'append':
        const current = await this.controller.getCurrentPattern();
        return await this.controller.writePattern(current + '\n' + args.code);
      
      case 'insert':
        const lines = (await this.controller.getCurrentPattern()).split('\n');
        lines.splice(args.position, 0, args.code);
        return await this.controller.writePattern(lines.join('\n'));
      
      case 'replace':
        const pattern = await this.controller.getCurrentPattern();
        const replaced = pattern.replace(args.search, args.replace);
        return await this.controller.writePattern(replaced);
      
      case 'play':
        return await this.controller.play();
      
      case 'pause':
      case 'stop':
        return await this.controller.stop();
      
      case 'clear':
        return await this.controller.writePattern('');
      
      case 'get_pattern':
        return await this.controller.getCurrentPattern();
      
      // Pattern Generation
      case 'generate_pattern':
        const generated = this.generator.generateCompletePattern(
          args.style,
          args.key || 'C',
          args.bpm || 120
        );
        await this.controller.writePattern(generated);
        return `Generated ${args.style} pattern`;
      
      case 'generate_drums':
        const drums = this.generator.generateDrumPattern(args.style, args.complexity || 0.5);
        const currentDrum = await this.controller.getCurrentPattern();
        await this.controller.writePattern(currentDrum + '\n' + drums);
        return `Added ${args.style} drums`;
      
      case 'generate_bassline':
        const bass = this.generator.generateBassline(args.key, args.style);
        const currentBass = await this.controller.getCurrentPattern();
        await this.controller.writePattern(currentBass + '\n' + bass);
        return `Added ${args.style} bassline in ${args.key}`;
      
      case 'generate_melody':
        const scale = this.theory.generateScale(args.root, args.scale);
        const melody = this.generator.generateMelody(scale, args.length || 8);
        const currentMelody = await this.controller.getCurrentPattern();
        await this.controller.writePattern(currentMelody + '\n' + melody);
        return `Added melody in ${args.root} ${args.scale}`;
      
      // Music Theory
      case 'generate_scale':
        const scaleNotes = this.theory.generateScale(args.root, args.scale);
        return `${args.root} ${args.scale} scale: ${scaleNotes.join(', ')}`;
      
      case 'generate_chord_progression':
        const progression = this.theory.generateChordProgression(args.key, args.style);
        const chordPattern = this.generator.generateChords(progression);
        const currentChords = await this.controller.getCurrentPattern();
        await this.controller.writePattern(currentChords + '\n' + chordPattern);
        return `Added ${args.style} progression in ${args.key}`;
      
      case 'generate_euclidean':
        const euclidean = this.generator.generateEuclideanPattern(
          args.hits, 
          args.steps, 
          args.sound || 'bd'
        );
        const currentEuc = await this.controller.getCurrentPattern();
        await this.controller.writePattern(currentEuc + '\n' + euclidean);
        return `Added Euclidean rhythm (${args.hits}/${args.steps})`;
      
      case 'generate_polyrhythm':
        const poly = this.generator.generatePolyrhythm(args.sounds, args.patterns);
        const currentPoly = await this.controller.getCurrentPattern();
        await this.controller.writePattern(currentPoly + '\n' + poly);
        return `Added polyrhythm`;
      
      case 'generate_fill':
        const fill = this.generator.generateFill(args.style, args.bars || 1);
        const currentFill = await this.controller.getCurrentPattern();
        await this.controller.writePattern(currentFill + '\n' + fill);
        return `Added ${args.bars || 1} bar fill`;
      
      // Pattern Manipulation
      case 'transpose':
        const toTranspose = await this.controller.getCurrentPattern();
        const transposed = this.transposePattern(toTranspose, args.semitones);
        await this.controller.writePattern(transposed);
        return `Transposed ${args.semitones} semitones`;
      
      case 'reverse':
        const toReverse = await this.controller.getCurrentPattern();
        const reversed = toReverse + '.rev';
        await this.controller.writePattern(reversed);
        return 'Pattern reversed';
      
      case 'stretch':
        const toStretch = await this.controller.getCurrentPattern();
        const stretched = toStretch + `.slow(${args.factor})`;
        await this.controller.writePattern(stretched);
        return `Stretched by factor of ${args.factor}`;
      
      case 'humanize':
        const toHumanize = await this.controller.getCurrentPattern();
        const humanized = toHumanize + `.nudge(rand.range(-${args.amount || 0.01}, ${args.amount || 0.01}))`;
        await this.controller.writePattern(humanized);
        return 'Added human timing';
      
      case 'generate_variation':
        const toVary = await this.controller.getCurrentPattern();
        const varied = this.generator.generateVariation(toVary, args.type || 'subtle');
        await this.controller.writePattern(varied);
        return `Added ${args.type || 'subtle'} variation`;
      
      // Effects
      case 'add_effect':
        const currentEffect = await this.controller.getCurrentPattern();
        const withEffect = args.params 
          ? currentEffect + `.${args.effect}(${args.params})`
          : currentEffect + `.${args.effect}()`;
        await this.controller.writePattern(withEffect);
        return `Added ${args.effect} effect`;
      
      case 'add_swing':
        const currentSwing = await this.controller.getCurrentPattern();
        const withSwing = currentSwing + `.swing(${args.amount})`;
        await this.controller.writePattern(withSwing);
        return `Added swing: ${args.amount}`;
      
      case 'set_tempo':
        const currentTempo = await this.controller.getCurrentPattern();
        const withTempo = `setcpm(${args.bpm})\n${currentTempo}`;
        await this.controller.writePattern(withTempo);
        return `Set tempo to ${args.bpm} BPM`;
      
      // Audio Analysis
      case 'analyze':
        return await this.controller.analyzeAudio();
      
      case 'analyze_spectrum':
        const spectrum = await this.controller.analyzeAudio();
        return spectrum.features || spectrum;
      
      case 'analyze_rhythm':
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
        const toSave = await this.controller.getCurrentPattern();
        await this.store.save(args.name, toSave, args.tags || []);
        return `Pattern saved as "${args.name}"`;
      
      case 'load':
        const saved = await this.store.load(args.name);
        if (saved) {
          await this.controller.writePattern(saved.content);
          return `Loaded pattern "${args.name}"`;
        }
        return `Pattern "${args.name}" not found`;
      
      case 'list':
        const patterns = await this.store.list(args?.tag);
        return patterns.map(p => 
          `• ${p.name} [${p.tags.join(', ')}] - ${p.timestamp}`
        ).join('\n') || 'No patterns found';
      
      case 'undo':
        if (this.undoStack.length > 0) {
          const currentUndo = await this.controller.getCurrentPattern();
          this.redoStack.push(currentUndo);
          const previous = this.undoStack.pop()!;
          await this.controller.writePattern(previous);
          return 'Undone';
        }
        return 'Nothing to undo';
      
      case 'redo':
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
    this.logger.info('Enhanced Strudel MCP server v2.0 running');
    
    process.on('SIGINT', async () => {
      this.logger.info('Shutting down...');
      await this.controller.cleanup();
      process.exit(0);
    });
  }
}