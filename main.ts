import { Plugin, PluginSettingTab, Setting, App, MarkdownPostProcessorContext, MarkdownRenderer, Menu, TFile } from 'obsidian';
import { DiagramRenderer } from './src/diagram-renderer';
import { ExportModal } from './src/export-modal';
import { DebugManager, DebugLevel } from './src/debug-manager';
import { DebugModal } from './src/debug-modal';

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
  debugManager: DebugManager;

  async onload() {
    console.log('Loading Kroki Enhanced plugin');
    
    // Load settings
    await this.loadSettings();
    
    // Initialize debug manager
    this.debugManager = new DebugManager(
      1000, // Max log entries
      this.settings.enableDebugMode ? DebugLevel.DEBUG : DebugLevel.INFO
    );
    
    this.debugManager.info('plugin', 'Kroki Enhanced plugin starting up');
    
    // Initialize diagram renderer
    this.initializeRenderer();

    // Register settings tab
    this.addSettingTab(new KrokiSettingTab(this.app, this));

    // Register code block processors for each enabled diagram type
    this.registerDiagramProcessors();

    // Add export command
    this.addCommand({
      id: 'export-with-kroki',
      name: 'Export current file with Kroki diagrams',
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          if (!checking) {
            new ExportModal(this.app, this, activeFile).open();
          }
          return true;
        }
        return false;
      }
    });

    // Add debug console command
    this.addCommand({
      id: 'open-debug-console',
      name: 'Open debug console',
      callback: () => {
        new DebugModal(this.app, this, this.debugManager).open();
      }
    });

    // Add context menu item for export
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item) => {
            item
              .setTitle('Export with Kroki diagrams')
              .setIcon('download')
              .onClick(() => {
                new ExportModal(this.app, this, file).open();
              });
          });
        }
      })
    );

    this.debugManager.info('plugin', 'Kroki Enhanced plugin loaded successfully');
    
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
    
    // Update debug manager level when settings change
    if (this.debugManager) {
      this.debugManager.setLevel(
        this.settings.enableDebugMode ? DebugLevel.DEBUG : DebugLevel.INFO
      );
      this.debugManager.info('settings', 'Plugin settings updated');
    }
    
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
    const startTime = Date.now();
    
    // Create container for the diagram
    const container = el.createDiv({ cls: 'kroki-diagram-container' });
    
    // Add loading indicator
    const loadingEl = container.createDiv({ cls: 'kroki-loading' });
    loadingEl.setText('Loading diagram...');
    
    try {
      this.debugManager.debug('diagram-render', `Starting render for ${language} diagram`, {
        sourceLength: source.length,
        language
      });
      
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
          const endTime = Date.now();
          const renderTime = endTime - startTime;
          
          this.debugManager.recordSuccessfulRequest(renderTime);
          this.debugManager.debug('diagram-render', `Successfully rendered ${language} diagram`, {
            renderTime,
            language
          });
        };
        
        // If there's an error loading the image, show an error
        img.onerror = (e) => {
          this.debugManager.recordFailedRequest();
          this.debugManager.error('diagram-render', `Failed to load diagram image for ${language}`, e);
          this.handleRenderError(container, new Error('Failed to load diagram image'), source, language);
          loadingEl.remove();
        };
        
        // Add the image to the container
        container.appendChild(img);
      } else {
        // Not a supported diagram type
        this.debugManager.debug('diagram-render', `No renderer found for language: ${language}`);
        loadingEl.remove();
        container.remove();
      }
      
    } catch (error) {
      // Handle any errors
      this.debugManager.recordFailedRequest();
      this.debugManager.error('diagram-render', `Error rendering ${language} diagram: ${error.message}`, {
        error: error.message,
        language,
        sourceLength: source.length
      });
      this.handleRenderError(container, error, source, language);
      loadingEl.remove();
    }
  }

  handleRenderError(el: HTMLElement, error: Error, source: string, language: string) {
    // Create error container
    const errorContainer = el.createDiv({ cls: 'kroki-error-container' });
    
    // Add error message
    const errorMessage = errorContainer.createDiv({ cls: 'kroki-error-message' });
    errorMessage.setText(`Error`);
  }
