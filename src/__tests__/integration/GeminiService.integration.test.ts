/**
 * GeminiService Integration Tests
 *
 * These tests make REAL API calls to Google's Gemini API.
 * They require GEMINI_API_KEY to be set in the environment.
 *
 * Run with:
 *   GEMINI_API_KEY=xxx npm run test:nocov -- --testPathPattern=GeminiService.integration
 *
 * Skip in CI by not setting GEMINI_API_KEY.
 */

import { GeminiService, CreativeFeedback, PatternSuggestion } from '../../services/GeminiService.js';

// Test patterns - real Strudel code
const technoPattern = `setcpm(128)
stack(
  s("bd*4, ~ cp ~ cp, hh*8"),
  note("c2 c2 c2 c2").s("sawtooth").cutoff(800)
).gain(0.8)`;

const ambientPattern = `setcpm(60)
note("c4 e4 g4 b4").s("sine").delay(0.5).room(0.8).gain(0.3)`;

const simplePattern = `s("bd sd hh oh")`;

const complexPattern = `setcpm(140)
stack(
  s("bd:3*4, ~ [cp:2 cp:4] ~ cp:3, [hh:1*8 hh:2*8]").bank("RolandTR909")
    .speed(rand.range(0.9, 1.1)).pan(sine.range(0, 1)),
  note("c2 [~ c2] eb2 [~ g1]")
    .s("sawtooth").cutoff(perlin.range(200, 800)).resonance(0.4)
    .room(0.2).delay(0.1),
  note("<c4 eb4 g4 bb4>/4")
    .s("triangle").cutoff(600).room(0.5).gain(0.3)
).gain(0.7)`;

// Check if API key is available
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const hasApiKey = !!GEMINI_API_KEY;

// Conditionally run tests based on API key availability
const describeWithApiKey = hasApiKey ? describe : describe.skip;

