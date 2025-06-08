import { Notice, TFile, TFolder, Vault } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Interface for export options
 */
export interface ExportOptions {
  format: string;
  outputPath?: string;
  customArgs?: string[];
  customStyles?: string;
  includeImages?: boolean;
  metadata?: Record<string, string>;
}

/**
 * Interface for export result
 */
export interface ExportResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  command?: string;
}

/**
 * Class for handling Pandoc exports
 */
export class PandocExporter {
  private pandocPath: string;
  private vault: Vault;
  private tempDir: string;

  /**
   * Create a new PandocExporter
   * @param pandocPath - Path to the Pandoc executable
   * @param vault - Obsidian vault
   */
  constructor(pandocPath: string, vault: Vault) {
    this.pandocPath = pandocPath;
    this.vault = vault;
    this.tempDir = path.join(os.tmpdir(), 'obsidian-kroki-export');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Check if Pandoc is available
   * @returns Promise with boolean indicating if Pandoc is available
   */
  async isPandocAvailable(): Promise<boolean> {
    try {
      await execAsync(`${this.pandocPath} --version`);
      return true;
    } catch (error) {
      console.error('Pandoc not available:', error);
      return false;
    }
  }

  /**
   * Export a file using Pandoc
   * @param file - The file to export
   * @param options - Export options
   * @returns Promise with export result
   */
  async exportFile(file: TFile, options: ExportOptions): Promise<ExportResult> {
    try {
      // Check if Pandoc is available
      if (!await this.isPandocAvailable()) {
        return {
          success: false,
          error: `Pandoc not found at path: ${this.pandocPath}. Please check your settings.`
        };
      }
      
      // Get file content
      const content = await this.vault.read(file);
      
      // Create a temporary input file
      const inputPath = path.join(this.tempDir, `${file.basename}-input.md`);
      fs.writeFileSync(inputPath, content);
      
      // Determine output path
      const outputPath = options.outputPath || path.join(
        this.tempDir, 
        `${file.basename}.${options.format}`
      );
      
      // Prepare Pandoc arguments
      const args = this.buildPandocArgs(inputPath, outputPath, options);
      
      // Execute Pandoc
      const command = `${this.pandocPath} ${args.join(' ')}`;
      
      console.log('Executing Pandoc command:', command);
      
      await execAsync(command);
      
      // Check if output file exists
      if (!fs.existsSync(outputPath)) {
        return {
          success: false,
          error: 'Export failed: Output file not created',
          command
        };
      }
      
      return {
        success: true,
        outputPath,
        command
      };
    } catch (error) {
      console.error('Export error:', error);
      return {
        success: false,
        error: `Export failed: ${error.message}`,
        command: error.cmd
      };
    }
  }

  /**
   * Build Pandoc command-line arguments
   * @param inputPath - Path to input file
   * @param outputPath - Path to output file
   * @param options - Export options
   * @returns Array of command-line arguments
   */
  private buildPandocArgs(inputPath: string, outputPath: string, options: ExportOptions): string[] {
    const args: string[] = [];
    
    // Input file
    args.push(`"${inputPath}"`);
    
    // Output file
    args.push(`-o "${outputPath}"`);
    
    // Format
    args.push(`-t ${options.format}`);
    
    // Include images
    if (options.includeImages) {
      args.push('--embed-resources');
      args.push('--standalone');
    }
    
    // Add metadata
    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        args.push(`--metadata=${key}="${value}"`);
      });
    }
    
    // Add custom styles
    if (options.customStyles) {
      const stylesPath = path.join(this.tempDir, 'custom-styles.css');
      fs.writeFileSync(stylesPath, options.customStyles);
      
      if (options.format === 'html' || options.format === 'html5') {
        args.push(`--css="${stylesPath}"`);
      } else if (options.format === 'pdf' || options.format === 'latex') {
        args.push(`--include-in-header="${stylesPath}"`);
      }
    }
    
    // Add custom arguments
    if (options.customArgs && options.customArgs.length > 0) {
      args.push(...options.customArgs);
    }
    
    return args;
  }

  /**
   * Clean up temporary files
   */
  cleanup(): void {
    try {
      // Delete all files in temp directory
      const files = fs.readdirSync(this.tempDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(this.tempDir, file));
      });
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}
