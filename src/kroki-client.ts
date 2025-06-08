import { requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian';
import * as pako from 'pako';

/**
 * Interface for Kroki API request options
 */
export interface KrokiRequestOptions {
  diagramType: string;
  outputFormat: string;
  source: string;
  serverUrl: string;
  customHeaders?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * Interface for Kroki API response
 */
export interface KrokiResponse {
  success: boolean;
  data?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Class for handling Kroki API requests
 */
export class KrokiClient {
  /**
   * Encode diagram source for GET requests
   * @param source - The diagram source code
   * @returns Encoded diagram source
   */
  static encodeDiagramSource(source: string): string {
    // Remove any leading/trailing whitespace
    source = source.trim();
    
    // Replace HTML entities
    source = source.replace(/&nbsp;/gi, ' ');
    source = source.replace(/&gt;/gi, '>');
    source = source.replace(/&lt;/gi, '<');
    
    try {
      // Compress the source using pako (deflate)
      const compressed = pako.deflate(source, { level: 9 });
      
      // Convert to base64
      const base64 = Buffer.from(compressed).toString('base64');
      
      // Make it URL safe
      return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } catch (error) {
      console.error('Error encoding diagram source:', error);
      throw new Error('Failed to encode diagram source');
    }
  }

  /**
   * Send a GET request to the Kroki API
   * @param options - The request options
   * @returns Promise with the Kroki response
   */
  static async sendGetRequest(options: KrokiRequestOptions): Promise<KrokiResponse> {
    try {
      // Ensure server URL ends with a slash
      const serverUrl = options.serverUrl.endsWith('/') 
        ? options.serverUrl 
        : options.serverUrl + '/';
      
      // Encode the diagram source
      const encodedSource = this.encodeDiagramSource(options.source);
      
      // Build the full URL
      const url = `${serverUrl}${options.diagramType}/${options.outputFormat}/${encodedSource}`;
      
      // Prepare request parameters
      const requestParams: RequestUrlParam = {
        url: url,
        method: 'GET',
        headers: {
          'Accept': 'image/svg+xml, image/png',
          ...options.customHeaders
        },
        throw: false
      };
      
      // Send the request
      const response = await this.sendRequestWithRetry(
        requestParams, 
        options.retryCount || 1, 
        options.retryDelay || 1000
      );
      
      // Process the response
      return this.processResponse(response);
    } catch (error) {
      console.error('Error sending GET request to Kroki:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Send a POST request to the Kroki API
   * @param options - The request options
   * @returns Promise with the Kroki response
   */
  static async sendPostRequest(options: KrokiRequestOptions): Promise<KrokiResponse> {
    try {
      // Ensure server URL ends with a slash
      const serverUrl = options.serverUrl.endsWith('/') 
        ? options.serverUrl 
        : options.serverUrl + '/';
      
      // Build the full URL
      const url = `${serverUrl}${options.diagramType}/${options.outputFormat}`;
      
      // Prepare request parameters
      const requestParams: RequestUrlParam = {
        url: url,
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Accept': 'image/svg+xml, image/png',
          ...options.customHeaders
        },
        body: options.source,
        throw: false
      };
      
      // Send the request
      const response = await this.sendRequestWithRetry(
        requestParams, 
        options.retryCount || 1, 
        options.retryDelay || 1000
      );
      
      // Process the response
      return this.processResponse(response);
    } catch (error) {
      console.error('Error sending POST request to Kroki:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Send a request with retry logic
   * @param requestParams - The request parameters
   * @param maxRetries - Maximum number of retries
   * @param retryDelay - Delay between retries in milliseconds
   * @returns Promise with the response
   */
  private static async sendRequestWithRetry(
    requestParams: RequestUrlParam, 
    maxRetries: number, 
    retryDelay: number
  ): Promise<RequestUrlResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Send the request
        const response = await requestUrl(requestParams);
        
        // If successful, return the response
        if (response.status >= 200 && response.status < 300) {
          return response;
        }
        
        // If server error, retry after delay
        if (response.status >= 500) {
          lastError = new Error(`Server error: ${response.status} ${response.text}`);
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }
        
        // For other errors, return the response without retrying
        return response;
      } catch (error) {
        lastError = error;
        
        // Only retry for network errors
        if (error.name === 'AbortError' || error.message.includes('fetch')) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }
        
        // For other errors, rethrow
        throw error;
      }
    }
    
    // If all retries failed, throw the last error
    if (lastError) {
      throw lastError;
    } else {
      throw new Error('Unknown error during request');
    }
  }

  /**
   * Process the response from the Kroki API
   * @param response - The response from the Kroki API
   * @returns Processed Kroki response
   */
  private static processResponse(response: RequestUrlResponse): KrokiResponse {
    // Check if the response was successful
    if (response.status >= 200 && response.status < 300) {
      // For successful responses, return the data
      return {
        success: true,
        data: response.arrayBuffer ? 
          this.arrayBufferToDataUrl(response.arrayBuffer, response.headers['content-type']) : 
          response.text,
        statusCode: response.status
      };
    } else {
      // For error responses, return the error
      return {
        success: false,
        error: response.text || `HTTP error ${response.status}`,
        statusCode: response.status
      };
    }
  }

  /**
   * Convert an array buffer to a data URL
   * @param buffer - The array buffer
   * @param mimeType - The MIME type of the data
   * @returns Data URL
   */
  private static arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string): string {
    // Convert the array buffer to a base64 string
    const binary = Array.from(new Uint8Array(buffer))
      .map(byte => String.fromCharCode(byte))
      .join('');
    const base64 = btoa(binary);
    
    // Return as a data URL
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Delay execution for a specified time
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
