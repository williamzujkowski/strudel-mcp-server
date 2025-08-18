export class MusicTheory {
  private scales = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    blues: [0, 3, 5, 6, 7, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    wholetone: [0, 2, 4, 6, 8, 10],
    harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
    melodic_minor: [0, 2, 3, 5, 7, 9, 11]
  };

  private chordProgressions = {
    pop: ['I', 'V', 'vi', 'IV'],
    jazz: ['IIM7', 'V7', 'IM7'],
    blues: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    folk: ['I', 'IV', 'I', 'V'],
    rock: ['I', 'bVII', 'IV', 'I'],
    classical: ['I', 'IV', 'V', 'I'],
    modal: ['i', 'bVII', 'IV', 'i'],
    edm: ['i', 'VI', 'III', 'VII']
  };

  generateScale(root: string, scaleName: keyof typeof this.scales): string[] {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIndex = noteNames.indexOf(root.toUpperCase());
    if (rootIndex === -1) {
      throw new Error(`Invalid root note: ${root}`);
    }
    
    const scale = this.scales[scaleName];
    if (!scale) {
      throw new Error(`Invalid scale: ${scaleName}`);
    }
    
    return scale.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      return noteNames[noteIndex];
    });
  }

  generateChordProgression(key: string, style: keyof typeof this.chordProgressions): string {
    const progression = this.chordProgressions[style];
    if (!progression) {
      throw new Error(`Invalid progression style: ${style}`);
    }
    
    const chordMap: Record<string, string> = {
      'I': `"${key}"`,
      'I7': `"${key}7"`,
      'i': `"${key.toLowerCase()}m"`,
      'ii': `"${this.getNote(key, 2)}m"`,
      'IIM7': `"${this.getNote(key, 2)}m7"`,
      'iii': `"${this.getNote(key, 4)}m"`,
      'III': `"${this.getNote(key, 4)}"`,
      'IV': `"${this.getNote(key, 5)}"`,
      'IV7': `"${this.getNote(key, 5)}7"`,
      'V': `"${this.getNote(key, 7)}"`,
      'V7': `"${this.getNote(key, 7)}7"`,
      'vi': `"${this.getNote(key, 9)}m"`,
      'VI': `"${this.getNote(key, 9)}"`,
      'VII': `"${this.getNote(key, 11)}"`,
      'bVII': `"${this.getNote(key, 10)}"`,
      'IM7': `"${key}maj7"`
    };

    return progression
      .map(chord => chordMap[chord] || `"${key}"`)
      .join(' ');
  }

  getNote(root: string, semitones: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIndex = noteNames.indexOf(root.toUpperCase());
    if (rootIndex === -1) return root;
    return noteNames[(rootIndex + semitones) % 12];
  }

  generateEuclideanRhythm(hits: number, steps: number): string {
    if (hits > steps) {
      throw new Error('Hits cannot exceed steps');
    }
    
    const pattern: boolean[] = new Array(steps).fill(false);
    const interval = steps / hits;
    
    for (let i = 0; i < hits; i++) {
      const index = Math.floor(i * interval);
      pattern[index] = true;
    }
    
    return pattern.map(hit => hit ? '1' : '~').join(' ');
  }

  generatePolyrhythm(pattern1: number, pattern2: number, length: number = 16): string {
    const rhythm1 = this.generateEuclideanRhythm(pattern1, length);
    const rhythm2 = this.generateEuclideanRhythm(pattern2, length);
    return `[${rhythm1}], [${rhythm2}]`;
  }

  getScaleNotes(root: string, scaleName: keyof typeof this.scales, octave: number = 3): string[] {
    const scale = this.generateScale(root, scaleName);
    return scale.map(note => `${note.toLowerCase()}${octave}`);
  }

  generateArpeggio(chord: string, pattern: string = 'up'): string {
    const patterns: Record<string, number[]> = {
      'up': [0, 1, 2, 3],
      'down': [3, 2, 1, 0],
      'updown': [0, 1, 2, 3, 2, 1],
      'random': [0, 2, 1, 3, 0, 3, 1, 2]
    };
    
    const arpPattern = patterns[pattern] || patterns['up'];
    const notes = this.getChordNotes(chord);
    
    return arpPattern
      .map(index => notes[index % notes.length])
      .join(' ');
  }

  private getChordNotes(chord: string): string[] {
    // Simplified chord parsing - would need more sophisticated implementation
    const root = chord.replace(/[^A-G#]/g, '');
    const type = chord.replace(/[A-G#]/g, '');
    
    const intervals: Record<string, number[]> = {
      '': [0, 4, 7], // major
      'm': [0, 3, 7], // minor
      '7': [0, 4, 7, 10], // dominant 7
      'maj7': [0, 4, 7, 11], // major 7
      'm7': [0, 3, 7, 10], // minor 7
      'dim': [0, 3, 6], // diminished
      'aug': [0, 4, 8] // augmented
    };
    
    const chordIntervals = intervals[type] || intervals[''];
    return chordIntervals.map(interval => {
      const note = this.getNote(root, interval);
      return `${note.toLowerCase()}3`;
    });
  }
}