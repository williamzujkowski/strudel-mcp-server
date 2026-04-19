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

      // Audio-to-Pattern Tool (#95)
      {
        name: 'suggest_pattern_from_audio',
        description: 'Analyze the currently playing audio and suggest a complementary Strudel pattern using Gemini AI. Extracts tempo, key, and spectral features locally, then uses AI to generate a matching pattern. Returns pattern text (not auto-executed).',
        inputSchema: {
          type: 'object',
          properties: {
            style: { type: 'string', description: 'Optional style hint (e.g., "ambient", "techno", "jazz")' },
            role: { type: 'string', enum: ['complement', 'bassline', 'melody', 'percussion'], description: 'What role the suggested pattern should fill. Default: complement' }
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
      },

      // MIDI Export Tools (#74)
      {
        name: 'export_midi',
        description: 'Export current pattern to MIDI file. Parses note(), n(), and chord() functions.',
        inputSchema: {
          type: 'object',
          properties: {
            filename: { type: 'string', description: 'Output filename (optional, default: pattern.mid)' },
            duration: { type: 'number', description: 'Export duration in bars (default: 4)' },
            bpm: { type: 'number', description: 'Tempo in BPM (default: 120)' },
            format: { type: 'string', enum: ['file', 'base64'], description: 'Output format: file or base64 (default: base64)' }
          }
        }
      },

      // Multi-Session Management Tools (#75)
      {
        name: 'create_session',
        description: 'Create a new isolated Strudel browser session. Sessions share one browser but have isolated contexts.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Unique identifier for the session' }
          },
          required: ['session_id']
        }
      },
      {
        name: 'destroy_session',
        description: 'Close and destroy a Strudel session, releasing its resources.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Session identifier to destroy' }
          },
          required: ['session_id']
        }
      },
      {
        name: 'list_sessions',
        description: 'List all active Strudel sessions with their metadata.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'switch_session',
        description: 'Change the default session used by other tools.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Session identifier to set as default' }
          },
          required: ['session_id']
        }
      },

      // refine, set_energy — handled by transformModule (see above).

      // AI Collaborative Jamming (#82)
      {
        name: 'jam_with',
        description: 'AI generates a complementary layer to jam with your pattern. Analyzes current pattern to detect tempo, key, and existing layers, then generates a matching layer that fits musically.',
        inputSchema: {
          type: 'object',
          properties: {
            layer: {
              type: 'string',
              enum: ['drums', 'bass', 'melody', 'pad', 'texture'],
              description: 'Type of layer to add: drums, bass, melody, pad, or texture'
            },
            style_hint: {
              type: 'string',
              description: 'Optional style guidance (e.g., "funky", "minimal", "atmospheric")'
            },
            auto_play: {
              type: 'boolean',
              description: 'Start playback after adding layer (default: true)'
            }
          },
          required: ['layer']
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

      // AI Feedback Tools (#67)
      case 'get_pattern_feedback':
        return await this.getPatternFeedback(args?.includeAudio || false, args?.style);

      case 'suggest_pattern_from_audio':
        return await this.suggestPatternFromAudio(args?.style, args?.role || 'complement');

      // Audio Capture Tools (#72)
      case 'start_audio_capture':
        return await this.startAudioCapture(args?.format, args?.maxDuration);

      case 'stop_audio_capture':
        return await this.stopAudioCapture();

      case 'capture_audio_sample':
        return await this.captureAudioSampleTool(args?.duration);

      // MIDI Export Tools (#74)
      case 'export_midi':
        return await this.exportMidi(args?.filename, args?.duration, args?.bpm, args?.format);

      // Multi-Session Management Tools (#75)
      case 'create_session':
        InputValidator.validateStringLength(args.session_id, 'session_id', 100, false);
        try {
          await this.sessionManager.createSession(args.session_id);
          return {
            success: true,
            session_id: args.session_id,
            message: `Session '${args.session_id}' created successfully`,
            total_sessions: this.sessionManager.getSessionCount(),
            max_sessions: this.sessionManager.getMaxSessions()
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: message
          };
        }

      case 'destroy_session':
        InputValidator.validateStringLength(args.session_id, 'session_id', 100, false);
        try {
          await this.sessionManager.destroySession(args.session_id);
          return {
            success: true,
            session_id: args.session_id,
            message: `Session '${args.session_id}' destroyed`,
            remaining_sessions: this.sessionManager.getSessionCount()
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: message
          };
        }

      case 'list_sessions':
        const sessionsInfo = this.sessionManager.getSessionsInfo();
        return {
          count: sessionsInfo.length,
          max_sessions: this.sessionManager.getMaxSessions(),
          default_session: this.sessionManager.getDefaultSessionId(),
          sessions: sessionsInfo.map(s => ({
            id: s.id,
            created: s.created.toISOString(),
            last_activity: s.lastActivity.toISOString(),
            is_playing: s.isPlaying,
            is_default: s.id === this.sessionManager.getDefaultSessionId()
          }))
        };

      case 'switch_session':
        InputValidator.validateStringLength(args.session_id, 'session_id', 100, false);
        try {
          this.sessionManager.setDefaultSession(args.session_id);
          return {
            success: true,
            default_session: args.session_id,
            message: `Default session switched to '${args.session_id}'`
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: message
          };
        }

      // AI Collaborative Jamming (#82)
      case 'jam_with':
        return await this.jamWith(args.layer, args.style_hint, args.auto_play);

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Pattern feedback failed', { error: message });

      // Handle rate limit errors gracefully - pass through the detailed error message
      if (message?.includes('rate limit') || message?.includes('Rate limit')) {
        return {
          gemini_available: true,
          error: message // Pass through the detailed rate limit message with wait time
        };
      }

      result.error = `Pattern analysis failed: ${message}`;
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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error('Audio analysis failed', { error: message });

        // Don't fail the whole request if audio analysis fails
        if (!result.error) {
          result.error = `Audio analysis failed: ${message}`;
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
   * Suggests a complementary Strudel pattern based on audio analysis.
   * Pipeline: local DSP analysis → text prompt to Gemini → validate → return text.
   * Pattern is NOT auto-executed — user must explicitly write + play. (#95)
   */
  private async suggestPatternFromAudio(
    style?: string,
    role: string = 'complement'
  ): Promise<Record<string, unknown>> {
    if (!this.isInitialized) {
      return { error: 'Browser not initialized. Run init and play a pattern first.' };
    }

    if (!this.geminiService.isAvailable()) {
      return { error: 'Gemini API not configured. Set GEMINI_API_KEY to enable AI features.' };
    }

    // Step 1: Local audio analysis (DSP — no LLM needed)
    let bpm = 0;
    let key = 'C';
    let scale = 'major';

    try {
      const tempoResult = await this.controller.detectTempo();
      if (tempoResult && tempoResult.bpm > 0) bpm = tempoResult.bpm;
    } catch { /* best effort */ }

    try {
      const keyResult = await this.controller.detectKey();
      if (keyResult && keyResult.confidence > 0.1) {
        key = keyResult.key;
        scale = keyResult.scale;
      }
    } catch { /* best effort */ }

    // Step 2: Build text prompt with local analysis results
    const roleDesc: Record<string, string> = {
      complement: 'a complementary layer that fills sonic gaps',
      bassline: 'a bassline that grooves with the rhythm',
      melody: 'a melodic line that harmonizes with the key',
      percussion: 'a percussion layer that adds rhythmic interest',
    };
    const roleText = roleDesc[role] || roleDesc['complement'];
    const styleText = style ? ` in a ${style} style` : '';
    const tempoText = bpm > 0 ? `Detected tempo: ${bpm} BPM. ` : '';
    const keyText = `Detected key: ${key} ${scale}. `;

    const prompt = `You are a Strudel.cc live coding expert. Generate ${roleText}${styleText} for an existing pattern.

${tempoText}${keyText}

Generate ONLY valid Strudel.cc pattern code. Use functions like s(), note(), n(), .speed(), .gain(), .lpf(), .delay(), .room(), .pan(). Respond with ONLY the pattern code, no explanation.

Example patterns:
- Bass: note("c2 eb2 g2 bb2").s("sawtooth").lpf(800).gain(0.6)
- Melody: note("c4 e4 g4 c5").s("triangle").delay(0.3).room(0.4)
- Drums: s("bd*4, ~ sd ~ sd, hh*8").gain(0.7)
- Ambient: note("c3 e3 g3").s("sine").room(0.8).delay(0.5).gain(0.3)`;

    // Step 3: Call Gemini with text prompt (not raw audio)
    try {
      const geminiResponse = await this.geminiService.suggestVariations(prompt, style);
      if (!geminiResponse || geminiResponse.length === 0) {
        return { error: 'Gemini returned no pattern suggestions.' };
      }

      const suggestedPattern = geminiResponse[0].code;

      // Step 4: Validate via StrudelEngine
      const validation = this.strudelEngine.validate(suggestedPattern);

      return {
        suggested_pattern: suggestedPattern,
        analysis: { bpm, key, scale },
        role,
        style: style || 'auto',
        valid: validation.valid,
        validation_errors: validation.valid ? [] : validation.errors,
        usage: 'Use write tool to load this pattern, then play to hear it.',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Audio-to-pattern suggestion failed', { error: message });
      return { error: `Pattern suggestion failed: ${message}` };
    }
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

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Audio capture failed', { error: message });
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to start audio capture: ${message}`
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to stop audio capture: ${message}`
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to capture audio sample: ${message}`
      };
    }
  }

  /**
   * Exports current pattern to MIDI format
   * @param filename - Output filename (optional)
   * @param bars - Duration in bars (default: 4)
   * @param bpm - Tempo in BPM (default: 120)
   * @param format - Output format: 'file' or 'base64' (default: 'base64')
   * @returns Export result with MIDI data or file path
   */
  private async exportMidi(
    filename?: string,
    bars?: number,
    bpm?: number,
    format?: 'file' | 'base64'
  ): Promise<{
    success: boolean;
    message: string;
    output?: string;
    noteCount?: number;
    bars?: number;
    bpm?: number;
    error?: string;
  }> {
    // Validate inputs
    if (bpm !== undefined) {
      InputValidator.validateBPM(bpm);
    }
    if (bars !== undefined && (bars < 1 || bars > 128)) {
      return {
        success: false,
        message: 'Bars must be between 1 and 128'
      };
    }

    // Get current pattern
    const pattern = await this.getCurrentPatternSafe();
    if (!pattern || pattern.trim().length === 0) {
      return {
        success: false,
        message: 'No pattern to export. Write a pattern first.'
      };
    }

    const exportOptions = {
      bpm: bpm || 120,
      bars: bars || 4
    };

    // Export based on format
    const outputFormat = format || 'base64';

    if (outputFormat === 'file') {
      const result = this.midiExportService.exportToFile(pattern, filename, exportOptions);
      return {
        success: result.success,
        message: result.success
          ? `Exported ${result.noteCount} notes to ${result.output}`
          : result.error || 'Export failed',
        output: result.output,
        noteCount: result.noteCount,
        bars: result.bars,
        bpm: result.bpm,
        error: result.error
      };
    } else {
      const result = this.midiExportService.exportToBase64(pattern, exportOptions);
      return {
        success: result.success,
        message: result.success
          ? `Exported ${result.noteCount} notes as base64 MIDI data`
          : result.error || 'Export failed',
        output: result.output,
        noteCount: result.noteCount,
        bars: result.bars,
        bpm: result.bpm,
        error: result.error
      };
    }
  }

  /**
   * AI Collaborative Jamming - generates a complementary layer to jam with the current pattern (#82)
   * @param layer - Type of layer to add (drums, bass, melody, pad, texture)
   * @param styleHint - Optional style guidance
   * @param autoPlay - Whether to auto-play after adding layer (default: true)
   * @returns Result with merged pattern and analysis info
   */
  private async jamWith(
    layer: 'drums' | 'bass' | 'melody' | 'pad' | 'texture',
    styleHint?: string,
    autoPlay: boolean = true
  ): Promise<{
    success: boolean;
    message: string;
    layer: string;
    detected: { tempo: number; key: string; existingLayers: string[] };
    newLayer: string;
    pattern?: string;
    error?: string;
  }> {
    const validLayers = ['drums', 'bass', 'melody', 'pad', 'texture'];
    if (!validLayers.includes(layer)) {
      return {
        success: false,
        message: `Invalid layer type: ${layer}. Must be one of: ${validLayers.join(', ')}`,
        layer,
        detected: { tempo: 120, key: 'C', existingLayers: [] },
        newLayer: ''
      };
    }

    const currentPattern = await this.getCurrentPatternSafe();
    if (!currentPattern || currentPattern.trim().length === 0) {
      return {
        success: false,
        message: 'No pattern to jam with. Write a pattern first.',
        layer,
        detected: { tempo: 120, key: 'C', existingLayers: [] },
        newLayer: ''
      };
    }

    const tempo = this.detectTempoFromPattern(currentPattern);
    const key = this.detectKeyFromPattern(currentPattern);
    const existingLayers = this.detectExistingLayers(currentPattern);
    const detectedStyle = this.detectStyleFromPattern(currentPattern, styleHint);

    if (existingLayers.includes(layer) && layer !== 'texture') {
      this.logger.warn(`Pattern already contains ${layer} layer, adding anyway`);
    }

    let newLayer: string;
    try {
      newLayer = this.generateComplementaryLayer(layer, key, tempo, detectedStyle, existingLayers);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to generate ${layer} layer: ${message}`,
        layer,
        detected: { tempo, key, existingLayers },
        newLayer: '',
        error: message
      };
    }

    const mergedPattern = this.mergeLayerIntoPattern(currentPattern, newLayer, layer);

    try {
      await this.writePatternSafe(mergedPattern);
      if (autoPlay && this.isInitialized) {
        await this.controller.play();
      }

      return {
        success: true,
        message: `Added ${layer} layer${styleHint ? ` (${styleHint} style)` : ''} to jam with your pattern`,
        layer,
        detected: { tempo, key, existingLayers },
        newLayer,
        pattern: mergedPattern.substring(0, 300) + (mergedPattern.length > 300 ? '...' : '')
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to write merged pattern: ${message}`,
        layer,
        detected: { tempo, key, existingLayers },
        newLayer,
        error: message
      };
    }
  }

  private detectTempoFromPattern(pattern: string): number {
    const cpmMatch = pattern.match(/setcpm\s*\(\s*(\d+(?:\.\d+)?)\s*\)/i);
    if (cpmMatch) return Math.round(parseFloat(cpmMatch[1]));
    const bpmMatch = pattern.match(/setbpm\s*\(\s*(\d+(?:\.\d+)?)\s*\)/i);
    if (bpmMatch) return Math.round(parseFloat(bpmMatch[1]));
    const cpsMatch = pattern.match(/setcps\s*\(\s*(\d+(?:\.\d+)?)\s*(?:\/\s*60)?\s*\)/i);
    if (cpsMatch) {
      const cps = parseFloat(cpsMatch[1]);
      if (pattern.includes(`setcps(${cpsMatch[1]}/60`)) return Math.round(cps);
      return Math.round(cps * 60);
    }
    if (pattern.toLowerCase().includes('dnb')) return 174;
    if (pattern.toLowerCase().includes('techno')) return 130;
    if (pattern.toLowerCase().includes('house')) return 125;
    return 120;
  }

  private detectKeyFromPattern(pattern: string): string {
    const noteMatches = pattern.match(/note\s*\(\s*["']([^"']+)["']\s*\)/gi) || [];
    const nMatches = pattern.match(/\.n\s*\(\s*["']([^"']+)["']\s*\)/gi) || [];
    const allNotes: string[] = [];

    for (const match of noteMatches) {
      const notesInMatch = match.match(/[a-g][#b]?\d?/gi) || [];
      allNotes.push(...notesInMatch.map(n => n.toLowerCase().replace(/\d/g, '')));
    }
    for (const match of nMatches) {
      const notesInMatch = match.match(/[a-g][#b]?\d?/gi) || [];
      allNotes.push(...notesInMatch.map(n => n.toLowerCase().replace(/\d/g, '')));
    }
    const chordMatches = pattern.match(/chord\s*\(\s*["']<([^>]+)>/gi) || [];
    for (const match of chordMatches) {
      const rootMatch = match.match(/[a-g][#b]?/i);
      if (rootMatch) allNotes.push(rootMatch[0].toLowerCase());
    }

    if (allNotes.length === 0) return 'C';

    const noteCounts: Record<string, number> = {};
    for (const note of allNotes) {
      const normalizedNote = note.charAt(0).toUpperCase() + note.slice(1);
      noteCounts[normalizedNote] = (noteCounts[normalizedNote] || 0) + 1;
    }

    let mostCommonNote = 'C';
    let maxCount = 0;
    for (const [note, count] of Object.entries(noteCounts)) {
      if (count > maxCount) { maxCount = count; mostCommonNote = note; }
    }
    return mostCommonNote;
  }

  private detectExistingLayers(pattern: string): string[] {
    const layers: string[] = [];
    const lowerPattern = pattern.toLowerCase();

    if (lowerPattern.includes('bd') || lowerPattern.includes('cp') ||
        lowerPattern.includes('hh') || lowerPattern.includes('sd') ||
        lowerPattern.includes('sn') || lowerPattern.includes('oh') ||
        lowerPattern.includes('breaks') || lowerPattern.includes('drum')) {
      layers.push('drums');
    }
    if (pattern.match(/note\s*\([^)]*[12]\s*["']/i) || lowerPattern.includes('bass')) {
      layers.push('bass');
    }
    if (pattern.match(/note\s*\([^)]*[34567]\s*["']/i) ||
        lowerPattern.includes('melody') || lowerPattern.includes('lead')) {
      layers.push('melody');
    }
    if (lowerPattern.includes('chord(') || lowerPattern.includes('pad') ||
        lowerPattern.includes('strings') || lowerPattern.includes('.voicing')) {
      layers.push('pad');
    }
    if (lowerPattern.includes('noise') || lowerPattern.includes('fx') ||
        lowerPattern.includes('perlin') || lowerPattern.includes('rand')) {
      layers.push('texture');
    }
    return layers;
  }

  private detectStyleFromPattern(pattern: string, styleHint?: string): string {
    if (styleHint) return styleHint.toLowerCase();
    const lowerPattern = pattern.toLowerCase();
    const tempo = this.detectTempoFromPattern(pattern);
    if (tempo >= 160 && lowerPattern.includes('breaks')) return 'jungle';
    if (tempo >= 165 && tempo <= 180) return 'dnb';
    if (tempo >= 125 && tempo <= 135 && lowerPattern.includes('bd*4')) {
      return lowerPattern.includes('cp') ? 'techno' : 'house';
    }
    if (tempo <= 100 && lowerPattern.includes('room')) return 'ambient';
    if (lowerPattern.includes('trap')) return 'trap';
    return 'techno';
  }

  private generateComplementaryLayer(
    layer: string, key: string, tempo: number, style: string, existingLayers: string[]
  ): string {
    switch (layer) {
      case 'drums':
        if (existingLayers.includes('drums')) {
          const percOptions: Record<string, string> = {
            'techno': 's("~ hh ~ hh, ~ ~ oh ~").gain(0.4).hpf(5000)',
            'house': 's("[~ hh]*4, ~ ~ oh ~").gain(0.35).room(0.2)',
            'dnb': 's("hh*16").gain(perlin.range(0.2, 0.4)).hpf(6000)',
            'ambient': 's("~ ~ ~ hh:8").room(0.8).gain(0.2).slow(2)',
            'trap': 's("hh*16").gain(perlin.range(0.15, 0.35)).hpf(5000)',
            'jungle': 's("hh*32").gain(perlin.range(0.2, 0.4)).hpf(4000)',
            'jazz': 's("~ ride ~ ride, ~ ~ ~ hh").gain(0.3).room(0.3)'
          };
          return percOptions[style] || percOptions['techno'];
        }
        return this.generator.generateDrumPattern(style, 0.6);

      case 'bass':
        return this.generator.generateBassline(key, style);

      case 'melody': {
        let scaleName: 'minor' | 'major' | 'dorian' | 'pentatonic' = 'minor';
        let octaveRange: [number, number] = [4, 5];
        if (style === 'jazz') { scaleName = 'dorian'; octaveRange = [3, 5]; }
        if (style === 'ambient') { scaleName = 'major'; octaveRange = [4, 6]; }
        if (existingLayers.includes('bass')) octaveRange = [4, 6];
        const scale = this.theory.generateScale(key, scaleName);
        const effects: Record<string, string> = {
          'techno': '.delay(0.25).room(0.2)', 'house': '.room(0.3).gain(0.6)',
          'dnb': '.delay(0.125).room(0.2).gain(0.5)', 'ambient': '.room(0.7).delay(0.5).gain(0.4)',
          'trap': '.gain(0.5).room(0.15)', 'jungle': '.delay(0.125).room(0.25).gain(0.55)',
          'jazz': '.room(0.4).gain(0.5)'
        };
        return this.generator.generateMelody(scale, 8, octaveRange) + (effects[style] || '.room(0.3).gain(0.5)');
      }

      case 'pad': {
        const safeKey = key.toLowerCase();
        const fourth = this.theory.getNote(key, 5).toLowerCase();
        const fifth = this.theory.getNote(key, 7).toLowerCase();
        const padPatterns: Record<string, string> = {
          'techno': `chord("<${safeKey}m7 ${fourth}m7>/4").dict('ireal').voicing().s("sawtooth").attack(0.5).release(2).lpf(2000).gain(0.2).room(0.4)`,
          'house': `chord("<${safeKey}m9 ${fourth}7 ${fifth}m7>/2").dict('ireal').voicing().s("gm_epiano1").gain(0.3).room(0.4)`,
          'dnb': `chord("<${safeKey}m9 ${fourth}m9>/8").dict('ireal').voicing().s("gm_strings").attack(1).release(2).gain(0.2).room(0.5).lpf(3500)`,
          'ambient': `chord("<${safeKey}maj7 ${fourth}maj7 ${fifth}m7>/8").dict('ireal').voicing().s("sawtooth").attack(3).release(5).lpf(sine.range(400, 1200).slow(16)).gain(0.15).room(0.9)`,
          'trap': `chord("<${safeKey}m7>/4").dict('ireal').voicing().s("sawtooth").attack(0.1).release(0.5).lpf(1500).gain(0.25).room(0.3)`,
          'jungle': `chord("<${safeKey}m9 ${fourth}m9>/8").dict('ireal').voicing().s("gm_epiano1").gain(0.25).room(0.4).delay(0.25)`,
          'jazz': `chord("<${safeKey}m9 ${fourth}m9 ${fifth}7>/4").dict('ireal').voicing().s("gm_epiano1").gain(0.3).room(0.5)`
        };
        return padPatterns[style] || padPatterns['techno'];
      }

      case 'texture': {
        const texturePatterns: Record<string, string> = {
          'techno': `s("hh:8*16").gain(perlin.range(0.02, 0.06)).hpf(8000).room(0.6).pan(perlin.range(0.2, 0.8).slow(8))`,
          'house': `s("~ noise:2 ~ noise:2").gain(0.04).hpf(6000).room(0.4)`,
          'dnb': `s("~ ~ ~ noise:4").gain(perlin.range(0.02, 0.05)).hpf(7000).room(0.5).pan(perlin.range(0.3, 0.7))`,
          'ambient': `s("pad:1").n(perlin.range(0, 8).floor()).gain(0.08).room(0.95).lpf(sine.range(500, 2000).slow(32)).slow(4)`,
          'trap': `s("~ ~ noise:3 ~").gain(0.03).hpf(10000).room(0.3)`,
          'jungle': `s("breaks125:8").fit().chop(32).gain(0.05).hpf(5000).room(0.4).pan(perlin.range(0.2, 0.8))`,
          'jazz': `s("brush:1").struct("~ 1 ~ 1 ~ 1 ~ ~").gain(0.1).room(0.5)`
        };
        return texturePatterns[style] || texturePatterns['techno'];
      }

      default:
        throw new Error(`Unknown layer type: ${layer}`);
    }
  }

  private mergeLayerIntoPattern(currentPattern: string, newLayer: string, layerType: string): string {
    const trimmedPattern = currentPattern.trim();
    const trimmedLayer = newLayer.trim();
    const stackMatch = trimmedPattern.match(/^([\s\S]*?)stack\s*\(\s*([\s\S]*?)\s*\)([\s\S]*)$/);

    if (stackMatch) {
      const prefix = stackMatch[1];
      const stackContents = stackMatch[2].trimEnd().replace(/,\s*$/, '');
      const suffix = stackMatch[3];
      return `${prefix}stack(
  ${stackContents},

  // Jam ${layerType} layer
  ${trimmedLayer}
)${suffix}`;
    }

    const tempoMatch = trimmedPattern.match(/^(\s*(?:setcp[ms]|setbpm)\s*\([^)]+\)\s*\n?)/);
    const tempoPrefix = tempoMatch ? tempoMatch[1] : '';
    const patternBody = tempoMatch ? trimmedPattern.slice(tempoMatch[0].length) : trimmedPattern;

    return `${tempoPrefix}stack(
  // Original pattern
  ${patternBody},

  // Jam ${layerType} layer
  ${trimmedLayer}
)`;
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