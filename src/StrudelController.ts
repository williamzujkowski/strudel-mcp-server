import { chromium, Browser, Page } from 'playwright';
import { AudioAnalyzer } from './AudioAnalyzer.js';
import { PatternValidator, ValidationResult } from './utils/PatternValidator.js';
import { ErrorRecovery } from './utils/ErrorRecovery.js';
import { Logger } from './utils/Logger.js';

export class StrudelController {
  private browser: Browser | null = null;
  private _page: Page | null = null;
  public readonly analyzer: AudioAnalyzer;
  private validator: PatternValidator;
  private errorRecovery: ErrorRecovery;
  private logger: Logger;
  private isHeadless: boolean;
  private editorCache: string = '';
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 100; // milliseconds
  private isPlaying: boolean = false;
  private consoleErrors: string[] = [];
  private consoleWarnings: string[] = [];

  constructor(headless: boolean = false) {
    this.isHeadless = headless;
    this.analyzer = new AudioAnalyzer();
    this.validator = new PatternValidator();
    this.errorRecovery = new ErrorRecovery();
    this.logger = new Logger();
  }

  /**
   * Initializes the browser and navigates to Strudel.cc
   * @returns Success message when initialization is complete
   * @throws {Error} When browser launch or page navigation fails
   */
  async initialize(): Promise<string> {
    if (this.browser) {
      return 'Already initialized';
    }

    this.browser = await chromium.launch({
      headless: this.isHeadless,
      args: [
        '--use-fake-ui-for-media-stream',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ],
    });

    const context = await this.browser.newContext({
      permissions: ['microphone'],
      viewport: { width: 1280, height: 720 },
      reducedMotion: 'reduce',
    });

    this._page = await context.newPage();

    // Optimize page loading
    await this._page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      // Block unnecessary resources
      if (['image', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await this._page.goto('https://strudel.cc/', {
      waitUntil: 'domcontentloaded', // Changed from networkidle for faster load
      timeout: 15000,
    });

    // Wait for editor with optimized timeout
    await this._page.waitForSelector('.cm-content', { timeout: 8000 });

    // Set up console monitoring for runtime errors
    this.setupConsoleMonitoring();

    await this.analyzer.inject(this._page);

    return 'Strudel initialized successfully';
  }

  /**
   * Sets up console error/warning monitoring
   * Captures Strudel runtime errors that static validation can't catch
   */
  private setupConsoleMonitoring(): void {
    if (!this._page) return;

    this._page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        this.consoleErrors.push(text);
        this.logger.error('Strudel console error:', text);
      } else if (type === 'warning') {
        this.consoleWarnings.push(text);
        this.logger.warn('Strudel console warning:', text);
      }
    });

