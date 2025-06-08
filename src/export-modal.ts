import { Modal, App, Setting, TFile, Notice } from 'obsidian';
import { PandocExporter, ExportOptions } from './pandoc-exporter';
import KrokiEnhancedPlugin from '../main';

/**
 * Modal for configuring and executing exports
 */
export class ExportModal extends Modal {
  private plugin: KrokiEnhancedPlugin;
  private file: TFile;
  private exporter: PandocExporter;
  private exportOptions: ExportOptions;

  constructor(app: App, plugin: KrokiEnhancedPlugin, file: TFile) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.exporter = new PandocExporter(plugin.settings.exportPandocPath, app.vault);
    
    // Initialize export options with defaults
    this.exportOptions = {
      format: plugin.settings.exportDefaultFormat,
      includeImages: true,
      customArgs: plugin.settings.exportCustomArgs ? 
        plugin.settings.exportCustomArgs.split('\n').filter(arg => arg.trim()) : [],
      customStyles: plugin.settings.exportCustomStyles,
      metadata: {
        title: file.basename,
        author: 'Obsidian User',
        date: new Date().toISOString().split('T')[0]
      }
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: `Export: ${this.file.basename}` });
    
    this.createExportSettings();
    this.createExportButtons();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private createExportSettings(): void {
    const { contentEl } = this;
    
    const settingsContainer = contentEl.createDiv({ cls: 'kroki-export-options' });
    
    // Format selection
    new Setting(settingsContainer)
      .setName('Export Format')
      .setDesc('Choose the output format for the export')
      .addDropdown(dropdown => dropdown
        .addOption('pdf', 'PDF')
        .addOption('docx', 'Word (DOCX)')
        .addOption('html', 'HTML')
        .addOption('latex', 'LaTeX')
        .addOption('epub', 'EPUB')
        .addOption('odt', 'OpenDocument Text')
        .addOption('rtf', 'Rich Text Format')
        .addOption('markdown', 'Markdown')
        .setValue(this.exportOptions.format)
        .onChange((value) => {
          this.exportOptions.format = value;
        }));
    
    // Include images toggle
    new Setting(settingsContainer)
      .setName('Include Images')
      .setDesc('Embed images directly in the exported document')
      .addToggle(toggle => toggle
        .setValue(this.exportOptions.includeImages || false)
        .onChange((value) => {
          this.exportOptions.includeImages = value;
        }));
    
    // Metadata settings
    const metadataContainer = settingsContainer.createDiv();
    metadataContainer.createEl('h3', { text: 'Document Metadata' });
    
    new Setting(metadataContainer)
      .setName('Title')
      .setDesc('Document title')
      .addText(text => text
        .setValue(this.exportOptions.metadata?.title || '')
        .onChange((value) => {
          if (!this.exportOptions.metadata) this.exportOptions.metadata = {};
          this.exportOptions.metadata.title = value;
        }));
    
    new Setting(metadataContainer)
      .setName('Author')
      .setDesc('Document author')
      .addText(text => text
        .setValue(this.exportOptions.metadata?.author || '')
        .onChange((value) => {
          if (!this.exportOptions.metadata) this.exportOptions.metadata = {};
          this.exportOptions.metadata.author = value;
        }));
    
    // Custom arguments
    new Setting(settingsContainer)
      .setName('Custom Pandoc Arguments')
      .setDesc('Additional command-line arguments for Pandoc (one per line)')
      .addTextArea(text => text
        .setPlaceholder('--toc\n--number-sections\n--template=my-template.tex')
        .setValue(this.exportOptions.customArgs?.join('\n') || '')
        .onChange((value) => {
          this.exportOptions.customArgs = value.split('\n')
            .map(arg => arg.trim())
            .filter(arg => arg.length > 0);
        }));
    
    // Custom styles
    new Setting(settingsContainer)
      .setName('Custom Styles')
      .setDesc('CSS or LaTeX styles to apply to the exported document')
      .addTextArea(text => text
        .setPlaceholder('/* CSS styles for HTML/EPUB */\n.kroki-diagram { border: 1px solid #ccc; }')
        .setValue(this.exportOptions.customStyles || '')
        .onChange((value) => {
          this.exportOptions.customStyles = value;
        }));
  }

  private createExportButtons(): void {
    const { contentEl } = this;
    
    const buttonContainer = contentEl.createDiv({ cls: 'kroki-export-buttons' });
    
    // Preview button
    const previewButton = buttonContainer.createEl('button', {
      text: 'Preview Command',
      cls: 'mod-cta'
    });
    
    previewButton.addEventListener('click', () => {
      this.showCommandPreview();
    });
    
    // Export button
    const exportButton = buttonContainer.createEl('button', {
      text: 'Export',
      cls: 'mod-cta'
    });
    
    exportButton.addEventListener('click', async () => {
      await this.performExport();
    });
    
    // Cancel button
    const cancelButton = buttonContainer.createEl('button', {
      text: 'Cancel'
    });
    
    cancelButton.addEventListener('click', () => {
      this.close();
    });
  }

  private showCommandPreview(): void {
    const { contentEl } = this;
    
    // Remove existing preview
    const existingPreview = contentEl.querySelector('.kroki-export-preview');
    if (existingPreview) {
      existingPreview.remove();
    }
    
    // Create preview container
    const previewContainer = contentEl.createDiv({ cls: 'kroki-export-preview' });
    previewContainer.createEl('h3', { text: 'Pandoc Command Preview' });
    
    // Build command preview
    const inputPath = `${this.file.basename}-input.md`;
    const outputPath = `${this.file.basename}.${this.exportOptions.format}`;
    
    let command = `${this.plugin.settings.exportPandocPath} "${inputPath}" -o "${outputPath}" -t ${this.exportOptions.format}`;
    
    if (this.exportOptions.includeImages) {
      command += ' --embed-resources --standalone';
    }
    
    if (this.exportOptions.metadata) {
      Object.entries(this.exportOptions.metadata).forEach(([key, value]) => {
        command += ` --metadata=${key}="${value}"`;
      });
    }
    
    if (this.exportOptions.customArgs && this.exportOptions.customArgs.length > 0) {
      command += ' ' + this.exportOptions.customArgs.join(' ');
    }
    
    const commandEl = previewContainer.createEl('pre');
    commandEl.textContent = command;
    commandEl.style.whiteSpace = 'pre-wrap';
    commandEl.style.wordBreak = 'break-all';
  }

  private async performExport(): Promise<void> {
    const loadingNotice = new Notice('Exporting document...', 0);
    
    try {
      // Check if Pandoc is available
      if (!await this.exporter.isPandocAvailable()) {
        loadingNotice.hide();
        new Notice('Pandoc not found. Please check your settings.', 5000);
        return;
      }
      
      // Perform the export
      const result = await this.exporter.exportFile(this.file, this.exportOptions);
      
      loadingNotice.hide();
      
      if (result.success) {
        new Notice(`Export successful! File saved to: ${result.outputPath}`, 5000);
        
        // Optionally open the exported file
        if (result.outputPath) {
          const openButton = new Notice('Export complete. Click to reveal file.', 0);
          openButton.noticeEl.addEventListener('click', () => {
            // Try to open the file location
            if (process.platform === 'win32') {
              require('child_process').exec(`explorer /select,"${result.outputPath}"`);
            } else if (process.platform === 'darwin') {
              require('child_process').exec(`open -R "${result.outputPath}"`);
            } else {
              require('child_process').exec(`xdg-open "${require('path').dirname(result.outputPath)}"`);
            }
            openButton.hide();
          });
        }
        
        this.close();
      } else {
        new Notice(`Export failed: ${result.error}`, 10000);
        
        // Show detailed error in console if debug mode is enabled
        if (this.plugin.settings.enableDebugMode) {
          console.error('Export failed:', result);
        }
      }
    } catch (error) {
      loadingNotice.hide();
      new Notice(`Export error: ${error.message}`, 10000);
      console.error('Export error:', error);
    }
  }
}
