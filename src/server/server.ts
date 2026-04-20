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
import { MIDIExportService } from '../services/MIDIExportService.js';
import { SessionManager } from '../services/SessionManager.js';
import { readFileSync, existsSync } from 'fs';
import { Logger } from '../utils/Logger.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { InputValidator } from '../utils/InputValidator.js';
import { StrudelEngine } from '../services/StrudelEngine.js';
import { diagnosticsModule } from './tools/diagnostics.js';
import { playbackModule } from './tools/playback.js';
import { storageModule } from './tools/storage.js';
import { historyModule } from './tools/history.js';
import { analysisModule } from './tools/analysis.js';
import { editorModule } from './tools/editor.js';
import { transformModule } from './tools/transform.js';
import { generateModule } from './tools/generate.js';
import { sessionModule } from './tools/session.js';
import { captureModule } from './tools/capture.js';
import { aiModule } from './tools/ai.js';
import type { ToolContext, HistoryEntry } from './tools/types.js';

const configPath = './config.json';
const config = existsSync(configPath) 
  ? JSON.parse(readFileSync(configPath, 'utf-8'))
  : { headless: false };

/** Energy level configuration for set_energy tool (#81) */
// MOOD_PROFILES + ENERGY_LEVELS moved to src/server/tools/transform.ts
// alongside the shift_mood / set_energy / refine handlers that use them.

export class StrudelMCPServer {
  private server: Server;
  private controller: StrudelController;
  private store: PatternStore;
  private theory: MusicTheory;
  private generator: PatternGenerator;
  private geminiService: GeminiService;
  private audioCaptureService: AudioCaptureService | null = null;
  private midiExportService: MIDIExportService;
  private sessionManager: SessionManager;
  private logger: Logger;
  private perfMonitor: PerformanceMonitor;
  private strudelEngine: StrudelEngine;
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
        name: 'live-coding-music-mcp',
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
    this.midiExportService = new MIDIExportService();
    this.sessionManager = new SessionManager(config.headless);
    this.logger = new Logger();
    this.perfMonitor = new PerformanceMonitor();
    this.strudelEngine = new StrudelEngine();
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
      // write, append, insert, replace, clear, get_pattern —
      // extracted to src/server/tools/editor.ts (#104)
      ...editorModule.tools,
      // play, pause, stop — extracted to src/server/tools/playback.ts (#104)
      ...playbackModule.tools,

      // transform + effect + shape + set_tempo — extracted to src/server/tools/transform.ts (#104)
      ...transformModule.tools,

      // generate_pattern, generate_drums, generate_bassline, generate_melody,
      // generate_scale, generate_chord_progression, generate_euclidean,
      // generate_polyrhythm, generate_fill — extracted to src/server/tools/generate.ts (#104)
      ...generateModule.tools,

      // Audio Analysis + runtime validation — extracted to src/server/tools/analysis.ts (#104)
      ...analysisModule.tools,

      // add_effect, remove_effect, set_tempo, add_swing, apply_scale,
      // shift_mood — all handled by transformModule (see above).

      // save, load, list — extracted to src/server/tools/storage.ts (#104)
      ...storageModule.tools,
      // undo, redo, list_history, restore_history, compare_patterns
      // — extracted to src/server/tools/history.ts (#104)
      ...historyModule.tools,

      // generate_scale, generate_chord_progression, generate_euclidean,
      // generate_polyrhythm, generate_fill — handled by generateModule (above).

      // Performance, diagnostics, screenshots — extracted to src/server/tools/diagnostics.ts (#104)
      ...diagnosticsModule.tools,

