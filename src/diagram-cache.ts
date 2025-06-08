import { TFile } from 'obsidian';

/**
 * Interface for diagram cache entry
 */
export interface DiagramCacheEntry {
  source: string;
  renderedContent: string;
  timestamp: number;
  diagramType: string;
  outputFormat: string;
}

/**
 * Class for caching rendered diagrams
 */
export class DiagramCache {
  private cache: Map<string, DiagramCacheEntry> = new Map();
  private maxCacheSize: number;
  private maxCacheAge: number;

  /**
   * Create a new DiagramCache
   * @param maxCacheSize - Maximum number of entries in the cache
   * @param maxCacheAge - Maximum age of cache entries in milliseconds
   */
  constructor(maxCacheSize = 100, maxCacheAge = 3600000) {
    this.maxCacheSize = maxCacheSize;
    this.maxCacheAge = maxCacheAge;
  }

  /**
   * Generate a cache key for a diagram
   * @param source - The diagram source code
   * @param diagramType - The diagram type
   * @param outputFormat - The output format
   * @param file - Optional file reference for context-specific caching
   * @returns Cache key
   */
  private generateKey(source: string, diagramType: string, outputFormat: string, file?: TFile): string {
    // Create a base key from the diagram properties
    let key = `${diagramType}:${outputFormat}:${source}`;
    
    // If a file is provided, include its path in the key
    if (file) {
      key += `:${file.path}`;
    }
    
    return key;
  }

  /**
   * Get a cached diagram if available
   * @param source - The diagram source code
   * @param diagramType - The diagram type
   * @param outputFormat - The output format
   * @param file - Optional file reference for context-specific caching
   * @returns Cached diagram or null if not found
   */
  get(source: string, diagramType: string, outputFormat: string, file?: TFile): string | null {
    // Generate the cache key
    const key = this.generateKey(source, diagramType, outputFormat, file);
    
    // Check if the key exists in the cache
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      
      // Check if the entry is still valid (not expired)
      if (entry && Date.now() - entry.timestamp <= this.maxCacheAge) {
        return entry.renderedContent;
      } else {
        // Remove expired entry
        this.cache.delete(key);
      }
    }
    
    return null;
  }

  /**
   * Store a rendered diagram in the cache
   * @param source - The diagram source code
   * @param renderedContent - The rendered diagram content
   * @param diagramType - The diagram type
   * @param outputFormat - The output format
   * @param file - Optional file reference for context-specific caching
   */
  set(source: string, renderedContent: string, diagramType: string, outputFormat: string, file?: TFile): void {
    // Generate the cache key
    const key = this.generateKey(source, diagramType, outputFormat, file);
    
    // Create a new cache entry
    const entry: DiagramCacheEntry = {
      source,
      renderedContent,
      timestamp: Date.now(),
      diagramType,
      outputFormat
    };
    
    // Add the entry to the cache
    this.cache.set(key, entry);
    
    // If the cache is too large, remove the oldest entries
    if (this.cache.size > this.maxCacheSize) {
      this.pruneCache();
    }
  }

  /**
   * Remove a specific entry from the cache
   * @param source - The diagram source code
   * @param diagramType - The diagram type
   * @param outputFormat - The output format
   * @param file - Optional file reference for context-specific caching
   * @returns True if the entry was removed, false otherwise
   */
  remove(source: string, diagramType: string, outputFormat: string, file?: TFile): boolean {
    // Generate the cache key
    const key = this.generateKey(source, diagramType, outputFormat, file);
    
    // Remove the entry from the cache
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove the oldest entries from the cache
   */
  private pruneCache(): void {
    // Convert the cache to an array of entries
    const entries = Array.from(this.cache.entries());
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove the oldest entries until we're under the size limit
    const entriesToRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.2));
    for (const [key] of entriesToRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Remove expired entries from the cache
   */
  pruneExpiredEntries(): void {
    const now = Date.now();
    
    // Check each entry for expiration
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxCacheAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get the current size of the cache
   * @returns Number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  getStats(): { size: number, maxSize: number, hitRate?: number, missRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }
}
