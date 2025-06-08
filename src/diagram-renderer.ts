import { MarkdownPostProcessorContext } from 'obsidian';
import { KrokiClient, KrokiRequestOptions, KrokiResponse } from './kroki-client';
import { DiagramCache } from './diagram-cache';
import { DiagramDetector, DiagramDetectionResult } from './diagram-detector';

/**
 * Interface for diagram rendering options
 */
export interface DiagramRenderOptions {
  outputFormat: string;
  serverUrl: string;
  customHeaders?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  useCache?: boolean;
  debugMode?: boolean;
}

/**
 * Class for rendering diagrams
 */
export class DiagramRenderer {
  private cache: DiagramCache;
  private detector: DiagramDetector;
  
  /**
   * Create a new DiagramRenderer
   * @param diagramTypes - Record of diagram types with their aliases
   * @param cacheSize - Maximum number of entries in the cache
   * @param cacheAge - Maximum age of cache entries in milliseconds
   */
  constructor(
    diagramTypes: Record<string, string[]>,
    cacheSize = 100,
    cacheAge = 3600000
  ) {
    this.cache = new DiagramCache(cacheSize, cacheAge);
    this.detector = new DiagramDetector(diagramTypes);
  }

  /**
   * Update the diagram types
   * @param diagramTypes - Record of diagram types with their aliases
   */
  updateDiagramTypes(diagramTypes: Record<string, string[]>): void {
    this.detector.updateDiagramTypes(diagramTypes);
  }

  /**
   * Render a diagram
   * @param source - The diagram source code
   * @param diagramType - The diagram type
   * @param options - Rendering options
   * @returns Promise with the rendered diagram content
   */
  async renderDiagram(
    source: string,
    diagramType: string,
    options: DiagramRenderOptions
  ): Promise<string> {
    // Check cache if enabled
    if (options.useCache !== false) {
      const cachedContent = this.cache.get(source, diagramType, options.outputFormat);
      if (cachedContent) {
        if (options.debugMode) {
          console.log(`[Kroki Enhanced] Cache hit for ${diagramType} diagram`);
        }
        return cachedContent;
      }
    }
    
    // Prepare request options
    const requestOptions: KrokiRequestOptions = {
      diagramType,
      outputFormat: options.outputFormat,
      source,
      serverUrl: options.serverUrl,
      customHeaders: options.customHeaders,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay
    };
    
    // Log request if debug mode is enabled
    if (options.debugMode) {
      console.log(`[Kroki Enhanced] Rendering ${diagramType} diagram`, {
        source: source.length > 100 ? source.substring(0, 100) + '...' : source,
        options: requestOptions
      });
    }
    
    // Send request to Kroki API
    let response: KrokiResponse;
    try {
      // Try GET request first
      response = await KrokiClient.sendGetRequest(requestOptions);
      
      // If GET fails, try POST
      if (!response.success && response.statusCode !== 400) {
        if (options.debugMode) {
          console.log(`[Kroki Enhanced] GET request failed, trying POST`);
        }
        response = await KrokiClient.sendPostRequest(requestOptions);
      }
    } catch (error) {
      throw new Error(`Failed to render diagram: ${error.message}`);
    }
    
    // Handle response
    if (response.success && response.data) {
      // Cache the result if caching is enabled
      if (options.useCache !== false) {
        this.cache.set(source, response.data, diagramType, options.outputFormat);
      }
      
      return response.data;
    } else {
      throw new Error(`Failed to render diagram: ${response.error || 'Unknown error'}`);
    }
  }

  /**
   * Process a code block and render a diagram if applicable
   * @param source - The source code from the code block
   * @param language - The language identifier from the code block
   * @param context - The markdown post processor context
   * @param options - Rendering options
   * @returns Promise with the rendered diagram content or null if not a supported diagram
   */
  async processCodeBlock(
    source: string,
    language: string,
    context: MarkdownPostProcessorContext,
    options: DiagramRenderOptions
  ): Promise<string | null> {
    // Detect diagram
    const detection = this.detector.detectDiagram(source, language, context);
    if (!detection) {
      return null;
    }
    
    // Apply any diagram-specific options from the language line
    if (detection.options) {
      // Override output format if specified
      if (detection.options.format) {
        options.outputFormat = detection.options.format;
      }
      
      // Add any other options as needed
    }
    
    // Render the diagram
    try {
      return await this.renderDiagram(detection.source, detection.diagramType, options);
    } catch (error) {
      console.error(`[Kroki Enhanced] Error rendering ${detection.diagramType} diagram:`, error);
      throw error;
    }
  }

  /**
   * Clear the diagram cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  getCacheStats(): { size: number, maxSize: number, hitRate?: number, missRate?: number } {
    return this.cache.getStats();
  }
}
