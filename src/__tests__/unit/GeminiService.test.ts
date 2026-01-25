import { GeminiService, AudioFeedback, CreativeFeedback, PatternSuggestion } from '../../services/GeminiService.js';

// Mock the @google/generative-ai module
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  }))
}));

describe('GeminiService', () => {
  let service: GeminiService;
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get reference to mock
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    mockGenerateContent = jest.fn();
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent
      })
    }));

    // Create service with API key
    service = new GeminiService({ apiKey: 'test-api-key' });
  });

  describe('constructor', () => {
    it('should use provided config values', () => {
      const customService = new GeminiService({
        apiKey: 'custom-key',
        model: 'gemini-pro',
        maxTokens: 2048,
        cacheTtlSeconds: 600
      });

      expect(customService.isAvailable()).toBe(true);
    });

    it('should use defaults when no config provided', () => {
      const defaultService = new GeminiService();
      // Without API key, service is not available
      expect(defaultService.isAvailable()).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is configured', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      const noKeyService = new GeminiService();
      expect(noKeyService.isAvailable()).toBe(false);
    });
  });

  describe('analyzeAudio', () => {
    const mockAudioBlob = new Blob(['test-audio-data'], { type: 'audio/webm' });

    beforeEach(() => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            mood: 'energetic',
            style: 'techno',
            energy: 'high',
            suggestions: ['Add reverb', 'Try slower tempo'],
            confidence: 0.85
          })
        }
      });
    });

    it('should throw when API key not configured', async () => {
      const noKeyService = new GeminiService();
      await expect(noKeyService.analyzeAudio(mockAudioBlob))
        .rejects.toThrow('Gemini API key not configured');
    });

    it('should analyze audio and return feedback', async () => {
      const feedback = await service.analyzeAudio(mockAudioBlob);

      expect(feedback.mood).toBe('energetic');
      expect(feedback.style).toBe('techno');
      expect(feedback.energy).toBe('high');
      expect(feedback.suggestions).toHaveLength(2);
      expect(feedback.confidence).toBe(0.85);
    });

    it('should include context in prompt when provided', async () => {
      await service.analyzeAudio(mockAudioBlob, {
        style: 'house',
        bpm: 128,
        key: 'Cm'
      });

      expect(mockGenerateContent).toHaveBeenCalled();
      const callArgs = mockGenerateContent.mock.calls[0];
      expect(callArgs[0][0]).toContain('house');
      expect(callArgs[0][0]).toContain('128');
      expect(callArgs[0][0]).toContain('Cm');
    });

    it('should cache results for same audio', async () => {
      const feedback1 = await service.analyzeAudio(mockAudioBlob);
      const feedback2 = await service.analyzeAudio(mockAudioBlob);

      expect(feedback1).toEqual(feedback2);
      // Should only call API once due to caching
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed response gracefully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'not valid json' }
      });

      const feedback = await service.analyzeAudio(mockAudioBlob);

      expect(feedback.mood).toBe('unknown');
      expect(feedback.confidence).toBe(0);
    });
  });

  describe('suggestVariations', () => {
    const testPattern = 's("bd sd:2").fast(2)';

    beforeEach(() => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify([
            {
              description: 'Add hi-hats',
              code: 's("bd sd:2 hh*4").fast(2)',
              rationale: 'More rhythmic interest'
            },
            {
              description: 'Slower variation',
              code: 's("bd sd:2").slow(2)',
              rationale: 'More spacious feel'
            }
          ])
        }
      });
    });

    it('should throw when API key not configured', async () => {
      const noKeyService = new GeminiService();
      await expect(noKeyService.suggestVariations(testPattern))
        .rejects.toThrow('Gemini API key not configured');
    });

    it('should return pattern suggestions', async () => {
      const suggestions = await service.suggestVariations(testPattern);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].description).toBe('Add hi-hats');
      expect(suggestions[0].code).toContain('hh*4');
      expect(suggestions[1].rationale).toContain('spacious');
    });

    it('should include style hint in prompt', async () => {
      await service.suggestVariations(testPattern, 'make it more minimal');

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs).toContain('more minimal');
    });

    it('should handle malformed response gracefully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'invalid json here' }
      });

      const suggestions = await service.suggestVariations(testPattern);
      expect(suggestions).toEqual([]);
    });
  });

  describe('getCreativeFeedback', () => {
    const testPattern = 'note("c3 e3 g3").s("piano")';

    beforeEach(() => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            complexity: 'simple',
            estimatedStyle: 'ambient piano',
            strengths: ['Clean chord voicing', 'Good note choice'],
            suggestions: ['Add reverb', 'Try arpeggiation']
          })
        }
      });
    });

    it('should throw when API key not configured', async () => {
      const noKeyService = new GeminiService();
      await expect(noKeyService.getCreativeFeedback(testPattern))
        .rejects.toThrow('Gemini API key not configured');
    });

    it('should return creative feedback', async () => {
      const feedback = await service.getCreativeFeedback(testPattern);

      expect(feedback.complexity).toBe('simple');
      expect(feedback.estimatedStyle).toBe('ambient piano');
      expect(feedback.strengths).toHaveLength(2);
      expect(feedback.suggestions).toContain('Add reverb');
    });

    it('should cache results for same pattern', async () => {
      const feedback1 = await service.getCreativeFeedback(testPattern);
      const feedback2 = await service.getCreativeFeedback(testPattern);

      expect(feedback1).toEqual(feedback2);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed response gracefully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'not json' }
      });

      const feedback = await service.getCreativeFeedback(testPattern);

      expect(feedback.complexity).toBe('moderate');
      expect(feedback.estimatedStyle).toBe('unknown');
    });
  });

  describe('rate limiting', () => {
    it('should throw when rate limit exceeded', async () => {
      const fastService = new GeminiService({ apiKey: 'test-key' });

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "simple"}' }
      });

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        await fastService.getCreativeFeedback(`pattern${i}`);
      }

      // 11th request should fail
      await expect(fastService.getCreativeFeedback('one-more'))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should reset rate limit after 1 minute', async () => {
      const fastService = new GeminiService({ apiKey: 'test-key' });

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "simple"}' }
      });

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await fastService.getCreativeFeedback(`pattern${i}`);
      }

      // Simulate time passing (>1 minute)
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);

      // Should work again
      const feedback = await fastService.getCreativeFeedback('after-reset');
      expect(feedback.complexity).toBe('simple');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached results', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "complex"}' }
      });

      const pattern = 's("bd sd")';

      // First call - hits API
      await service.getCreativeFeedback(pattern);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Second call - uses cache
      await service.getCreativeFeedback(pattern);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCache();

      // Third call - hits API again
      await service.getCreativeFeedback(pattern);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('API error handling', () => {
    it('should throw descriptive error on API failure', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

      await expect(service.getCreativeFeedback('pattern'))
        .rejects.toThrow('Creative feedback failed: API quota exceeded');
    });

    it('should throw descriptive error on audio analysis failure', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network error'));
      const blob = new Blob(['test']);

      await expect(service.analyzeAudio(blob))
        .rejects.toThrow('Audio analysis failed: Network error');
    });

    it('should throw descriptive error on variation suggestion failure', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Invalid request'));

      await expect(service.suggestVariations('pattern'))
        .rejects.toThrow('Variation suggestion failed: Invalid request');
    });
  });
});
