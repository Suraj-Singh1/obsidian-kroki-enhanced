import { MarkdownPostProcessorContext } from 'obsidian';

/**
 * Interface for diagram detection result
 */
export interface DiagramDetectionResult {
  diagramType: string;
  source: string;
  language: string;
  options?: Record<string, string>;
}

/**
 * Class for detecting and parsing diagram code blocks
 */
export class DiagramDetector {
  private diagramTypes: Record<string, string[]>;
  private aliasMap: Map<string, string>;

  /**
   * Create a new DiagramDetector
   * @param diagramTypes - Record of diagram types with their aliases
   */
  constructor(diagramTypes: Record<string, string[]>) {
    this.diagramTypes = diagramTypes;
    this.aliasMap = new Map();
    this.buildAliasMap();
  }

  /**
   * Build a map of language aliases to diagram types
   */
  private buildAliasMap(): void {
    this.aliasMap.clear();
    
    // Add all diagram types and their aliases to the map
    Object.entries(this.diagramTypes).forEach(([diagramType, aliases]) => {
      // Add the primary name
      this.aliasMap.set(diagramType, diagramType);
      
      // Add all aliases
      aliases.forEach(alias => {
        this.aliasMap.set(alias, diagramType);
      });
    });
  }

  /**
   * Update the diagram types and rebuild the alias map
   * @param diagramTypes - Record of diagram types with their aliases
   */
  updateDiagramTypes(diagramTypes: Record<string, string[]>): void {
    this.diagramTypes = diagramTypes;
    this.buildAliasMap();
  }

  /**
   * Detect the diagram type from a language identifier
   * @param language - The language identifier from the code block
   * @returns The corresponding diagram type or null if not found
   */
  detectDiagramType(language: string): string | null {
    return this.aliasMap.get(language) || null;
  }

  /**
   * Parse diagram options from the language line
   * @param language - The language line from the code block
   * @returns Object containing the language and options
   */
  parseLanguageOptions(language: string): { language: string, options: Record<string, string> } {
    const options: Record<string, string> = {};
    
    // Check if the language line contains options
    if (language.includes('{')) {
      // Extract the base language and options string
      const match = language.match(/^(\w+)\s*\{(.+)\}$/);
      if (match) {
        language = match[1];
        
        // Parse the options string
        const optionsStr = match[2];
        const optionPairs = optionsStr.split(',');
        
        // Process each option pair
        optionPairs.forEach(pair => {
          const [key, value] = pair.split(':').map(s => s.trim());
          if (key && value) {
            options[key] = value;
          }
        });
      }
    }
    
    return { language, options };
  }

  /**
   * Detect and parse a diagram from a code block
   * @param source - The source code from the code block
   * @param language - The language identifier from the code block
   * @param context - The markdown post processor context
   * @returns Diagram detection result or null if not a supported diagram
   */
  detectDiagram(source: string, language: string, context: MarkdownPostProcessorContext): DiagramDetectionResult | null {
    // Parse language options
    const { language: baseLanguage, options } = this.parseLanguageOptions(language);
    
    // Detect diagram type
    const diagramType = this.detectDiagramType(baseLanguage);
    if (!diagramType) {
      return null;
    }
    
    // Return the detection result
    return {
      diagramType,
      source,
      language: baseLanguage,
      options
    };
  }

  /**
   * Get all supported language identifiers
   * @returns Array of supported language identifiers
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.aliasMap.keys());
  }
}