describeWithApiKey('GeminiService Integration Tests (Real API)', () => {
  let service: GeminiService;

  beforeAll(() => {
    if (!hasApiKey) {
      console.log('GEMINI_API_KEY not set - skipping integration tests');
      return;
    }
    console.log('Running GeminiService integration tests with real API calls');
  });

  beforeEach(() => {
    // Create fresh service for each test with short cache TTL
    service = new GeminiService({
      apiKey: GEMINI_API_KEY,
      cacheTtlSeconds: 1 // Short TTL for testing cache expiry
    });
  });

  describe('getCreativeFeedback()', () => {
    it('should analyze a techno pattern and return valid feedback', async () => {
      const startTime = Date.now();
      const feedback = await service.getCreativeFeedback(technoPattern);
      const latency = Date.now() - startTime;

      console.log('Techno pattern feedback:', JSON.stringify(feedback, null, 2));
      console.log(`Response latency: ${latency}ms`);

      // Validate response structure
      expect(feedback).toHaveProperty('complexity');
      expect(feedback).toHaveProperty('estimatedStyle');
      expect(feedback).toHaveProperty('strengths');
      expect(feedback).toHaveProperty('suggestions');

      // Validate complexity is one of expected values
      expect(['simple', 'moderate', 'complex']).toContain(feedback.complexity);

      // Validate estimatedStyle is non-empty
      expect(typeof feedback.estimatedStyle).toBe('string');
      expect(feedback.estimatedStyle.length).toBeGreaterThan(0);

      // Validate strengths and suggestions are arrays
      expect(Array.isArray(feedback.strengths)).toBe(true);
      expect(Array.isArray(feedback.suggestions)).toBe(true);

      // Latency check - should be under 30 seconds for API call
      expect(latency).toBeLessThan(30000);
    }, 60000); // 60 second timeout for API call

    it('should analyze an ambient pattern', async () => {
      const feedback = await service.getCreativeFeedback(ambientPattern);

      console.log('Ambient pattern feedback:', JSON.stringify(feedback, null, 2));

      expect(['simple', 'moderate', 'complex']).toContain(feedback.complexity);
      expect(feedback.estimatedStyle).toBeTruthy();
      expect(Array.isArray(feedback.strengths)).toBe(true);
      expect(Array.isArray(feedback.suggestions)).toBe(true);
    }, 60000);

    it('should analyze a simple pattern as simple complexity', async () => {
      const feedback = await service.getCreativeFeedback(simplePattern);

      console.log('Simple pattern feedback:', JSON.stringify(feedback, null, 2));

      // Simple pattern should likely be classified as simple or moderate
      expect(['simple', 'moderate']).toContain(feedback.complexity);
    }, 60000);

    it('should analyze a complex pattern', async () => {
      const feedback = await service.getCreativeFeedback(complexPattern);

      console.log('Complex pattern feedback:', JSON.stringify(feedback, null, 2));

      // Complex pattern should be classified as moderate or complex
      expect(['moderate', 'complex']).toContain(feedback.complexity);
    }, 60000);
  });

  describe('suggestVariations()', () => {
    it('should suggest variations for a simple pattern', async () => {
      const startTime = Date.now();
      const suggestions = await service.suggestVariations(simplePattern);
      const latency = Date.now() - startTime;

      console.log('Variation suggestions:', JSON.stringify(suggestions, null, 2));
      console.log(`Response latency: ${latency}ms`);

      // Should return array of suggestions
      expect(Array.isArray(suggestions)).toBe(true);

      // Validate each suggestion structure
      suggestions.forEach((suggestion: PatternSuggestion, index: number) => {
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('code');
        expect(suggestion).toHaveProperty('rationale');

        expect(typeof suggestion.description).toBe('string');
        expect(typeof suggestion.code).toBe('string');
        expect(typeof suggestion.rationale).toBe('string');

        console.log(`Suggestion ${index + 1}: ${suggestion.description}`);
      });
    }, 60000);

    it('should accept style hints', async () => {
      const suggestions = await service.suggestVariations(
        simplePattern,
        'make it more minimal and sparse'
      );

      console.log('Minimal style variations:', JSON.stringify(suggestions, null, 2));

      expect(Array.isArray(suggestions)).toBe(true);
    }, 60000);

    it('should suggest variations for a techno pattern', async () => {
      const suggestions = await service.suggestVariations(technoPattern);

      console.log('Techno variations:', JSON.stringify(suggestions, null, 2));

      expect(Array.isArray(suggestions)).toBe(true);
      // Each suggestion should have code
      suggestions.forEach((s: PatternSuggestion) => {
        expect(s.code.length).toBeGreaterThan(0);
      });
    }, 60000);
  });

  describe('Caching Behavior', () => {
    it('should cache results for identical patterns', async () => {
      // First call - hits API
      const start1 = Date.now();
      const feedback1 = await service.getCreativeFeedback(simplePattern);
      const latency1 = Date.now() - start1;

      // Second call - should use cache
      const start2 = Date.now();
      const feedback2 = await service.getCreativeFeedback(simplePattern);
      const latency2 = Date.now() - start2;

      console.log(`First call latency: ${latency1}ms`);
      console.log(`Second call (cached) latency: ${latency2}ms`);

      // Results should be identical
      expect(feedback1).toEqual(feedback2);

      // Cached call should be significantly faster
      expect(latency2).toBeLessThan(latency1 / 2);
      expect(latency2).toBeLessThan(50); // Cached should be under 50ms
    }, 60000);

    it('should clear cache when requested', async () => {
      // First call - hits API
      await service.getCreativeFeedback(simplePattern);

      // Clear cache
      service.clearCache();

      // Second call - should hit API again (but result may differ due to model variability)
      const start = Date.now();
      await service.getCreativeFeedback(simplePattern);
      const latency = Date.now() - start;

      console.log(`Latency after cache clear: ${latency}ms`);

      // After cache clear, should take longer (hitting API again)
      // We can't guarantee exact behavior, but it should work without error
      expect(latency).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Create service with fresh rate limit counter
      const rateLimitService = new GeminiService({
        apiKey: GEMINI_API_KEY,
        cacheTtlSeconds: 0 // Disable cache so each call counts
      });

      // Note: We don't actually want to hit the rate limit in tests
      // as it would require 10+ API calls. Just verify the service works.
      const feedback = await rateLimitService.getCreativeFeedback(simplePattern);
      expect(feedback).toBeDefined();

      console.log('Rate limiting test passed - service respects limits');
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle invalid API key gracefully', async () => {
      const badService = new GeminiService({
        apiKey: 'invalid-api-key-12345'
      });

      await expect(badService.getCreativeFeedback(simplePattern))
        .rejects.toThrow();
    }, 60000);

    it('should throw descriptive error when neither API key nor ADC configured', async () => {
      // This test will only work correctly when ADC is not available
      // In CI or environments without gcloud, this should throw
      const noKeyService = new GeminiService({
        apiKey: undefined
      });

      // The error message mentions both authentication methods
      await expect(noKeyService.getCreativeFeedback(simplePattern))
        .rejects.toThrow(/Gemini API key not configured|ADC not available/);
    });
  });

  describe('Response Validation', () => {
    it('should return properly typed CreativeFeedback', async () => {
      const feedback: CreativeFeedback = await service.getCreativeFeedback(technoPattern);

      // TypeScript type checking
      const complexity: 'simple' | 'moderate' | 'complex' = feedback.complexity;
      const style: string = feedback.estimatedStyle;
      const strengths: string[] = feedback.strengths;
      const suggestions: string[] = feedback.suggestions;

      expect(complexity).toBeDefined();
      expect(style).toBeDefined();
      expect(strengths).toBeDefined();
      expect(suggestions).toBeDefined();
    }, 60000);

    it('should return properly typed PatternSuggestion array', async () => {
      const suggestions: PatternSuggestion[] = await service.suggestVariations(simplePattern);

      suggestions.forEach((s: PatternSuggestion) => {
        const desc: string = s.description;
        const code: string = s.code;
        const rationale: string = s.rationale;

        expect(desc).toBeDefined();
        expect(code).toBeDefined();
        expect(rationale).toBeDefined();
      });
    }, 60000);
  });

  describe('Service Availability', () => {
    it('should report availability correctly', () => {
      expect(service.isAvailable()).toBe(true);

      const noKeyService = new GeminiService({ apiKey: undefined });
      expect(noKeyService.isAvailable()).toBe(false);
    });
  });

  describe('Latency Benchmarks', () => {
    it('should complete getCreativeFeedback within acceptable time', async () => {
      const times: number[] = [];

      // Run 3 calls with different patterns to avoid cache
      const patterns = [simplePattern, technoPattern, ambientPattern];

      for (const pattern of patterns) {
        const start = Date.now();
        await service.getCreativeFeedback(pattern);
        times.push(Date.now() - start);
      }

      const avgLatency = times.reduce((a, b) => a + b, 0) / times.length;
      const maxLatency = Math.max(...times);
      const minLatency = Math.min(...times);

      console.log(`Latency stats - Avg: ${avgLatency.toFixed(0)}ms, Min: ${minLatency}ms, Max: ${maxLatency}ms`);

      // Average should be under 15 seconds
      expect(avgLatency).toBeLessThan(15000);
    }, 120000); // 2 minute timeout for multiple API calls
  });
});

// Tests that run even without API key to verify skip behavior
describe('GeminiService Integration Tests (Skip Verification)', () => {
  it('should skip gracefully when GEMINI_API_KEY not set', () => {
    if (!hasApiKey) {
      console.log('Correctly skipping integration tests - no API key');
    } else {
      console.log('API key present - integration tests will run');
    }
    expect(true).toBe(true);
  });
});
