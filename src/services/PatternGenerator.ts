import { MusicTheory } from './MusicTheory.js';

export class PatternGenerator {
  private theory = new MusicTheory();

  generateDrumPattern(style: string, complexity: number = 1): string {
    const patterns: Record<string, string[]> = {
      techno: [
        's("bd*4")',
        's("bd*4, ~ cp ~ cp")',
        's("bd*4, ~ cp ~ cp, hh*8")',
        's("bd*4, ~ cp ~ cp, [~ hh]*4, oh ~ ~ ~").swing(0.05)'
      ],
      house: [
        's("bd*4, hh*8")',
        's("bd*4, hh*8, ~ cp ~ cp")',
        's("bd*4, [~ hh]*4, ~ cp ~ cp, oh ~ oh ~")',
        's("bd*4, [~ hh]*4, ~ cp ~ cp").every(4, x => x.fast(2))'
      ],
      dnb: [
        's("bd ~ ~ bd ~ ~ bd ~, ~ ~ cp ~ ~ cp ~ ~")',
        's("bd ~ ~ [bd bd] ~ ~ bd ~, ~ ~ cp ~ ~ cp ~ ~, hh*16")',
        's("bd ~ ~ [bd bd] ~ ~ bd ~, ~ ~ cp ~ [~ cp] ~ cp ~ ~, hh*16").fast(2)'
      ],
      breakbeat: [
        's("bd ~ ~ bd ~ ~ ~ bd, ~ cp ~ ~ cp ~")',
        's("bd ~ ~ bd ~ [~ bd] ~ bd, ~ cp ~ ~ cp ~, hh*8")',
        's("bd ~ [~ bd] bd ~ [~ bd] ~ bd, ~ cp ~ ~ cp [~ cp], hh*8").swing(0.1)'
      ],
      trap: [
        's("bd*2, ~ cp ~ cp")',
        's("bd*2, ~ cp ~ cp, hh*8").every(2, x => x.fast(2))',
        's("bd [bd bd] ~ bd, ~ cp ~ cp, hh*16").swing(0.2)'
      ],
      jungle: [
        's("bd ~ [~ bd] bd ~ ~ bd ~, ~ cp ~ ~ cp ~").fast(2)',
        's("bd ~ [~ bd] bd ~ [bd bd] bd ~, ~ cp ~ [~ cp] cp ~, hh*32").fast(2)'
      ],
      ambient: [
        's("bd ~ ~ ~")',
        's("bd ~ ~ ~, ~ ~ ~ hh:8").room(0.9)',
        's("bd ~ ~ ~, ~ ~ ~ hh:8, ~ ~ oh:5 ~").room(0.9).gain(0.5)'
      ],
      experimental: [
        's("bd").euclid(5, 8)',
        's("bd cp").euclid(7, 16)',
        's("bd cp hh").euclid(choose([3, 5, 7]), 16)'
      ]
    };

    const stylePatterns = patterns[style] || patterns.techno;
    const index = Math.min(Math.floor(complexity * stylePatterns.length), stylePatterns.length - 1);
    return stylePatterns[index];
  }

  generateBassline(key: string, style: string): string {
    const patterns: Record<string, string> = {
      techno: `note("${key}2 ${key}2 ${key}2 ${key}2").s("sawtooth").cutoff(800)`,
      house: `note("${key}2 ~ ${key}2 ~").s("sine").gain(0.8)`,
      dnb: `note("${key}1 ~ ~ ${key}2 ~ ${key}1 ~ ~").s("square").cutoff(400)`,
      acid: `note("${key}2 ${key}3 ${key}2 ${this.theory.getNote(key, 3)}2").s("sawtooth").cutoff(sine.range(200, 2000).slow(4))`,
      dub: `note("${key}1 ~ ~ ~ ${key}1 ~ ${this.theory.getNote(key, 5)}1 ~").s("sine:2").room(0.5)`,
      funk: `note("${key}2 ${key}2 ~ ${this.theory.getNote(key, 5)}2 ~ ${key}2 ${this.theory.getNote(key, 7)}2 ~").s("square").cutoff(1200)`,
      jazz: `note("${key}2 ~ ${this.theory.getNote(key, 4)}2 ~ ${this.theory.getNote(key, 7)}2 ~").s("sine").gain(0.7)`,
      ambient: `note("${key}1").s("sine").attack(2).release(4).gain(0.6)`
    };

    return patterns[style] || patterns.techno;
  }

