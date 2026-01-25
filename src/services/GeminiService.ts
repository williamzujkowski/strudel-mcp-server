import { Logger } from '../utils/Logger.js';
import { GoogleAuth } from 'google-auth-library';

/**
 * Audio feedback from Gemini analysis
 */
export interface AudioFeedback {
  mood: string;
  style: string;
  energy: 'low' | 'medium' | 'high';
  suggestions: string[];
  confidence: number;
}

/**
 * Rate limit state for better user feedback
 */
interface RateLimitState {
  requestCount: number;
  lastResetTime: number;
  nextAvailableTime: number;
}

/**
 * Pattern suggestion from Gemini
 */
export interface PatternSuggestion {
  description: string;
  code: string;
  rationale: string;
}

/**
 * Creative feedback on a pattern
 */
export interface CreativeFeedback {
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedStyle: string;
  strengths: string[];
  suggestions: string[];
}

/**
 * Context about the current pattern for better analysis
 */
export interface PatternContext {
  style?: string;
  bpm?: number;
  key?: string;
  duration?: number;
}

/**
 * Cache entry for analysis results
 */
interface CacheEntry<T> {
  result: T;
  timestamp: number;
}

/**
 * GeminiService provides AI-powered music analysis and suggestions
 * using Google's Gemini API.
 *
 * Features:
 * - Qualitative audio feedback (mood, style, suggestions)
 * - Pattern variation suggestions
 * - Creative feedback on pattern structure
 * - Rate limiting and caching for cost control
 *
 * @example
 * const gemini = new GeminiService();
 * const feedback = await gemini.getCreativeFeedback(patternCode);
 */
export class GeminiService {
  private logger = new Logger();
  private apiKey: string | undefined;
  private model: string;
  private maxTokens: number;
  private cacheTtlMs: number;
  private timeoutMs: number;
  private maxPatternLength: number;
  private adcAvailable: boolean | null = null; // null = not checked yet
  private adcCheckPromise: Promise<boolean> | null = null;

  // Rate limiting with better state tracking
  private rateLimit: RateLimitState = {
    requestCount: 0,
    lastResetTime: Date.now(),
    nextAvailableTime: 0
  };
  private readonly maxRequestsPerMinute = 10;
  private readonly rateLimitWindowMs = 60000;

  // Cache for analysis results
  private audioCache = new Map<string, CacheEntry<AudioFeedback>>();
  private patternCache = new Map<string, CacheEntry<CreativeFeedback>>();

  constructor(config?: {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    cacheTtlSeconds?: number;
    timeoutSeconds?: number;
    maxPatternLength?: number;
  }) {
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    this.model = config?.model || 'gemini-2.0-flash';
    this.maxTokens = config?.maxTokens || 1024;
    this.cacheTtlMs = (config?.cacheTtlSeconds || 300) * 1000;
    this.timeoutMs = (config?.timeoutSeconds || 30) * 1000;
    this.maxPatternLength = config?.maxPatternLength || 5000;
  }

  /**
   * Checks if Gemini service is available (API key or ADC configured)
   * Note: This is synchronous and may return false before ADC check completes.
   * Use isAvailableAsync() for accurate ADC detection.
   */
  isAvailable(): boolean {
    return !!this.apiKey || this.adcAvailable === true;
  }

  /**
   * Async check for Gemini service availability.
   * Checks API key first, then falls back to ADC detection.
   * @returns Promise<boolean> indicating if service can make API calls
   */
  async isAvailableAsync(): Promise<boolean> {
    if (this.apiKey) return true;
    return await this.checkADC();
  }

  /**
   * Check if Application Default Credentials (ADC) are available
   * Results are cached after first check.
   */
  private async checkADC(): Promise<boolean> {
    // Return cached result if available
    if (this.adcAvailable !== null) {
      return this.adcAvailable;
    }

    // If check is in progress, wait for it
    if (this.adcCheckPromise) {
      return this.adcCheckPromise;
    }

    // Perform the check
    this.adcCheckPromise = this.performADCCheck();
    return this.adcCheckPromise;
  }

