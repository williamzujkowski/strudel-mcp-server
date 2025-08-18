import { promises as fs } from 'fs';
import path from 'path';

interface PatternData {
  name: string;
  content: string;
  tags: string[];
  timestamp: string;
  audioFeatures?: any;
}

export class PatternStore {
  constructor(private basePath: string) {
    this.ensureDirectory();
  }

  private async ensureDirectory() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create patterns directory:', error);
    }
  }

  async save(name: string, content: string, tags: string[] = []): Promise<void> {
    const filename = this.sanitizeFilename(name) + '.json';
    const filepath = path.join(this.basePath, filename);
    
    const data: PatternData = {
      name,
      content,
      tags,
      timestamp: new Date().toISOString(),
    };
    
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
  }

  async load(name: string): Promise<PatternData | null> {
    const filename = this.sanitizeFilename(name) + '.json';
    const filepath = path.join(this.basePath, filename);
    
    try {
      const data = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async list(tag?: string): Promise<PatternData[]> {
    try {
      const files = await fs.readdir(this.basePath);
      const patterns: PatternData[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(
            path.join(this.basePath, file), 
            'utf-8'
          );
          const pattern = JSON.parse(data);
          
          if (!tag || pattern.tags.includes(tag)) {
            patterns.push(pattern);
          }
        }
      }
      
      return patterns.sort((a, b) => 
        b.timestamp.localeCompare(a.timestamp)
      );
    } catch {
      return [];
    }
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  }
}