      // UX Tools - Browser Control (#37)
      {
        name: 'show_browser',
        description: 'Bring browser window to foreground for visual feedback',
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

      // get_pattern_feedback, suggest_pattern_from_audio, jam_with —
      // extracted to src/server/tools/ai.ts (#104)
      ...aiModule.tools,

      // start_audio_capture, stop_audio_capture, capture_audio_sample,
      // export_midi — extracted to src/server/tools/capture.ts (#104)
      ...captureModule.tools,

      // create_session, destroy_session, list_sessions, switch_session —
      // extracted to src/server/tools/session.ts (#104)
      ...sessionModule.tools,

      // refine, set_energy — handled by transformModule (see above).
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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Tool execution failed: ${name}`, { error: message });
        return {
          content: [{
            type: 'text',
            text: `Error: ${message}`
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

  /**
   * Gets a StrudelController for the specified session, or the default session.
   * Falls back to the legacy single controller if no sessions exist.
   * @param sessionId - Optional session ID. Uses default session if not specified.
   * @returns StrudelController for the session
   * @throws {Error} If session doesn't exist
   */
  private getControllerForSession(sessionId?: string): StrudelController {
    // If session_id is specified, use the SessionManager
    if (sessionId) {
      const controller = this.sessionManager.getSession(sessionId);
      if (!controller) {
        throw new Error(`Session '${sessionId}' not found. Create it first with create_session.`);
      }
      return controller;
    }

    // If sessions exist and there's a default, use it
    const defaultController = this.sessionManager.getDefaultSession();
    if (defaultController) {
      return defaultController;
    }

    // Fall back to legacy single controller for backwards compatibility
    return this.controller;
  }

  /**
   * Checks if a session exists (or default/legacy controller is initialized)
   * @param sessionId - Optional session ID
   * @returns True if controller is available
   */
  private hasSession(sessionId?: string): boolean {
    if (sessionId) {
      return this.sessionManager.getSession(sessionId) !== undefined;
    }
    // Check if we have a default session or the legacy controller is initialized
    return this.sessionManager.getDefaultSession() !== undefined || this.isInitialized;
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

    // Delegate to extracted per-domain tool modules before the big switch.
    // Part of the #104 file split — each module owns its own definitions
    // and handlers. server.ts keeps the protocol + state-tracking shell.
    const ctx: ToolContext = {
      controller: this.controller,
      perfMonitor: this.perfMonitor,
      store: this.store,
      generator: this.generator,
      theory: this.theory,
      sessionManager: this.sessionManager,
      geminiService: this.geminiService,
      strudelEngine: this.strudelEngine,
      midiExportService: this.midiExportService,
      getAudioCaptureService: () => this.getAudioCaptureService(),
      history: {
        undoStack: this.undoStack,
        redoStack: this.redoStack,
        historyStack: this.historyStack,
        maxHistory: this.MAX_HISTORY,
      },
      logger: this.logger,
      isInitialized: () => this.isInitialized,
      getCurrentPatternSafe: () => this.getCurrentPatternSafe(),
      writePatternSafe: (p: string) => this.writePatternSafe(p),
    };
    if (diagnosticsModule.toolNames.has(name)) {
      return await diagnosticsModule.execute(name, args, ctx);
    }
    if (playbackModule.toolNames.has(name)) {
      return await playbackModule.execute(name, args, ctx);
    }
    if (storageModule.toolNames.has(name)) {
      return await storageModule.execute(name, args, ctx);
    }
    if (historyModule.toolNames.has(name)) {
      return await historyModule.execute(name, args, ctx);
    }
    if (analysisModule.toolNames.has(name)) {
      return await analysisModule.execute(name, args, ctx);
    }
    if (editorModule.toolNames.has(name)) {
      return await editorModule.execute(name, args, ctx);
    }
    if (transformModule.toolNames.has(name)) {
      return await transformModule.execute(name, args, ctx);
    }
    if (generateModule.toolNames.has(name)) {
      return await generateModule.execute(name, args, ctx);
    }
    if (sessionModule.toolNames.has(name)) {
      return await sessionModule.execute(name, args, ctx);
    }
    if (captureModule.toolNames.has(name)) {
      return await captureModule.execute(name, args, ctx);
    }
    if (aiModule.toolNames.has(name)) {
      return await aiModule.execute(name, args, ctx);
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
      
      // write, append, insert, replace, clear, get_pattern
      //   — handled by editorModule above.
      // play, pause, stop — handled by playbackModule above.

      // Pattern + music-theory generation — all handled by
      // generateModule above. See src/server/tools/generate.ts.
      
      // Pattern manipulation + effects + tempo — all handled by
      // transformModule above. See src/server/tools/transform.ts.
      
      // analyze, analyze_spectrum, analyze_rhythm, detect_tempo, detect_key,
      // validate_pattern_runtime — handled by analysisModule above.

      // Local Pattern Tools (#83) - No browser required
      case 'validate_pattern_local':
        InputValidator.validateStringLength(args.pattern, 'pattern', 10000, false);
        const localValidation = this.strudelEngine.validate(args.pattern);
        return {
          valid: localValidation.valid,
          errors: localValidation.errors,
          warnings: localValidation.warnings,
          suggestions: localValidation.suggestions,
          errorLocation: localValidation.errorLocation,
          message: localValidation.valid
            ? '✅ Pattern is valid'
            : `❌ Pattern has ${localValidation.errors.length} error(s)`
        };

      case 'analyze_pattern_local':
        InputValidator.validateStringLength(args.pattern, 'pattern', 10000, false);
        const patternMetadata = this.strudelEngine.analyzePattern(args.pattern);
        return {
          ...patternMetadata,
          message: `Pattern analysis: ${patternMetadata.eventsPerCycle} events/cycle, ` +
                   `complexity ${(patternMetadata.complexity * 100).toFixed(0)}%` +
                   (patternMetadata.bpm ? `, ${patternMetadata.bpm} BPM` : '')
        };

      case 'query_pattern_events':
        InputValidator.validateStringLength(args.pattern, 'pattern', 10000, false);
        const startCycle = args.start ?? 0;
        const endCycle = args.end ?? 1;
        if (startCycle >= endCycle) {
          return { error: 'Start must be less than end' };
        }
        if (endCycle - startCycle > 16) {
          return { error: 'Maximum range is 16 cycles to prevent excessive output' };
        }
        try {
          const events = this.strudelEngine.queryEvents(args.pattern, startCycle, endCycle);
          return {
            count: events.length,
            range: { start: startCycle, end: endCycle },
            events: events.map((e: any) => ({
              value: e.value,
              start: e.start,
              end: e.end,
              duration: e.end - e.start
            }))
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            error: message,
            suggestion: 'Check pattern syntax with validate_pattern_local first'
          };
        }

      case 'transpile_pattern':
        InputValidator.validateStringLength(args.pattern, 'pattern', 10000, false);
        const transpileResult = this.strudelEngine.transpile(args.pattern);
        if (transpileResult.success) {
          return {
            success: true,
            transpiledCode: transpileResult.transpiledCode,
            message: 'Pattern transpiled successfully'
          };
        } else {
          return {
            success: false,
            error: transpileResult.error,
            errorLocation: transpileResult.errorLocation,
            message: 'Transpilation failed'
          };
        }


      // shift_mood — handled by transformModule above.

      // Session Management
      // save, load, list — handled by storageModule above.
      // undo, redo, list_history, restore_history, compare_patterns
      //   — handled by historyModule above.

      // performance_report, memory_usage, screenshot, status, diagnostics,
      // show_errors — all handled by diagnosticsModule before this switch.
      // show_browser stays here until session.ts extraction lands.

      // UX Tools - Browser Control (#37)
      case 'show_browser':
        if (!this.isInitialized) {
          return 'Browser not initialized. Run init first.';
        }
        return await this.controller.showBrowser();

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
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : String(error);
              this.logger.warn('Failed to get AI feedback for compose', { error: message });
              // Don't fail the whole operation, just note the feedback failure
              composeResponse.message += ' (AI feedback unavailable)';
            }
          } else {
            composeResponse.message += ' (AI feedback requires GEMINI_API_KEY)';
          }
        }

        return composeResponse;

      // get_pattern_feedback, suggest_pattern_from_audio —
      // handled by aiModule above.

      // start_audio_capture, stop_audio_capture, capture_audio_sample,
      // export_midi — handled by captureModule above.

      // create_session, destroy_session, list_sessions, switch_session —
      // handled by sessionModule above.

      // jam_with — handled by aiModule above.

      // refine, set_energy — handled by transformModule above.

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // refinePattern, setEnergyLevel, transposePattern moved to
  // src/server/tools/transform.ts alongside the tools that used them.

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

  // formatTimeAgo, generateDiff, summarizeDiff moved to
  // src/server/tools/history.ts along with the tools that used them.

  // getPatternFeedback, suggestPatternFromAudio, captureAudioSample,
  // jamWith + six pattern-analysis helpers moved to src/server/tools/ai.ts.

  /** Getter for page access in audio capture. */
  private get _page() {
    return this.controller.page;
  }

  // Audio capture + MIDI export logic moved to src/server/tools/capture.ts.
  // Server still owns the AudioCaptureService lifecycle so tests can mock
  // the class and the module fetches the (possibly mocked) instance via
  // ctx.getAudioCaptureService() instead of caching its own.
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Enhanced Strudel MCP server v2.0.1 running (fixed)');

    process.on('SIGINT', async () => {
      this.logger.info('Shutting down...');
      await this.controller.cleanup();
      await this.sessionManager.destroyAll();
      process.exit(0);
    });
  }
}