  generateMelody(scale: string[], length: number = 8, octaveRange: [number, number] = [3, 5]): string {
    const notes = [];
    let lastNoteIndex = Math.floor(Math.random() * scale.length);
    
    for (let i = 0; i < length; i++) {
      // Create more musical intervals (prefer steps over leaps)
      const stepProbability = 0.7;
      const useStep = Math.random() < stepProbability;
      
      let noteIndex: number;
      if (useStep) {
        // Move by step (1 or 2 scale degrees)
        const step = Math.random() < 0.5 ? 1 : -1;
        noteIndex = (lastNoteIndex + step + scale.length) % scale.length;
      } else {
        // Leap to any note
        noteIndex = Math.floor(Math.random() * scale.length);
      }
      
      const note = scale[noteIndex];
      const octave = octaveRange[0] + Math.floor(Math.random() * (octaveRange[1] - octaveRange[0] + 1));
      notes.push(`${note.toLowerCase()}${octave}`);
      lastNoteIndex = noteIndex;
    }
    
    return `note("${notes.join(' ')}").s("triangle")`;
  }

  generateChords(progression: string, voicing: string = 'triad'): string {
    const voicings: Record<string, string> = {
      triad: '.struct("1 ~ ~ ~")',
      seventh: '.struct("1 ~ ~ ~").add(note("7"))',
      sustained: '.attack(0.5).release(2)',
      stab: '.struct("1 ~ 1 ~").release(0.1)',
      pad: '.attack(2).release(4).room(0.8)'
    };
    
    return `note(${progression}).s("sawtooth")${voicings[voicing] || voicings.triad}`;
  }

  generateCompletePattern(style: string, key: string = 'C', bpm: number = 120): string {
    const drums = this.generateDrumPattern(style, 0.7);
    const bass = this.generateBassline(key, style);
    const scale = this.theory.generateScale(key, style === 'jazz' ? 'dorian' : 'minor');
    const melody = this.generateMelody(scale);
    
    const chordStyle = style === 'jazz' ? 'jazz' : 
                      style === 'house' ? 'pop' : 
                      style === 'techno' ? 'edm' : 'pop';
    const progression = this.theory.generateChordProgression(key, chordStyle as any);
    const chords = this.generateChords(progression, style === 'ambient' ? 'pad' : 'stab');
    
    return `// ${style} pattern in ${key} at ${bpm} BPM
setcpm(${bpm})

stack(
  // Drums
  ${drums},
  
  // Bass
  ${bass},
  
  // Chords
  ${chords}.gain(0.6),
  
  // Melody
  ${melody}.struct("~ 1 ~ 1 1 ~ 1 ~").delay(0.25).room(0.3).gain(0.5)
).gain(0.8)`;
  }

  generateVariation(pattern: string, variationType: string = 'subtle'): string {
    const variations: Record<string, string> = {
      subtle: '.sometimes(x => x.fast(2))',
      moderate: '.every(4, x => x.rev).sometimes(x => x.fast(2))',
      extreme: '.every(2, x => x.jux(rev)).sometimes(x => x.iter(4))',
      glitch: '.sometimes(x => x.chop(8).rev).rarely(x => x.speed(-1))',
      evolving: '.slow(4).every(8, x => x.fast(2)).every(16, x => x.palindrome)'
    };
    
    return pattern + (variations[variationType] || variations.subtle);
  }

  generateFill(style: string, bars: number = 1): string {
    const fills: Record<string, string> = {
      techno: `s("bd*8, cp*4").fast(${bars})`,
      house: `s("bd*4, cp*2, hh*16").fast(${bars})`,
      dnb: `s("bd*8, sn*8").fast(${bars * 2})`,
      trap: `s("bd*4, hh*32").fast(${bars})`,
      breakbeat: `s("bd cp bd cp, hh*8").iter(4).fast(${bars})`
    };
    
    return fills[style] || fills.techno;
  }

  generateTransition(fromStyle: string, toStyle: string, bars: number = 4): string {
    return `// Transition from ${fromStyle} to ${toStyle}
stack(
  // Fade out ${fromStyle}
  ${this.generateDrumPattern(fromStyle, 0.5)}.gain(perlin.range(0.8, 0).slow(${bars})),
  
  // Fade in ${toStyle}
  ${this.generateDrumPattern(toStyle, 0.5)}.gain(perlin.range(0, 0.8).slow(${bars}))
)`;
  }

  generateEuclideanPattern(hits: number, steps: number, sound: string = "bd"): string {
    const rhythm = this.theory.generateEuclideanRhythm(hits, steps);
    return `s("${sound}").struct("${rhythm}")`;
  }

  generatePolyrhythm(sounds: string[], patterns: number[]): string {
    if (sounds.length !== patterns.length) {
      throw new Error('Number of sounds must match number of patterns');
    }
    
    const rhythms = sounds.map((sound, i) => {
      return `s("${sound}").euclid(${patterns[i]}, 16)`;
    });
    
    return `stack(\n  ${rhythms.join(',\n  ')}\n)`;
  }
}