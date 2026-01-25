import { Logger } from '../utils/Logger.js';

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

  // Rate limiting
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly maxRequestsPerMinute = 10;

  // Cache for analysis results
  private audioCache = new Map<string, CacheEntry<AudioFeedback>>();
  private patternCache = new Map<string, CacheEntry<CreativeFeedback>>();

  constructor(config?: {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    cacheTtlSeconds?: number;
  }) {
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    this.model = config?.model || 'gemini-2.0-flash';
    this.maxTokens = config?.maxTokens || 1024;
    this.cacheTtlMs = (config?.cacheTtlSeconds || 300) * 1000;
  }

  /**
   * Checks if Gemini service is available (API key configured)
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Analyzes audio data and provides qualitative feedback
   * @param audioData - Audio blob (WebM/Opus recommended)
   * @param context - Optional pattern context for better analysis
   * @returns Audio feedback with mood, style, and suggestions
   * @throws {Error} When API key not configured or rate limit exceeded
   */
  async analyzeAudio(audioData: Blob, context?: PatternContext): Promise<AudioFeedback> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Set GEMINI_API_KEY environment variable.');
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
      const response = await this.callGeminiAPI(prompt, audioBase64, 'audio/webm');

      const feedback = this.parseAudioResponse(response);
      this.audioCache.set(cacheKey, { result: feedback, timestamp: Date.now() });

      return feedback;
    } catch (error: any) {
      this.logger.error('Audio analysis failed', error);
      throw new Error(`Audio analysis failed: ${error.message}`);
    }
  }

  /**
   * Suggests variations for a pattern
   * @param pattern - Strudel pattern code
   * @param style - Optional style hint (e.g., 'more minimal', 'add complexity')
   * @returns Array of pattern suggestions with descriptions
   * @throws {Error} When API key not configured or rate limit exceeded
   */
  async suggestVariations(pattern: string, style?: string): Promise<PatternSuggestion[]> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Set GEMINI_API_KEY environment variable.');
    }

    this.checkRateLimit();

    try {
      const prompt = this.buildVariationPrompt(pattern, style);
      const response = await this.callGeminiAPI(prompt);

      return this.parseVariationResponse(response);
    } catch (error: any) {
      this.logger.error('Variation suggestion failed', error);
      throw new Error(`Variation suggestion failed: ${error.message}`);
    }
  }

  /**
   * Gets creative feedback on a pattern's structure and style
   * @param pattern - Strudel pattern code
   * @returns Creative feedback with complexity, strengths, and suggestions
   * @throws {Error} When API key not configured or rate limit exceeded
   */
  async getCreativeFeedback(pattern: string): Promise<CreativeFeedback> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Set GEMINI_API_KEY environment variable.');
    }

    this.checkRateLimit();

    // Check cache
    const cacheKey = pattern.slice(0, 200); // Use first 200 chars as key
    const cached = this.getFromCache(this.patternCache, cacheKey);
    if (cached) {
      this.logger.debug('Returning cached creative feedback');
      return cached;
    }

    try {
      const prompt = this.buildCreativeFeedbackPrompt(pattern);
      const response = await this.callGeminiAPI(prompt);

      const feedback = this.parseCreativeFeedbackResponse(response);
      this.patternCache.set(cacheKey, { result: feedback, timestamp: Date.now() });

      return feedback;
    } catch (error: any) {
      this.logger.error('Creative feedback failed', error);
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

  private checkRateLimit(): void {
    const now = Date.now();
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded. Max 10 requests per minute.');
    }

    this.requestCount++;
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

  private async callGeminiAPI(prompt: string, mediaData?: string, mimeType?: string): Promise<string> {
    // Dynamic import for ES module compatibility
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(this.apiKey!);
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