    this._page.on('pageerror', (error) => {
      this.consoleErrors.push(error.message);
      this.logger.error('Strudel page error:', error.message);
    });
  }

  /**
   * Writes a Strudel pattern to the editor
   * @param pattern - The pattern code to write
   * @returns Success message with pattern length
   * @throws {Error} When not initialized
   */
  async writePattern(pattern: string): Promise<string> {
    if (!this._page) throw new Error('Browser not initialized. Run init tool first.');

    // Use evaluate for faster direct manipulation
    await this._page.evaluate((newPattern) => {
      const editor = document.querySelector('.cm-content') as HTMLElement;
      if (editor) {
        const view = (editor as any).__view;
        if (view) {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: newPattern }
          });
        }
      }
    }, pattern);

    // Update cache
    this.editorCache = pattern;
    this.cacheTimestamp = Date.now();

    return `Pattern written (${pattern.length} chars)`;
  }

  /**
   * Retrieves the current pattern from the editor
   * @returns The current pattern text content
   * @throws {Error} When not initialized
   */
  async getCurrentPattern(): Promise<string> {
    if (!this._page) throw new Error('Browser not initialized. Run init tool first.');

    // Return cached value if still valid
    const now = Date.now();
    if (this.editorCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.editorCache;
    }

    const pattern = await this._page.evaluate(() => {
      const editor = document.querySelector('.cm-content');
      return editor?.textContent || '';
    });

    // Update cache
    this.editorCache = pattern;
    this.cacheTimestamp = now;

    return pattern;
  }

  /**
   * Starts playing the current pattern
   * @returns Success message
   * @throws {Error} When not initialized
   */
  async play(): Promise<string> {
    if (!this._page) throw new Error('Browser not initialized. Run init tool first.');

    // Always use keyboard shortcut for speed
    await this._page.keyboard.press('ControlOrMeta+Enter');

    // Reduced wait time
    await this._page.waitForTimeout(100);

    this.isPlaying = true;
    return 'Playing';
  }

  /**
   * Stops the currently playing pattern
   * @returns Success message
   * @throws {Error} When not initialized
   */
  async stop(): Promise<string> {
    if (!this._page) throw new Error('Browser not initialized. Run init tool first.');

    // Always use keyboard shortcut for speed
    await this._page.keyboard.press('ControlOrMeta+Period');

    this.isPlaying = false;
    return 'Stopped';
  }

  /**
   * Waits for audio analyzer to connect
   * @param timeoutMs - Maximum time to wait (default 5000ms)
   * @returns True if connected, false if timeout
   */
  async waitForAudioConnection(timeoutMs: number = 5000): Promise<boolean> {
    if (!this._page) throw new Error('Browser not initialized. Run init tool first.');

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const isConnected = await this._page.evaluate(() => {
        return (window as any).strudelAudioAnalyzer?.isConnected || false;
      });

      if (isConnected) {
        return true;
      }

      await this._page.waitForTimeout(100);
    }

    return false;
  }

  /**
   * Analyzes the current audio output
   * @returns Audio analysis data including frequency features
   * @throws {Error} When not initialized
   */
  async analyzeAudio(): Promise<any> {
    if (!this._page) throw new Error('Browser not initialized. Run init tool first.');

    return await this.analyzer.getAnalysis(this._page);
  }

  /**
   * Detects the musical key of the currently playing audio
   * @returns Key analysis including key, scale/mode, and confidence
   * @throws {Error} When not initialized or analyzer not connected
   */
  async detectKey(): Promise<any> {
    if (!this._page) throw new Error('Browser not initialized. Run init tool first.');

    return await this.analyzer.detectKey(this._page);
  }

  /**
   * Detects the tempo (BPM) of the currently playing audio
   * @returns Tempo analysis including BPM, confidence, and detection method
   * @throws {Error} When not initialized or analyzer not connected
   */
  async detectTempo(): Promise<any> {
    if (!this._page) throw new Error('Browser not initialized. Run init tool first.');

    return await this.analyzer.detectTempo(this._page);
  }

  /**
   * Cleans up browser resources and closes the connection
   */
  async cleanup() {
    if (this.browser) {
      // Clear cache
      this.editorCache = '';
      this.cacheTimestamp = 0;

      // Close browser properly
      await this.browser.close();
      this.browser = null;
      this._page = null;
    }
  }

  /**
   * Invalidates the editor content cache
   */
  invalidateCache() {
    this.editorCache = '';
    this.cacheTimestamp = 0;
  }

  /**
   * Validates a pattern before writing it
   * @param pattern - Pattern to validate
   * @param autoFix - Automatically fix common errors
   * @returns Validation result
   */
  async validatePattern(pattern: string, autoFix: boolean = false): Promise<ValidationResult> {
    this.logger.debug('Validating pattern', { length: pattern.length });

    const result = this.validator.validate(pattern);

    if (!result.valid && autoFix) {
      const { pattern: fixedPattern, fixes } = this.validator.autoFix(pattern);

      if (fixes.length > 0) {
        this.logger.info('Auto-fixed pattern errors', { fixes });

        // Re-validate the fixed pattern
        const newResult = this.validator.validate(fixedPattern);
        return {
          ...newResult,
          suggestions: [...newResult.suggestions, ...fixes]
        };
      }
    }

    return result;
  }

  /**
   * Writes pattern with validation
   * @param pattern - Pattern to write
   * @param options - Write options
   * @returns Write result with validation info
   */
  async writePatternWithValidation(
    pattern: string,
    options: { autoFix?: boolean; skipValidation?: boolean } = {}
  ): Promise<{ result: string; validation?: ValidationResult }> {
    if (!this._page) {
      throw new Error('Browser not initialized. Run init tool first.');
    }

    // Validate unless skipped
    if (!options.skipValidation) {
      const validation = await this.validatePattern(pattern, options.autoFix);

      if (!validation.valid) {
        this.logger.warn('Pattern validation failed', {
          errors: validation.errors,
          warnings: validation.warnings
        });

        // If auto-fix is enabled, try to fix and re-validate
        if (options.autoFix) {
          const { pattern: fixedPattern } = this.validator.autoFix(pattern);
          pattern = fixedPattern;
        } else {
          return {
            result: `Validation failed: ${validation.errors.join(', ')}`,
            validation
          };
        }
      }

      if (validation.warnings.length > 0) {
        this.logger.info('Pattern warnings', { warnings: validation.warnings });
      }
    }

    // Write with error recovery
    const writeResult = await this.errorRecovery.handlePatternWrite(
      async (p) => this.writePattern(p),
      pattern
    );

    return { result: writeResult };
  }

  /**
   * Gets current playback state
   * @returns True if playing, false otherwise
   */
  getPlaybackState(): boolean {
    return this.isPlaying;
  }

  /**
   * Appends code to current pattern safely
   * @param code - Code to append
   * @returns Result message
   */
  async appendPattern(code: string): Promise<string> {
    if (!this._page) {
      throw new Error('Browser not initialized. Run init tool first.');
    }

    const current = await this.getCurrentPattern();
    const newPattern = current + '\n' + code;

    return this.writePattern(newPattern);
  }

  /**
   * Inserts code at specific line
   * @param line - Line number (0-indexed)
   * @param code - Code to insert
   * @returns Result message
   */
  async insertAtLine(line: number, code: string): Promise<string> {
    if (!this._page) {
      throw new Error('Browser not initialized. Run init tool first.');
    }

    const current = await this.getCurrentPattern();
    const lines = current.split('\n');

    if (line < 0 || line > lines.length) {
      throw new Error(`Invalid line number: ${line}. Must be between 0 and ${lines.length}`);
    }

    lines.splice(line, 0, code);
    return this.writePattern(lines.join('\n'));
  }

  /**
   * Escapes special regex characters in a string for safe use in RegExp
   * @nist si-10 "Input validation"
   * @param str - String to escape
   * @returns Escaped string safe for RegExp
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Replaces text in pattern
   * @param search - Text to find (literal string, not regex)
   * @param replace - Replacement text
   * @returns Result message
   * @throws {Error} When browser not initialized
   */
  async replaceInPattern(search: string, replace: string): Promise<string> {
    if (!this._page) {
      throw new Error('Browser not initialized. Run init tool first.');
    }

    const current = await this.getCurrentPattern();
    // Escape regex special characters to prevent injection
    const escaped = this.escapeRegex(search);
    const newPattern = current.replace(new RegExp(escaped, 'g'), replace);

    if (current === newPattern) {
      return `No matches found for: ${search}`;
    }

    return this.writePattern(newPattern);
  }

  /**
   * Gets pattern statistics
   * @returns Pattern statistics
   */
  async getPatternStats(): Promise<{
    lines: number;
    chars: number;
    sounds: number;
    notes: number;
    effects: number;
    functions: number;
  }> {
    if (!this._page) {
      throw new Error('Browser not initialized. Run init tool first.');
    }

    const pattern = await this.getCurrentPattern();
    const lines = pattern.split('\n');

    return {
      lines: lines.length,
      chars: pattern.length,
      sounds: (pattern.match(/s\(/g) || []).length,
      notes: (pattern.match(/note\(/g) || []).length,
      effects: (pattern.match(/\.(room|delay|reverb|lpf|hpf|bpf)\(/g) || []).length,
      functions: (pattern.match(/\b(stack|every|sometimes|rarely|often|fast|slow)\(/g) || []).length
    };
  }

  /**
   * Takes a snapshot of the current editor state
   * @returns Snapshot data
   */
  async takeSnapshot(): Promise<{
    pattern: string;
    timestamp: string;
    isPlaying: boolean;
    stats: any;
  }> {
    if (!this._page) {
      throw new Error('Browser not initialized. Run init tool first.');
    }

    const pattern = await this.getCurrentPattern();
    const stats = await this.getPatternStats();

    return {
      pattern,
      timestamp: new Date().toISOString(),
      isPlaying: this.isPlaying,
      stats
    };
  }

  /**
   * Executes JavaScript in the Strudel context
   * @nist si-10 "Input validation"
   * @param code - JavaScript code to execute (must pass pattern validation)
   * @returns Execution result
   * @throws {Error} When browser not initialized or code validation fails
   */
  async executeInStrudelContext(code: string): Promise<any> {
    if (!this._page) {
      throw new Error('Browser not initialized. Run init tool first.');
    }

    // Validate code before execution to prevent dangerous patterns
    const validation = this.validator.validate(code);
    if (!validation.valid) {
      throw new Error(
        `Code validation failed: ${validation.errors.join('; ')}. ` +
        `Suggestions: ${validation.suggestions.join('; ')}`
      );
    }

    try {
      // Use Function constructor with restricted scope instead of raw eval
      // This executes in Strudel's context via page.evaluate, not in Node
      return await this._page.evaluate((jsCode) => {
        // Execute in the page's Strudel context where Strudel functions are available
        const fn = new Function('return ' + jsCode);
        return fn();
      }, code);
    } catch (error: any) {
      this.logger.error('Failed to execute code in Strudel context', {
        code: code.substring(0, 100),
        error: error.message
      });
      throw new Error(`Execution failed: ${error.message}`);
    }
  }

  /**
   * Gets console errors captured since last clear
   * @returns Array of error messages from Strudel
   */
  getConsoleErrors(): string[] {
    return [...this.consoleErrors];
  }

  /**
   * Gets console warnings captured since last clear
   * @returns Array of warning messages from Strudel
   */
  getConsoleWarnings(): string[] {
    return [...this.consoleWarnings];
  }

  /**
   * Clears captured console errors and warnings
   */
  clearConsoleMessages(): void {
    this.consoleErrors = [];
    this.consoleWarnings = [];
  }

  /**
   * Validates pattern with runtime checking
   * Writes pattern, waits for errors, reports results
   * @param pattern - Pattern to validate
   * @param waitMs - How long to wait for errors (default 500ms)
   * @returns Validation result with runtime errors
   */
  async validatePatternRuntime(pattern: string, waitMs: number = 500): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    if (!this._page) {
      throw new Error('Browser not initialized. Run init tool first.');
    }

    // Clear previous errors
    this.clearConsoleMessages();

    // Write pattern
    await this.writePattern(pattern);

    // Wait for potential errors to appear
    await this._page.waitForTimeout(waitMs);

    const errors = this.getConsoleErrors();
    const warnings = this.getConsoleWarnings();

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Gets the current page instance
   * @returns Page instance or null if not initialized
   */
  get page(): Page | null {
    return this._page;
  }

  /**
   * Gets detailed browser diagnostics
   * @returns Diagnostic information
   */
  async getDiagnostics(): Promise<{
    browserConnected: boolean;
    pageLoaded: boolean;
    editorReady: boolean;
    audioConnected: boolean;
    cacheStatus: {
      hasCache: boolean;
      cacheAge: number;
    };
    errorStats: any;
  }> {
    const diagnostics: any = {
      browserConnected: this.browser !== null,
      pageLoaded: this._page !== null,
      editorReady: false,
      audioConnected: false,
      cacheStatus: {
        hasCache: this.editorCache.length > 0,
        cacheAge: this.cacheTimestamp > 0 ? Date.now() - this.cacheTimestamp : 0
      },
      errorStats: this.errorRecovery.getErrorStats()
    };

    if (this._page) {
      try {
        diagnostics.editorReady = await this._page.evaluate(() => {
          return document.querySelector('.cm-content') !== null;
        });

        diagnostics.audioConnected = await this._page.evaluate(() => {
          return (window as any).strudelAudioAnalyzer?.isConnected || false;
        });
      } catch (error) {
        this.logger.warn('Failed to get diagnostics', error);
      }
    }

    return diagnostics;
  }
}
