import { Plugin, PluginSettingTab, Setting, App, MarkdownPostProcessorContext, MarkdownRenderer } from 'obsidian';
import { DiagramRenderer } from './src/diagram-renderer';

// Define interfaces for plugin settings
interface KrokiDiagramType {
  prettyName: string;
  krokiBlockName: string;
  obsidianBlockName: string;
  description: string;
  url: string;
  enabled: boolean;
  aliases: string[];
}

interface KrokiSettings {
  server_url: string;
  header: string;
  diagramTypes: Record<string, KrokiDiagramType>;
  enableDebugMode: boolean;
  exportPandocPath: string;
  exportDefaultFormat: string;
  exportCustomArgs: string;
  exportCustomStyles: string;
  cacheSize: number;
  cacheAge: number;
  requestTimeout: number;
  retryCount: number;
  retryDelay: number;
}

// Default settings with all supported diagram types
const DEFAULT_SETTINGS: KrokiSettings = {
  server_url: 'https://kroki.io/',
  header: '',
  enableDebugMode: false,
  exportPandocPath: 'pandoc',
  exportDefaultFormat: 'pdf',
  exportCustomArgs: '',
  exportCustomStyles: '',
  cacheSize: 100,
  cacheAge: 3600000, // 1 hour in milliseconds
  requestTimeout: 30000, // 30 seconds
  retryCount: 3,
  retryDelay: 1000, // 1 second
  diagramTypes: {
    blockdiag: {
      prettyName: "BlockDiag",
      krokiBlockName: "blockdiag",
      obsidianBlockName: "blockdiag",
      description: "Block diagram",
      url: "https://github.com/blockdiag/blockdiag",
      enabled: true,
      aliases: []
    },
    bpmn: {
      prettyName: "BPMN",
      krokiBlockName: "bpmn",
      obsidianBlockName: "bpmn",
      description: "Business Process Model and Notation",
      url: "https://github.com/bpmn-io/bpmn-js",
      enabled: true,
      aliases: []
    },
    bytefield: {
      prettyName: "Bytefield",
      krokiBlockName: "bytefield",
      obsidianBlockName: "bytefield",
      description: "Bytefield diagram",
      url: "https://github.com/Deep-Symmetry/bytefield-svg",
      enabled: true,
      aliases: []
    },
    seqdiag: {
      prettyName: "SeqDiag",
      krokiBlockName: "seqdiag",
      obsidianBlockName: "seqdiag",
      description: "Sequence diagram",
      url: "https://github.com/blockdiag/seqdiag",
      enabled: true,
      aliases: []
    },
    actdiag: {
      prettyName: "ActDiag",
      krokiBlockName: "actdiag",
      obsidianBlockName: "actdiag",
      description: "Activity diagram",
      url: "https://github.com/blockdiag/actdiag",
      enabled: true,
      aliases: []
    },
    nwdiag: {
      prettyName: "NwDiag",
      krokiBlockName: "nwdiag",
      obsidianBlockName: "nwdiag",
      description: "Network diagram",
      url: "https://github.com/blockdiag/nwdiag",
      enabled: true,
      aliases: []
    },
    packetdiag: {
      prettyName: "PacketDiag",
      krokiBlockName: "packetdiag",
      obsidianBlockName: "packetdiag",
      description: "Packet diagram",
      url: "https://github.com/blockdiag/nwdiag",
      enabled: true,
      aliases: []
    },
    rackdiag: {
      prettyName: "RackDiag",
      krokiBlockName: "rackdiag",
      obsidianBlockName: "rackdiag",
      description: "Rack diagram",
      url: "https://github.com/blockdiag/nwdiag",
      enabled: true,
      aliases: []
    },
    c4plantuml: {
      prettyName: "C4 with PlantUML",
      krokiBlockName: "c4plantuml",
      obsidianBlockName: "c4plantuml",
      description: "C4 model with PlantUML",
      url: "https://github.com/plantuml-stdlib/C4-PlantUML",
      enabled: true,
      aliases: ["c4"]
    },
    ditaa: {
      prettyName: "Ditaa",
      krokiBlockName: "ditaa",
      obsidianBlockName: "ditaa",
      description: "DIagrams Through Ascii Art",
      url: "https://github.com/stathissideris/ditaa",
      enabled: true,
      aliases: []
    },
    diagramsnet: {
      prettyName: "Diagrams.net",
      krokiBlockName: "diagramsnet",
      obsidianBlockName: "diagramsnet",
      description: "Diagrams.net (experimental)",
      url: "https://www.diagrams.net/",
      enabled: true,
      aliases: ["drawio"]
    },
    erd: {
      prettyName: "Erd",
      krokiBlockName: "erd",
      obsidianBlockName: "erd",
      description: "Entity Relationship Diagram",
      url: "https://github.com/BurntSushi/erd",
      enabled: true,
      aliases: []
    },
    excalidraw: {
      prettyName: "Excalidraw",
      krokiBlockName: "excalidraw",
      obsidianBlockName: "excalidraw",
      description: "Excalidraw diagrams",
      url: "https://github.com/excalidraw/excalidraw",
      enabled: true,
      aliases: []
    },
    graphviz: {
      prettyName: "GraphViz",
      krokiBlockName: "graphviz",
      obsidianBlockName: "graphviz",
      description: "Graph visualization software",
      url: "https://graphviz.org/",
      enabled: true,
      aliases: ["dot"]
    },
    mermaid: {
      prettyName: "Mermaid",
      krokiBlockName: "mermaid",
      obsidianBlockName: "mermaid",
      description: "Mermaid diagrams",
      url: "https://mermaid-js.github.io/mermaid/",
      enabled: true,
      aliases: []
    },
    nomnoml: {
      prettyName: "Nomnoml",
      krokiBlockName: "nomnoml",
      obsidianBlockName: "nomnoml",
      description: "Nomnoml diagrams",
      url: "https://nomnoml.com/",
      enabled: true,
      aliases: []
    },
    pikchr: {
      prettyName: "Pikchr",
      krokiBlockName: "pikchr",
      obsidianBlockName: "pikchr",
      description: "Pikchr diagrams",
      url: "https://pikchr.org/",
      enabled: true,
      aliases: []
    },
    plantuml: {
      prettyName: "PlantUML",
      krokiBlockName: "plantuml",
      obsidianBlockName: "plantuml",
      description: "PlantUML diagrams",
      url: "https://plantuml.com/",
      enabled: true,
      aliases: ["uml"]
    },
    structurizr: {
      prettyName: "Structurizr",
      krokiBlockName: "structurizr",
      obsidianBlockName: "structurizr",
      description: "Structurizr DSL",
      url: "https://structurizr.com/",
      enabled: true,
      aliases: []
    },
    svgbob: {
      prettyName: "Svgbob",
      krokiBlockName: "svgbob",
      obsidianBlockName: "svgbob",
      description: "ASCII to SVG converter",
      url: "https://github.com/ivanceras/svgbob",
      enabled: true,
      aliases: []
    },
    umlet: {
      prettyName: "UMLet",
      krokiBlockName: "umlet",
      obsidianBlockName: "umlet",
      description: "UMLet diagrams",
      url: "https://www.umlet.com/",
      enabled: true,
      aliases: []
    },
    vega: {
      prettyName: "Vega",
      krokiBlockName: "vega",
      obsidianBlockName: "vega",
      description: "Vega visualization grammar",
      url: "https://vega.github.io/vega/",
      enabled: true,
      aliases: []
    },
    vegalite: {
      prettyName: "Vega-Lite",
      krokiBlockName: "vegalite",
      obsidianBlockName: "vegalite",
      description: "Vega-Lite visualization grammar",
      url: "https://vega.github.io/vega-lite/",
      enabled: true,
      aliases: ["vega-lite"]
    },
    d2: {
      prettyName: "D2",
      krokiBlockName: "d2",
      obsidianBlockName: "d2",
      description: "D2 diagrams",
      url: "https://github.com/terrastruct/d2",
      enabled: true,
      aliases: []
    },
    wireviz: {
      prettyName: "WireViz",
      krokiBlockName: "wireviz",
      obsidianBlockName: "wireviz",
      description: "WireViz cable and wiring harness diagrams",
      url: "https://github.com/formatc1702/WireViz",
      enabled: true,
      aliases: []
    },
    wavedrom: {
      prettyName: "WaveDrom",
      krokiBlockName: "wavedrom",
      obsidianBlockName: "wavedrom",
      description: "Digital timing diagram",
      url: "https://wavedrom.com/",
      enabled: true,
      aliases: []
    }
  }
};

