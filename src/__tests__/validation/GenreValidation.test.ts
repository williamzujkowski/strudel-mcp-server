import { PatternGenerator } from '../../services/PatternGenerator';
import { MusicTheory } from '../../services/MusicTheory';
import { PatternValidator } from '../../utils/PatternValidator';

describe('Genre Validation Suite', () => {
  let generator: PatternGenerator;
  let theory: MusicTheory;
  let validator: PatternValidator;

  beforeEach(() => {
    theory = new MusicTheory();
    generator = new PatternGenerator(theory);
    validator = new PatternValidator();
  });

  describe('Techno Generation', () => {
    it('should generate valid techno pattern with correct BPM range', () => {
      const pattern = generator.generateCompletePattern('techno', 'A', 135);

      expect(pattern).toBeTruthy();
      expect(pattern.length).toBeGreaterThan(0);

      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });

    it('should generate hard techno with characteristic elements', () => {
      const pattern = generator.generateCompletePattern('techno', 'A', 138);

      // Should contain drum elements
      expect(pattern).toMatch(/bd|kick/i);
      // Should have repetitive structure
      expect(pattern).toMatch(/\*/);
    });

    it('should generate minimal techno at lower BPM', () => {
      const pattern = generator.generateCompletePattern('techno', 'E', 125);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });
  });

  describe('House Generation', () => {
    it('should generate valid house pattern with 4/4 groove', () => {
      const pattern = generator.generateCompletePattern('house', 'D', 125);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });

    it('should generate deep house with soulful elements', () => {
      const pattern = generator.generateCompletePattern('house', 'D', 122);

      // Should contain characteristic house drums
      expect(pattern).toMatch(/bd|cp|hh/i);
    });

    it('should generate tech house at correct BPM', () => {
      const pattern = generator.generateCompletePattern('house', 'A', 128);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Drum & Bass Generation', () => {
    it('should generate valid DnB pattern with fast tempo', () => {
      const pattern = generator.generateCompletePattern('dnb', 'E', 174);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });

    it('should generate liquid DnB with atmospheric elements', () => {
      const pattern = generator.generateCompletePattern('dnb', 'C', 172);

      // Should have fast drum patterns
      expect(pattern).toMatch(/bd|sn/i);
    });

    it('should generate neurofunk at high BPM', () => {
      const pattern = generator.generateCompletePattern('dnb', 'F#', 178);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Ambient Generation', () => {
    it('should generate valid ambient pattern with slow tempo', () => {
      const pattern = generator.generateCompletePattern('ambient', 'C', 70);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });

    it('should generate dark ambient with sparse elements', () => {
      const pattern = generator.generateCompletePattern('ambient', 'C', 65);

      // Ambient patterns should exist and be valid
      expect(pattern.length).toBeGreaterThan(0);
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });

    it('should generate drone with minimal rhythm', () => {
      const pattern = generator.generateCompletePattern('ambient', 'G', 60);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Trap Generation', () => {
    it('should generate valid trap pattern with half-time feel', () => {
      const pattern = generator.generateCompletePattern('trap', 'F#', 140);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });

    it('should generate modern trap with 808 elements', () => {
      const pattern = generator.generateCompletePattern('trap', 'F#', 142);

      // Should contain drum patterns
      expect(pattern).toMatch(/bd|hh/i);
    });

    it('should generate cloud trap at lower BPM', () => {
      const pattern = generator.generateCompletePattern('trap', 'B', 135);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Jungle Generation', () => {
    it('should generate valid jungle pattern with complex breaks', () => {
      const pattern = generator.generateCompletePattern('jungle', 'G', 165);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });

    it('should generate classic jungle with characteristic elements', () => {
      const pattern = generator.generateCompletePattern('jungle', 'G', 168);

      // Should have fast, complex patterns
      expect(pattern).toMatch(/bd|sn/i);
    });

    it('should generate ragga jungle', () => {
      const pattern = generator.generateCompletePattern('jungle', 'D', 170);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Jazz Generation', () => {
    it('should generate valid jazz pattern with swing feel', () => {
      const pattern = generator.generateCompletePattern('jazz', 'A#', 120);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });

    it('should generate bebop at fast tempo', () => {
      const pattern = generator.generateCompletePattern('jazz', 'A#', 180);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });

    it('should generate modal jazz', () => {
      const pattern = generator.generateCompletePattern('jazz', 'D', 120);

      expect(pattern).toBeTruthy();
      const validation = validator.validate(pattern);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Cross-Genre Validation', () => {
    const genres = ['techno', 'house', 'dnb', 'ambient', 'trap', 'jungle', 'jazz'];
    const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'A#'];

    genres.forEach(genre => {
      it(`should generate valid ${genre} patterns across different keys`, () => {
        keys.forEach(key => {
          const bpm = genre === 'dnb' || genre === 'jungle' ? 170 :
                      genre === 'ambient' ? 70 : 130;

          const pattern = generator.generateCompletePattern(genre, key, bpm);

          expect(pattern).toBeTruthy();
          expect(pattern.length).toBeGreaterThan(0);

          const validation = validator.validate(pattern);
          expect(validation.valid).toBe(true);
        });
      });
    });

    it('should generate distinct patterns for each genre', () => {
      const patterns = genres.map(genre => {
        const bpm = genre === 'dnb' || genre === 'jungle' ? 170 :
                    genre === 'ambient' ? 70 : 130;
        return generator.generateCompletePattern(genre, 'A', bpm);
      });

      // Each pattern should be unique
      const uniquePatterns = new Set(patterns);
      expect(uniquePatterns.size).toBe(genres.length);
    });
  });

  describe('BPM Range Validation', () => {
    const bpmRanges: Record<string, { min: number; max: number }> = {
      techno: { min: 120, max: 140 },
      house: { min: 120, max: 130 },
      dnb: { min: 160, max: 180 },
      ambient: { min: 60, max: 90 },
      trap: { min: 130, max: 150 },
      jungle: { min: 160, max: 180 },
      jazz: { min: 100, max: 180 }
    };

    Object.entries(bpmRanges).forEach(([genre, range]) => {
      it(`should generate valid ${genre} at minimum BPM (${range.min})`, () => {
        const pattern = generator.generateCompletePattern(genre, 'A', range.min);

        expect(pattern).toBeTruthy();
        const validation = validator.validate(pattern);
        expect(validation.valid).toBe(true);
      });

      it(`should generate valid ${genre} at maximum BPM (${range.max})`, () => {
        const pattern = generator.generateCompletePattern(genre, 'A', range.max);

        expect(pattern).toBeTruthy();
        const validation = validator.validate(pattern);
        expect(validation.valid).toBe(true);
      });
    });
  });

  describe('Pattern Component Validation', () => {
    it('should generate patterns with drum components', () => {
      const pattern = generator.generateDrumPattern('techno', 1);

      expect(pattern).toBeTruthy();
      expect(pattern).toMatch(/s\(/);
    });

    it('should generate patterns with bassline components', () => {
      const pattern = generator.generateBassline('D', 'house');

      expect(pattern).toBeTruthy();
      expect(pattern).toMatch(/note\(/);
    });

    it('should generate patterns with melodic components', () => {
      const pattern = generator.generateCompletePattern('jazz', 'A#', 120);

      expect(pattern).toBeTruthy();
      // Should contain both rhythmic and tonal elements
      expect(pattern.length).toBeGreaterThan(20);
    });
  });

  describe('Pattern Safety Validation', () => {
    const genres = ['techno', 'house', 'dnb', 'ambient', 'trap', 'jungle', 'jazz'];

    genres.forEach(genre => {
      it(`should generate safe ${genre} patterns (no dangerous gain levels)`, () => {
        const pattern = generator.generateCompletePattern(genre, 'A', 130);

        // Should not contain dangerous gain levels
        expect(pattern).not.toMatch(/gain\s*\(\s*[3-9]|gain\s*\(\s*[1-9]\d/);
      });
    });
  });
});
