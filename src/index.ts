import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StrudelController } from './StrudelController.js';
import { PatternStore } from './PatternStore.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

class StrudelMCPServer {
  private server: Server;
  private controller: StrudelController;
  private store: PatternStore;

  constructor() {
    this.server = new Server(
      {
        name: 'strudel-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.controller = new StrudelController(config.headless);
    this.store = new PatternStore('./patterns');
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'init',
          description: 'Initialize Strudel in browser',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'write',
          description: 'Write a pattern to the editor',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'TidalCycles/Strudel pattern code',
              },
            },
            required: ['pattern'],
          },
        },
        {
          name: 'play',
          description: 'Start playing the current pattern',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'stop',
          description: 'Stop playing',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'analyze',
          description: 'Get audio analysis of current output',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'save',
          description: 'Save current pattern locally',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Pattern name',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags for categorization',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'load',
          description: 'Load a saved pattern',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Pattern name to load',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'list',
          description: 'List saved patterns',
          inputSchema: {
            type: 'object',
            properties: {
              tag: {
                type: 'string',
                description: 'Filter by tag (optional)',
              },
            },
          },
        },
        {
          name: 'append',
          description: 'Append code to current pattern',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Code to append',
              },
            },
            required: ['code'],
          },
        },
        {
          name: 'clear',
          description: 'Clear the editor',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        let result: string;
        
        switch (name) {
          case 'init':
            result = await this.controller.initialize();
            break;
            
          case 'write':
            result = await this.controller.writePattern((args as any).pattern);
            break;
            
          case 'play':
            result = await this.controller.play();
            break;
            
          case 'stop':
            result = await this.controller.stop();
            break;
            
          case 'analyze':
            const analysis = await this.controller.analyzeAudio();
            result = JSON.stringify(analysis, null, 2);
            break;
            
          case 'save':
            const pattern = await this.controller.getCurrentPattern();
            await this.store.save((args as any).name, pattern, (args as any).tags || []);
            result = `Pattern saved as "${(args as any).name}"`;
            break;
            
          case 'load':
            const saved = await this.store.load((args as any).name);
            if (saved) {
              await this.controller.writePattern(saved.content);
              result = `Loaded pattern "${(args as any).name}"`;
            } else {
              result = `Pattern "${(args as any).name}" not found`;
            }
            break;
            
          case 'list':
            const patterns = await this.store.list((args as any)?.tag);
            result = patterns.map(p => 
              `• ${p.name} [${p.tags.join(', ')}] - ${p.timestamp}`
            ).join('\n');
            break;
            
          case 'append':
            const current = await this.controller.getCurrentPattern();
            await this.controller.writePattern(current + '\n' + (args as any).code);
            result = 'Code appended';
            break;
            
          case 'clear':
            await this.controller.writePattern('');
            result = 'Editor cleared';
            break;
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        return {
          content: [{ type: 'text', text: result }],
        };
      } catch (error: any) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error: ${error.message}` 
          }],
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Strudel MCP server running');
    
    process.on('SIGINT', async () => {
      await this.controller.cleanup();
      process.exit(0);
    });
  }
}

const server = new StrudelMCPServer();
server.run().catch(console.error);