export default class KrokiEnhancedPlugin extends Plugin {
  settings: KrokiSettings;
  renderer: DiagramRenderer;

  async onload() {
    console.log('Loading Kroki Enhanced plugin');
    
    // Load settings
    await this.loadSettings();
    
    // Initialize diagram renderer
    this.initializeRenderer();

    // Register settings tab
    this.addSettingTab(new KrokiSettingTab(this.app, this));

    // Register code block processors for each enabled diagram type
    this.registerDiagramProcessors();

    // Add debug log
    if (this.settings.enableDebugMode) {
      console.log('Kroki Enhanced plugin loaded with settings:', this.settings);
    }
  }

  onunload() {
    console.log('Unloading Kroki Enhanced plugin');
    
    // Clear cache on unload
    if (this.renderer) {
      this.renderer.clearCache();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Reinitialize renderer with new settings
    this.initializeRenderer();
    
    // Re-register processors when settings change
    this.registerDiagramProcessors();
  }

  initializeRenderer() {
    // Build diagram types map for the renderer
    const diagramTypesMap: Record<string, string[]> = {};
    
    Object.entries(this.settings.diagramTypes).forEach(([key, diagramType]) => {
      if (diagramType.enabled) {
        diagramTypesMap[diagramType.obsidianBlockName] = diagramType.aliases;
      }
    });
    
    // Create or update the renderer
    if (this.renderer) {
      this.renderer.updateDiagramTypes(diagramTypesMap);
    } else {
      this.renderer = new DiagramRenderer(
        diagramTypesMap,
        this.settings.cacheSize,
        this.settings.cacheAge
      );
    }
    
    if (this.settings.enableDebugMode) {
      console.log('Diagram renderer initialized with types:', diagramTypesMap);
    }
  }

  registerDiagramProcessors() {
    // Register a processor for each enabled diagram type
    Object.entries(this.settings.diagramTypes).forEach(([key, diagramType]) => {
      if (diagramType.enabled) {
        // Register the main diagram type
        this.registerProcessor(diagramType.obsidianBlockName);
        
        // Register all aliases
        diagramType.aliases.forEach(alias => {
          this.registerProcessor(alias);
        });
      }
    });
  }

  registerProcessor(language: string) {
    this.registerMarkdownCodeBlockProcessor(language, async (source, el, ctx) => {
      try {
        await this.renderDiagram(source, language, el, ctx);
      } catch (error) {
        this.handleRenderError(el, error, source, language);
      }
    });
    
    if (this.settings.enableDebugMode) {
      console.log(`Registered processor for language: ${language}`);
    }
  }

  async renderDiagram(source: string, language: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    // Create container for the diagram
    const container = el.createDiv({ cls: 'kroki-diagram-container' });
    
    // Add loading indicator
    const loadingEl = container.createDiv({ cls: 'kroki-loading' });
    loadingEl.setText('Loading diagram...');
    
    try {
      // Prepare rendering options
      const renderOptions = {
        outputFormat: 'svg',
        serverUrl: this.settings.server_url,
        customHeaders: this.settings.header ? { 'X-Custom-Header': this.settings.header } : undefined,
        timeout: this.settings.requestTimeout,
        retryCount: this.settings.retryCount,
        retryDelay: this.settings.retryDelay,
        useCache: true,
        debugMode: this.settings.enableDebugMode
      };
      
      // Process the code block and render the diagram
      const renderedContent = await this.renderer.processCodeBlock(source, language, ctx, renderOptions);
      
      if (renderedContent) {
        // Create the image element
        const img = document.createElement('img');
        img.src = renderedContent;
        img.alt = `${language} diagram`;
        img.className = 'kroki-diagram';
        
        // When the image loads, remove the loading indicator
        img.onload = () => {
          loadingEl.remove();
        };
        
        // If there's an error loading the image, show an error
        img.onerror = (e) => {
          this.handleRenderError(container, new Error('Failed to load diagram image'), source, language);
          loadingEl.remove();
        };
        
        // Add the image to the container
        container.appendChild(img);
      } else {
        // Not a supported diagram type
        loadingEl.remove();
        container.remove();
      }
      
    } catch (error) {
      // Handle any errors
      this.handleRenderError(container, error, source, language);
      loadingEl.remove();
    }
  }

  handleRenderError(el: HTMLElement, error: Error, source: string, language: string) {
    // Create error container
    const errorContainer = el.createDiv({ cls: 'kroki-error-container' });
    
    // Add error message
    const errorMessage = errorContainer.createDiv({ cls: 'kroki-error-message' });
    errorMessage.setText(`Error rendering ${language} diagram: ${error.message}`);
    
    // Add source code display if debug is enabled
    if (this.settings.enableDebugMode) {
      const sourceContainer = errorContainer.createDiv({ cls: 'kroki-error-source' });
      const sourceHeader = sourceContainer.createEl('h4');
      sourceHeader.setText('Diagram Source:');
      
      const sourceCode = sourceContainer.createEl('pre');
      sourceCode.setText(source);
      
      console.error('Kroki diagram rendering error:', {
        error,
        language,
        source
      });
    }
  }
}

class KrokiSettingTab extends PluginSettingTab {
  plugin: KrokiEnhancedPlugin;