  /**
   * Perform the actual ADC credential check
   */
  private async performADCCheck(): Promise<boolean> {
    try {
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/generative-language']
      });
      await auth.getClient();
      this.adcAvailable = true;
      this.logger.debug('ADC credentials available');
      return true;
    } catch {
      this.adcAvailable = false;
      this.logger.debug('ADC credentials not available');
      return false;
    } finally {
      this.adcCheckPromise = null;
    }
  }

  /**
   * Get authentication error message
   */
  private getAuthErrorMessage(): string {
    return 'Gemini API key not configured and ADC not available. ' +
      'Set GEMINI_API_KEY environment variable or run "gcloud auth application-default login".';
  }

  /**
   * Ensure authentication is available (API key or ADC)
   * @throws {Error} When neither API key nor ADC is available
   */
  private async ensureAuthentication(): Promise<void> {
    if (this.apiKey) return;

    const adcAvailable = await this.checkADC();
    if (!adcAvailable) {
      throw new Error(this.getAuthErrorMessage());
    }
  }

  /**
   * Analyzes audio data and provides qualitative feedback
   * @param audioData - Audio blob (WebM/Opus recommended)
   * @param context - Optional pattern context for better analysis
   * @returns Audio feedback with mood, style, and suggestions
   * @throws {Error} When authentication not available, audio invalid, or rate limit exceeded
   */
  async analyzeAudio(audioData: Blob, context?: PatternContext): Promise<AudioFeedback> {
    await this.ensureAuthentication();

    // Validate audio data
    if (!audioData || audioData.size === 0) {
      throw new Error('Audio analysis requires valid audio data. Ensure pattern is playing and audio is captured.');
    }

    this.checkRateLimit();

    // Generate cache key from audio size + context
    const cacheKey = `${audioData.size}-${JSON.stringify(context || {})}`;
    const cached = this.getFromCache(this.audioCache, cacheKey);
    if (cached) {
      this.logger.debug('Returning cached audio analysis');
      return cached;
    }

    try {
      // Convert blob to base64 for API
      const audioBase64 = await this.blobToBase64(audioData);

      const prompt = this.buildAudioPrompt(context);

      // Use timeout for audio analysis (may take longer due to media processing)
      const audioTimeoutMs = this.timeoutMs * 2; // Double timeout for audio
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Audio analysis timed out after ${audioTimeoutMs / 1000} seconds`));
        }, audioTimeoutMs);
      });

      const response = await Promise.race([
        this.callGeminiAPI(prompt, audioBase64, 'audio/webm'),
        timeoutPromise
      ]);

      const feedback = this.parseAudioResponse(response);
      this.audioCache.set(cacheKey, { result: feedback, timestamp: Date.now() });

      return feedback;
    } catch (error: any) {
      this.logger.error('Audio analysis failed', error);

      // Provide actionable error messages
      if (error.message?.includes('timed out')) {
        throw new Error('Audio analysis timed out. The audio sample may be too long. Try a shorter recording.');
      }
      if (error.message?.includes('rate limit') || error.message?.includes('Rate limit')) {
        throw error; // Re-throw rate limit errors as-is
      }

      throw new Error(`Audio analysis failed: ${error.message}`);
    }
  }

  /**
   * Suggests variations for a pattern
   * @param pattern - Strudel pattern code
   * @param style - Optional style hint (e.g., 'more minimal', 'add complexity')
   * @returns Array of pattern suggestions with descriptions
   * @throws {Error} When authentication not available, pattern invalid, or rate limit exceeded
   */
  async suggestVariations(pattern: string, style?: string): Promise<PatternSuggestion[]> {
    await this.ensureAuthentication();

    // Validate input
    const validatedPattern = this.validateAndPreparePattern(pattern, 'suggestVariations');

    this.checkRateLimit();

    try {
      const prompt = this.buildVariationPrompt(validatedPattern, style);
      const response = await this.callGeminiAPIWithTimeout(prompt);

      return this.parseVariationResponse(response);
    } catch (error: any) {
      this.logger.error('Variation suggestion failed', error);

      // Provide actionable error messages
      if (error.message?.includes('timed out')) {
        throw new Error('Variation suggestion timed out. The pattern may be too complex. Try a simpler pattern.');
      }
      if (error.message?.includes('rate limit') || error.message?.includes('Rate limit')) {
        throw error; // Re-throw rate limit errors as-is
      }

      throw new Error(`Variation suggestion failed: ${error.message}`);
    }
  }

  /**
   * Gets creative feedback on a pattern's structure and style
   * @param pattern - Strudel pattern code
   * @returns Creative feedback with complexity, strengths, and suggestions
   * @throws {Error} When authentication not available, pattern invalid, or rate limit exceeded
   */
  async getCreativeFeedback(pattern: string): Promise<CreativeFeedback> {
    await this.ensureAuthentication();

    // Validate input
    const validatedPattern = this.validateAndPreparePattern(pattern, 'getCreativeFeedback');

    this.checkRateLimit();

    // Check cache (use hash of truncated pattern for consistent keys)
    const cacheKey = validatedPattern.slice(0, 200);
    const cached = this.getFromCache(this.patternCache, cacheKey);
    if (cached) {
      this.logger.debug('Returning cached creative feedback');
      return cached;
    }

    try {
      const prompt = this.buildCreativeFeedbackPrompt(validatedPattern);
      const response = await this.callGeminiAPIWithTimeout(prompt);

      const feedback = this.parseCreativeFeedbackResponse(response);
      this.patternCache.set(cacheKey, { result: feedback, timestamp: Date.now() });

      return feedback;
    } catch (error: any) {
      this.logger.error('Creative feedback failed', error);

      // Provide actionable error messages
      if (error.message?.includes('timed out')) {
        throw new Error('Creative feedback timed out. The pattern may be too complex. Try a simpler pattern.');
      }
      if (error.message?.includes('rate limit') || error.message?.includes('Rate limit')) {
        throw error; // Re-throw rate limit errors as-is
      }

      throw new Error(`Creative feedback failed: ${error.message}`);
    }
  }

  /**
   * Clears all cached analysis results
   */
  clearCache(): void {
    this.audioCache.clear();
    this.patternCache.clear();
    this.logger.debug('Cache cleared');
  }

  // --- Private Methods ---

  /**
   * Checks rate limit and throws with actionable message if exceeded
   * @throws {Error} When rate limit exceeded, with seconds until next available request
   */
  private checkRateLimit(): void {
    const now = Date.now();

    // Reset counter if window has passed
    if (now - this.rateLimit.lastResetTime > this.rateLimitWindowMs) {
      this.rateLimit.requestCount = 0;
      this.rateLimit.lastResetTime = now;
      this.rateLimit.nextAvailableTime = 0;
    }

    if (this.rateLimit.requestCount >= this.maxRequestsPerMinute) {
      const waitTimeMs = this.rateLimit.lastResetTime + this.rateLimitWindowMs - now;
      const waitTimeSec = Math.ceil(waitTimeMs / 1000);
      this.rateLimit.nextAvailableTime = now + waitTimeMs;

      throw new Error(
        `Rate limit exceeded (${this.maxRequestsPerMinute} requests/minute). ` +
        `Wait ${waitTimeSec} seconds before retrying.`
      );
    }

    this.rateLimit.requestCount++;
  }

  /**
   * Returns seconds until next request is available, or 0 if available now
   */
  getSecondsUntilAvailable(): number {
    const now = Date.now();
    if (this.rateLimit.requestCount < this.maxRequestsPerMinute) {
      return 0;
    }
    const waitTimeMs = this.rateLimit.lastResetTime + this.rateLimitWindowMs - now;
    return Math.max(0, Math.ceil(waitTimeMs / 1000));
  }

  private getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.cacheTtlMs) {
      cache.delete(key);
      return null;
    }

    return entry.result;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  /**
   * Validates and prepares a pattern for API submission
   * @param pattern - The raw pattern string
   * @param methodName - The calling method name for error messages
   * @returns Validated and trimmed pattern
   * @throws {Error} When pattern is empty or exceeds max length
   */
  private validateAndPreparePattern(pattern: string, methodName: string): string {
    // Check for null/undefined
    if (pattern === null || pattern === undefined) {
      throw new Error(`${methodName}: Pattern is required. Write a pattern first.`);
    }

    // Check for non-string types
    if (typeof pattern !== 'string') {
      throw new Error(`${methodName}: Pattern must be a string, got ${typeof pattern}.`);
    }

    // Check for empty or whitespace-only
    const trimmed = pattern.trim();
    if (trimmed.length === 0) {
      throw new Error(`${methodName}: Pattern cannot be empty or whitespace-only. Write a pattern first.`);
    }

    // Check for excessive length
    if (trimmed.length > this.maxPatternLength) {
      throw new Error(
        `${methodName}: Pattern exceeds maximum length of ${this.maxPatternLength} characters ` +
        `(current: ${trimmed.length}). Truncate or simplify the pattern.`
      );
    }

    return trimmed;
  }

  /**
   * Calls Gemini API with timeout protection
   * @param prompt - The prompt to send
   * @returns API response text
   * @throws {Error} When request times out or API fails
   */
  private async callGeminiAPIWithTimeout(prompt: string): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timed out after ${this.timeoutMs / 1000} seconds`));
      }, this.timeoutMs);
    });

    return Promise.race([
      this.callGeminiAPI(prompt),
      timeoutPromise
    ]);
  }

  private async callGeminiAPI(prompt: string, mediaData?: string, mimeType?: string): Promise<string> {
    // Dynamic import for ES module compatibility
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    let genAI: InstanceType<typeof GoogleGenerativeAI>;

    if (this.apiKey) {
      // Use API key authentication
      genAI = new GoogleGenerativeAI(this.apiKey);
    } else {
      // Use ADC to get access token
      const accessToken = await this.getADCAccessToken();
      // The SDK can accept an access token via the apiKey parameter
      // when the token is used with the correct headers
      genAI = new GoogleGenerativeAI(accessToken);
    }

    const model = genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: 0.7
      }
    });

    let result;
    if (mediaData && mimeType) {
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: mediaData,
            mimeType: mimeType
          }
        }
      ]);
    } else {
      result = await model.generateContent(prompt);
    }

    return result.response.text();
  }

  /**
   * Get an access token from ADC for API authentication
   */
  private async getADCAccessToken(): Promise<string> {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/generative-language']
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) {
      throw new Error('Failed to get access token from ADC');
    }
    return tokenResponse.token;
  }

  private buildAudioPrompt(context?: PatternContext): string {
    let prompt = `Analyze this audio clip from a live-coded music performance using Strudel.cc.

Provide feedback in the following JSON format:
{
  "mood": "<one word describing the mood, e.g., energetic, melancholic, hypnotic, chaotic>",
  "style": "<musical genre/style, e.g., minimal techno, ambient drone, glitch, house>",
  "energy": "<low|medium|high>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"],
  "confidence": <0.0-1.0>
}

Focus on:
- Overall mood and atmosphere
- Rhythmic characteristics
- Tonal qualities
- Creative suggestions for improvement`;

    if (context) {
      prompt += `\n\nContext:`;
      if (context.style) prompt += `\n- Intended style: ${context.style}`;
      if (context.bpm) prompt += `\n- BPM: ${context.bpm}`;
      if (context.key) prompt += `\n- Key: ${context.key}`;
    }

    return prompt;
  }

  private buildVariationPrompt(pattern: string, style?: string): string {
    let prompt = `You are an expert in Strudel.cc live coding music.

Given this pattern:
\`\`\`javascript
${pattern}
\`\`\`

Generate 3 variations that ${style || 'add interesting musical changes while preserving the core feel'}.

Return JSON array:
[
  {
    "description": "<brief description of the variation>",
    "code": "<complete Strudel pattern code>",
    "rationale": "<why this variation works musically>"
  }
]

Rules:
- Each variation must be valid Strudel.cc code
- Keep the core musical idea but transform it creatively
- Variations should be distinctly different from each other`;

    return prompt;
  }

  private buildCreativeFeedbackPrompt(pattern: string): string {
    return `You are an expert in Strudel.cc live coding music.

Analyze this pattern:
\`\`\`javascript
${pattern}
\`\`\`

Provide creative feedback in this JSON format:
{
  "complexity": "<simple|moderate|complex>",
  "estimatedStyle": "<genre/style this sounds like>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "suggestions": ["<improvement suggestion 1>", "<improvement suggestion 2>"]
}

Consider:
- Pattern complexity and layering
- Use of Strudel functions and effects
- Rhythmic interest
- Harmonic choices
- Creative potential`;
  }

  private parseAudioResponse(response: string): AudioFeedback {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        mood: parsed.mood || 'unknown',
        style: parsed.style || 'unknown',
        energy: parsed.energy || 'medium',
        suggestions: parsed.suggestions || [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
      };
    } catch {
      this.logger.warn('Failed to parse audio response, using defaults');
      return {
        mood: 'unknown',
        style: 'unknown',
        energy: 'medium',
        suggestions: ['Unable to analyze audio clearly'],
        confidence: 0
      };
    }
  }

  private parseVariationResponse(response: string): PatternSuggestion[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any) => ({
        description: item.description || '',
        code: item.code || '',
        rationale: item.rationale || ''
      }));
    } catch {
      this.logger.warn('Failed to parse variation response');
      return [];
    }
  }

  private parseCreativeFeedbackResponse(response: string): CreativeFeedback {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        complexity: parsed.complexity || 'moderate',
        estimatedStyle: parsed.estimatedStyle || 'unknown',
        strengths: parsed.strengths || [],
        suggestions: parsed.suggestions || []
      };
    } catch {
      this.logger.warn('Failed to parse creative feedback response');
      return {
        complexity: 'moderate',
        estimatedStyle: 'unknown',
        strengths: [],
        suggestions: ['Unable to analyze pattern']
      };
    }
  }
}
