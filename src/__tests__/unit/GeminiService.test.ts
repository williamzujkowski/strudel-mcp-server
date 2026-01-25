import { GeminiService, AudioFeedback, CreativeFeedback, PatternSuggestion } from '../../services/GeminiService.js';
import * as path from 'path';
import * as os from 'os';

// Mock the @google/generative-ai module
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  }))
}));

// Mock google-auth-library
jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getClient: jest.fn()
  }))
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn()
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

    it('should return false when API key is not configured and ADC not checked', () => {
      const noKeyService = new GeminiService();
      expect(noKeyService.isAvailable()).toBe(false);
    });
  });

  describe('isAvailableAsync', () => {
    it('should return true when API key is configured', async () => {
      const result = await service.isAvailableAsync();
      expect(result).toBe(true);
    });

    it('should check ADC when no API key', async () => {
      const { GoogleAuth } = require('google-auth-library');
      GoogleAuth.mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue({
          getAccessToken: jest.fn().mockResolvedValue({ token: 'test-token' })
        })
      }));

      const noKeyService = new GeminiService();
      const result = await noKeyService.isAvailableAsync();
      expect(result).toBe(true);
    });

    it('should return false when ADC not available', async () => {
      const { GoogleAuth } = require('google-auth-library');
      GoogleAuth.mockImplementation(() => ({
        getClient: jest.fn().mockRejectedValue(new Error('No credentials'))
      }));

      const noKeyService = new GeminiService();
      const result = await noKeyService.isAvailableAsync();
      expect(result).toBe(false);
    });

    it('should cache ADC check result', async () => {
      const { GoogleAuth } = require('google-auth-library');
      const mockGetClient = jest.fn().mockResolvedValue({
        getAccessToken: jest.fn().mockResolvedValue({ token: 'test-token' })
      });
      GoogleAuth.mockImplementation(() => ({
        getClient: mockGetClient
      }));

      const noKeyService = new GeminiService();
      await noKeyService.isAvailableAsync();
      await noKeyService.isAvailableAsync();
      await noKeyService.isAvailableAsync();

      // getClient should only be called once due to caching
      expect(mockGetClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('ADC-based API calls', () => {
    it('should use ADC when no API key provided', async () => {
      const { GoogleAuth } = require('google-auth-library');
      GoogleAuth.mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue({
          getAccessToken: jest.fn().mockResolvedValue({ token: 'adc-test-token' })
        })
      }));

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "simple"}' }
      });

      const noKeyService = new GeminiService();
      const feedback = await noKeyService.getCreativeFeedback('s("bd sd")');
      expect(feedback.complexity).toBe('simple');
    });

    it('should sync isAvailable after ADC check', async () => {
      const { GoogleAuth } = require('google-auth-library');
      GoogleAuth.mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue({
          getAccessToken: jest.fn().mockResolvedValue({ token: 'adc-test-token' })
        })
      }));

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "simple"}' }
      });

      const noKeyService = new GeminiService();
      // Initially false (ADC not checked)
      expect(noKeyService.isAvailable()).toBe(false);

      // After async check, should be true
      await noKeyService.isAvailableAsync();
      expect(noKeyService.isAvailable()).toBe(true);
    });
  });

  describe('Gemini CLI credential detection', () => {
    let mockReadFile: jest.Mock;

    beforeEach(() => {
      const fs = require('fs/promises');
      mockReadFile = fs.readFile;
      mockReadFile.mockReset();

      // Disable ADC so we can test CLI credentials in isolation
      const { GoogleAuth } = require('google-auth-library');
      GoogleAuth.mockImplementation(() => ({
        getClient: jest.fn().mockRejectedValue(new Error('No ADC'))
      }));
    });

    it('should return primary config path as ~/.gemini/settings.json', () => {
      const service = new GeminiService();
      const configPath = service.getGeminiCliConfigPath();

      // Primary path is always ~/.gemini/settings.json per Gemini CLI docs
      expect(configPath).toBe(path.join(os.homedir(), '.gemini', 'settings.json'));
    });

    it('should return multiple config paths including primary and fallbacks for Linux', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const service = new GeminiService();
      const configPaths = service.getGeminiCliConfigPaths();

      expect(configPaths).toContain(path.join(os.homedir(), '.gemini', 'settings.json'));
      expect(configPaths).toContain(path.join(os.homedir(), '.config', 'gemini', 'settings.json'));
      expect(configPaths[0]).toBe(path.join(os.homedir(), '.gemini', 'settings.json')); // Primary first

      if (originalPlatform) {
        Object.defineProperty(process, 'platform', originalPlatform);
      }
    });

    it('should include macOS-specific path for darwin platform', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const service = new GeminiService();
      const configPaths = service.getGeminiCliConfigPaths();

      expect(configPaths).toContain(path.join(os.homedir(), '.gemini', 'settings.json'));
      expect(configPaths).toContain(path.join(os.homedir(), 'Library', 'Application Support', 'gemini', 'settings.json'));

      if (originalPlatform) {
        Object.defineProperty(process, 'platform', originalPlatform);
      }
    });

    it('should include Windows-specific path for win32 platform', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      const originalAppData = process.env.APPDATA;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.APPDATA = 'C:\\Users\\Test\\AppData\\Roaming';

      const service = new GeminiService();
      const configPaths = service.getGeminiCliConfigPaths();

      expect(configPaths).toContain(path.join(os.homedir(), '.gemini', 'settings.json'));
      expect(configPaths).toContain(path.join('C:\\Users\\Test\\AppData\\Roaming', 'gemini', 'settings.json'));

      if (originalPlatform) {
        Object.defineProperty(process, 'platform', originalPlatform);
      }
      if (originalAppData !== undefined) {
        process.env.APPDATA = originalAppData;
      } else {
        delete process.env.APPDATA;
      }
    });

    it('should load API key from Gemini CLI config using apiKey field', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ apiKey: 'cli-api-key-123' }));

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "simple"}' }
      });

      const noKeyService = new GeminiService();
      const result = await noKeyService.isAvailableAsync();

      expect(result).toBe(true);
    });

    it('should load API key from Gemini CLI config using api_key field', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ api_key: 'cli-api-key-456' }));

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "simple"}' }
      });

      const noKeyService = new GeminiService();
      const result = await noKeyService.isAvailableAsync();

      expect(result).toBe(true);
    });

    it('should load API key from Gemini CLI config using geminiApiKey field', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ geminiApiKey: 'cli-api-key-789' }));

      const noKeyService = new GeminiService();
      const result = await noKeyService.isAvailableAsync();

      expect(result).toBe(true);
    });

    it('should return false when config file does not exist', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const noKeyService = new GeminiService();
      const result = await noKeyService.isAvailableAsync();

      expect(result).toBe(false);
    });

    it('should return false when config file is not valid JSON', async () => {
      mockReadFile.mockResolvedValue('not valid json {{{');

      const noKeyService = new GeminiService();
      const result = await noKeyService.isAvailableAsync();

      expect(result).toBe(false);
    });

    it('should return false when config file has no API key', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ someOtherSetting: 'value' }));

      const noKeyService = new GeminiService();
      const result = await noKeyService.isAvailableAsync();

      expect(result).toBe(false);
    });

    it('should return false when API key is empty string', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ apiKey: '' }));

      const noKeyService = new GeminiService();
      const result = await noKeyService.isAvailableAsync();

      expect(result).toBe(false);
    });

    it('should cache CLI credentials check result', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ apiKey: 'cached-key' }));

      const noKeyService = new GeminiService();
      await noKeyService.loadGeminiCliCredentials();
      await noKeyService.loadGeminiCliCredentials();
      await noKeyService.loadGeminiCliCredentials();

      // readFile should only be called once due to caching
      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });

    it('should prioritize explicit API key over CLI config', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ apiKey: 'cli-key' }));

      const serviceWithKey = new GeminiService({ apiKey: 'explicit-key' });
      const result = await serviceWithKey.isAvailableAsync();

      expect(result).toBe(true);
      // Should not even try to read CLI config
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('should use CLI credentials for API calls when no explicit key', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ apiKey: 'cli-api-key' }));

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "moderate", "estimatedStyle": "techno"}' }
      });

      const noKeyService = new GeminiService();
      const feedback = await noKeyService.getCreativeFeedback('s("bd sd")');

      expect(feedback.complexity).toBe('moderate');
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('should include CLI option in error message when no auth available', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const noKeyService = new GeminiService();

      await expect(noKeyService.getCreativeFeedback('s("bd")'))
        .rejects.toThrow('gemini auth login');
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

    it('should throw when neither API key nor ADC configured', async () => {
      const { GoogleAuth } = require('google-auth-library');
      GoogleAuth.mockImplementation(() => ({
        getClient: jest.fn().mockRejectedValue(new Error('No credentials'))
      }));

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

    it('should throw when neither API key nor ADC configured', async () => {
      const { GoogleAuth } = require('google-auth-library');
      GoogleAuth.mockImplementation(() => ({
        getClient: jest.fn().mockRejectedValue(new Error('No credentials'))
      }));

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

    it('should throw when neither API key nor ADC configured', async () => {
      const { GoogleAuth } = require('google-auth-library');
      GoogleAuth.mockImplementation(() => ({
        getClient: jest.fn().mockRejectedValue(new Error('No credentials'))
      }));

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
      const blob = new Blob(['test-audio-data'], { type: 'audio/webm' });

      await expect(service.analyzeAudio(blob))
        .rejects.toThrow('Audio analysis failed: Network error');
    });

    it('should throw descriptive error on variation suggestion failure', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Invalid request'));

      await expect(service.suggestVariations('pattern'))
        .rejects.toThrow('Variation suggestion failed: Invalid request');
    });
  });

  describe('input validation', () => {
    it('should throw on empty pattern for getCreativeFeedback', async () => {
      await expect(service.getCreativeFeedback(''))
        .rejects.toThrow('Pattern cannot be empty');
    });

    it('should throw on whitespace-only pattern for getCreativeFeedback', async () => {
      await expect(service.getCreativeFeedback('   \n\t   '))
        .rejects.toThrow('Pattern cannot be empty');
    });

    it('should throw on null pattern for suggestVariations', async () => {
      await expect(service.suggestVariations(null as any))
        .rejects.toThrow('Pattern is required');
    });

    it('should throw on undefined pattern for suggestVariations', async () => {
      await expect(service.suggestVariations(undefined as any))
        .rejects.toThrow('Pattern is required');
    });

    it('should throw on non-string pattern', async () => {
      await expect(service.getCreativeFeedback(123 as any))
        .rejects.toThrow('Pattern must be a string');
    });

    it('should throw on pattern exceeding max length', async () => {
      const longPattern = 's("bd")'.repeat(1000); // ~7000 chars
      await expect(service.getCreativeFeedback(longPattern))
        .rejects.toThrow('exceeds maximum length');
    });

    it('should include current length in max length error', async () => {
      const longPattern = 's("bd")'.repeat(1000); // ~7000 chars
      await expect(service.getCreativeFeedback(longPattern))
        .rejects.toThrow(/current: \d+/);
    });

    it('should throw on empty audio blob', async () => {
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      await expect(service.analyzeAudio(emptyBlob))
        .rejects.toThrow('Audio analysis requires valid audio data');
    });

    it('should accept pattern at max length', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "simple"}' }
      });

      // Create a pattern just under the default 5000 char limit
      const pattern = 's("bd")'.repeat(700); // ~4900 chars
      const feedback = await service.getCreativeFeedback(pattern);
      expect(feedback.complexity).toBe('simple');
    });
  });

  describe('rate limit error messages', () => {
    it('should include wait time in rate limit error', async () => {
      const fastService = new GeminiService({ apiKey: 'test-key' });

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "simple"}' }
      });

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await fastService.getCreativeFeedback(`pattern${i}`);
      }

      // Next request should fail with wait time
      await expect(fastService.getCreativeFeedback('one-more'))
        .rejects.toThrow(/Wait \d+ seconds/);
    });

    it('should provide getSecondsUntilAvailable method', async () => {
      const fastService = new GeminiService({ apiKey: 'test-key' });

      // Initially should be 0
      expect(fastService.getSecondsUntilAvailable()).toBe(0);

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"complexity": "simple"}' }
      });

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await fastService.getCreativeFeedback(`pattern${i}`);
      }

      // Should return positive wait time
      const waitTime = fastService.getSecondsUntilAvailable();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(60);
    });
  });

  describe('timeout handling', () => {
    it('should use configurable timeout', () => {
      const customService = new GeminiService({
        apiKey: 'test-key',
        timeoutSeconds: 60
      });

      expect(customService.isAvailable()).toBe(true);
    });

    it('should use configurable max pattern length', async () => {
      const customService = new GeminiService({
        apiKey: 'test-key',
        maxPatternLength: 100
      });

      const longPattern = 's("bd")'.repeat(20); // 140 chars
      await expect(customService.getCreativeFeedback(longPattern))
        .rejects.toThrow('exceeds maximum length of 100');
    });
  });
});