  constructor(app: App, plugin: KrokiEnhancedPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Plugin header
    containerEl.createEl('h1', { text: 'Kroki Enhanced Settings' });
    containerEl.createEl('p', { 
      text: 'Configure diagram rendering, server settings, and export options for the Kroki Enhanced plugin.',
      cls: 'kroki-settings-info'
    });

    // Server Settings Section
    this.createServerSettings(containerEl);
    
    // Performance Settings Section
    this.createPerformanceSettings(containerEl);
    
    // Debug Settings Section
    this.createDebugSettings(containerEl);
    
    // Export Settings Section
    this.createExportSettings(containerEl);
    
    // Diagram Types Section
    this.createDiagramTypesSettings(containerEl);
  }

  private createServerSettings(containerEl: HTMLElement): void {
    const serverSection = containerEl.createDiv({ cls: 'kroki-settings-section' });
    serverSection.createEl('h2', { text: 'Server Settings' });
    serverSection.createEl('p', { 
      text: 'Configure the Kroki server connection and request parameters.',
      cls: 'kroki-settings-info'
    });
    
    new Setting(serverSection)
      .setName('Kroki Server URL')
      .setDesc('URL of the Kroki server to use for rendering diagrams. Use https://kroki.io/ for the public instance or your own server URL.')
      .addText(text => text
        .setPlaceholder('https://kroki.io/')
        .setValue(this.plugin.settings.server_url)
        .onChange(async (value) => {
          this.plugin.settings.server_url = value;
          await this.plugin.saveSettings();
        }));
    
    new Setting(serverSection)
      .setName('Custom Header')
      .setDesc('Optional custom header to send with requests to the Kroki server (e.g., for authentication)')
      .addText(text => text
        .setPlaceholder('Authorization: Bearer your-token')
        .setValue(this.plugin.settings.header)
        .onChange(async (value) => {
          this.plugin.settings.header = value;
          await this.plugin.saveSettings();
        }));
  }

  private createPerformanceSettings(containerEl: HTMLElement): void {
    const perfSection = containerEl.createDiv({ cls: 'kroki-settings-section' });
