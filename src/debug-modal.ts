import { Modal, App, Setting, Notice } from 'obsidian';
import { DebugManager, DebugLevel } from './debug-manager';
import KrokiEnhancedPlugin from '../main';

/**
 * Modal for displaying debug information and diagnostics
 */
export class DebugModal extends Modal {
  private plugin: KrokiEnhancedPlugin;
  private debugManager: DebugManager;

  constructor(app: App, plugin: KrokiEnhancedPlugin, debugManager: DebugManager) {
    super(app);
    this.plugin = plugin;
    this.debugManager = debugManager;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: 'Kroki Enhanced Debug Console' });
    
    this.createDebugTabs();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private createDebugTabs(): void {
    const { contentEl } = this;
    
    // Create tab container
    const tabContainer = contentEl.createDiv({ cls: 'kroki-debug-tabs' });
    
    // Create tab buttons
    const tabButtons = tabContainer.createDiv({ cls: 'kroki-debug-tab-buttons' });
    
    const logsButton = tabButtons.createEl('button', { 
      text: 'Logs',
      cls: 'kroki-debug-tab-button active'
    });
    
    const statsButton = tabButtons.createEl('button', { 
      text: 'Statistics',
      cls: 'kroki-debug-tab-button'
    });
    
    const diagnosticsButton = tabButtons.createEl('button', { 
      text: 'Diagnostics',
      cls: 'kroki-debug-tab-button'
    });
    
    // Create tab content container
    const tabContent = tabContainer.createDiv({ cls: 'kroki-debug-tab-content' });
    
    // Show logs tab by default
    this.showLogsTab(tabContent);
    
    // Tab button event listeners
    logsButton.addEventListener('click', () => {
      this.setActiveTab(logsButton, [logsButton, statsButton, diagnosticsButton]);
      this.showLogsTab(tabContent);
    });
    
    statsButton.addEventListener('click', () => {
      this.setActiveTab(statsButton, [logsButton, statsButton, diagnosticsButton]);
      this.showStatsTab(tabContent);
    });
    
    diagnosticsButton.addEventListener('click', () => {
      this.setActiveTab(diagnosticsButton, [logsButton, statsButton, diagnosticsButton]);
      this.showDiagnosticsTab(tabContent);
    });
  }

  private setActiveTab(activeButton: HTMLElement, allButtons: HTMLElement[]): void {
    allButtons.forEach(button => button.removeClass('active'));
    activeButton.addClass('active');
  }

  private showLogsTab(container: HTMLElement): void {
    container.empty();
    
    // Log level filter
    const filterContainer = container.createDiv({ cls: 'kroki-debug-filter' });
    
    let selectedLevel: DebugLevel | undefined = undefined;
    let selectedCategory: string | undefined = undefined;
    
    new Setting(filterContainer)
      .setName('Log Level Filter')
      .setDesc('Filter logs by level')
      .addDropdown(dropdown => dropdown
        .addOption('all', 'All Levels')
        .addOption('0', 'Error')
        .addOption('1', 'Warning')
        .addOption('2', 'Info')
        .addOption('3', 'Debug')
        .setValue('all')
        .onChange((value) => {
          selectedLevel = value === 'all' ? undefined : parseInt(value) as DebugLevel;
          this.refreshLogs(logsContainer, selectedLevel, selectedCategory);
        }));
    
    new Setting(filterContainer)
      .setName('Category Filter')
      .setDesc('Filter logs by category')
      .addText(text => text
        .setPlaceholder('e.g., kroki-client, diagram-renderer')
        .onChange((value) => {
          selectedCategory = value.trim() || undefined;
          this.refreshLogs(logsContainer, selectedLevel, selectedCategory);
        }));
    
    // Action buttons
    const actionContainer = container.createDiv({ cls: 'kroki-debug-actions' });
    
    new Setting(actionContainer)
      .setName('Log Actions')
      .setDesc('Manage debug logs')
      .addButton(button => button
        .setButtonText('Clear Logs')
        .onClick(() => {
          this.debugManager.clearLogs();
          this.refreshLogs(logsContainer, selectedLevel, selectedCategory);
          new Notice('Debug logs cleared');
        }))
      .addButton(button => button
        .setButtonText('Export Logs')
        .onClick(() => {
          this.exportLogs();
        }))
      .addButton(button => button
        .setButtonText('Refresh')
        .onClick(() => {
          this.refreshLogs(logsContainer, selectedLevel, selectedCategory);
        }));
    
    // Logs container
    const logsContainer = container.createDiv({ cls: 'kroki-debug-console' });
    this.refreshLogs(logsContainer, selectedLevel, selectedCategory);
  }

  private refreshLogs(container: HTMLElement, level?: DebugLevel, category?: string): void {
    container.empty();
    
    const logs = this.debugManager.getLogs(level, category);
    
    if (logs.length === 0) {
      container.createEl('p', { 
        text: 'No logs found matching the current filters.',
        cls: 'kroki-debug-empty'
      });
      return;
    }
    
    // Show recent logs (last 100)
    const recentLogs = logs.slice(-100);
    
    recentLogs.forEach(log => {
      const logEntry = container.createDiv({ cls: 'kroki-debug-entry' });
      
      const timestamp = logEntry.createSpan({ 
        text: log.timestamp.toLocaleTimeString(),
        cls: 'kroki-debug-timestamp'
      });
      
      const levelSpan = logEntry.createSpan({ 
        text: DebugLevel[log.level],
        cls: `kroki-debug-level-${DebugLevel[log.level].toLowerCase()}`
      });
      
      const categorySpan = logEntry.createSpan({ 
        text: `[${log.category}]`,
        cls: 'kroki-debug-category'
      });
      
      const messageSpan = logEntry.createSpan({ 
        text: log.message,
        cls: 'kroki-debug-message'
      });
      
      if (log.data) {
        const dataEl = logEntry.createEl('pre', { 
          text: JSON.stringify(log.data, null, 2),
          cls: 'kroki-debug-data'
        });
      }
    });
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  private showStatsTab(container: HTMLElement): void {
    container.empty();
    
    const stats = this.debugManager.getStats();
    
    // Request statistics
    const requestStats = container.createDiv({ cls: 'kroki-debug-stats-section' });
    requestStats.createEl('h3', { text: 'Request Statistics' });
    
    const requestTable = requestStats.createEl('table', { cls: 'kroki-debug-stats-table' });
    
    this.addStatsRow(requestTable, 'Total Requests', stats.totalRequests.toString());
    this.addStatsRow(requestTable, 'Successful Requests', stats.successfulRequests.toString());
    this.addStatsRow(requestTable, 'Failed Requests', stats.failedRequests.toString());
    this.addStatsRow(requestTable, 'Success Rate', 
      stats.totalRequests > 0 ? 
        `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%` : 
        'N/A'
    );
    this.addStatsRow(requestTable, 'Average Response Time', 
      stats.averageResponseTime > 0 ? 
        `${stats.averageResponseTime.toFixed(0)}ms` : 
        'N/A'
    );
    
    // Cache statistics
    const cacheStats = container.createDiv({ cls: 'kroki-debug-stats-section' });
    cacheStats.createEl('h3', { text: 'Cache Statistics' });
    
    const cacheTable = cacheStats.createEl('table', { cls: 'kroki-debug-stats-table' });
    
    this.addStatsRow(cacheTable, 'Cache Hits', stats.cacheHits.toString());
    this.addStatsRow(cacheTable, 'Cache Misses', stats.cacheMisses.toString());
    this.addStatsRow(cacheTable, 'Cache Hit Rate', 
      (stats.cacheHits + stats.cacheMisses) > 0 ? 
        `${((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1)}%` : 
        'N/A'
    );
    
    // Error statistics
    if (Object.keys(stats.errorsByType).length > 0) {
      const errorStats = container.createDiv({ cls: 'kroki-debug-stats-section' });
      errorStats.createEl('h3', { text: 'Error Statistics' });
      
      const errorTable = errorStats.createEl('table', { cls: 'kroki-debug-stats-table' });
      
      Object.entries(stats.errorsByType).forEach(([category, count]) => {
        this.addStatsRow(errorTable, category, count.toString());
      });
    }
    
    // Action buttons
    const actionContainer = container.createDiv({ cls: 'kroki-debug-actions' });
    
    new Setting(actionContainer)
      .setName('Statistics Actions')
      .setDesc('Manage statistics')
      .addButton(button => button
        .setButtonText('Clear Statistics')
        .onClick(() => {
          this.debugManager.clearStats();
          this.showStatsTab(container);
          new Notice('Statistics cleared');
        }))
      .addButton(button => button
        .setButtonText('Refresh')
        .onClick(() => {
          this.showStatsTab(container);
        }));
  }

  private addStatsRow(table: HTMLElement, label: string, value: string): void {
    const row = table.createEl('tr');
    row.createEl('td', { text: label, cls: 'kroki-debug-stats-label' });
    row.createEl('td', { text: value, cls: 'kroki-debug-stats-value' });
  }

  private async showDiagnosticsTab(container: HTMLElement): Promise<void> {
    container.empty();
    
    // Show loading message
    const loadingEl = container.createEl('p', { text: 'Running diagnostics...' });
    
    try {
      const diagnostics = await this.debugManager.performDiagnostics();
      
      loadingEl.remove();
      
      // Browser information
      const browserSection = container.createDiv({ cls: 'kroki-debug-stats-section' });
      browserSection.createEl('h3', { text: 'Browser Information' });
      
      const browserPre = browserSection.createEl('pre', { 
        text: JSON.stringify(diagnostics.browser, null, 2),
        cls: 'kroki-debug-json'
      });
      
      // Connectivity information
      const connectivitySection = container.createDiv({ cls: 'kroki-debug-stats-section' });
      connectivitySection.createEl('h3', { text: 'Connectivity' });
      
      const connectivityPre = connectivitySection.createEl('pre', { 
        text: JSON.stringify(diagnostics.connectivity, null, 2),
        cls: 'kroki-debug-json'
      });
      
      // Plugin statistics
      const pluginSection = container.createDiv({ cls: 'kroki-debug-stats-section' });
      pluginSection.createEl('h3', { text: 'Plugin Statistics' });
      
      const pluginPre = pluginSection.createEl('pre', { 
        text: JSON.stringify(diagnostics.pluginStats, null, 2),
        cls: 'kroki-debug-json'
      });
      
      // Recent errors
      if (diagnostics.recentErrors.length > 0) {
        const errorsSection = container.createDiv({ cls: 'kroki-debug-stats-section' });
        errorsSection.createEl('h3', { text: 'Recent Errors' });
        
        const errorsPre = errorsSection.createEl('pre', { 
          text: JSON.stringify(diagnostics.recentErrors, null, 2),
          cls: 'kroki-debug-json'
        });
      }
      
      // Memory information
      if (diagnostics.memory) {
        const memorySection = container.createDiv({ cls: 'kroki-debug-stats-section' });
        memorySection.createEl('h3', { text: 'Memory Usage' });
        
        const memoryPre = memorySection.createEl('pre', { 
          text: JSON.stringify(diagnostics.memory, null, 2),
          cls: 'kroki-debug-json'
        });
      }
      
    } catch (error) {
      loadingEl.textContent = `Error running diagnostics: ${error.message}`;
    }
  }

  private exportLogs(): void {
    try {
      const logsJson = this.debugManager.exportLogs();
      
      // Create a blob and download link
      const blob = new Blob([logsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `kroki-enhanced-logs-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      new Notice('Debug logs exported successfully');
    } catch (error) {
      new Notice(`Failed to export logs: ${error.message}`);
    }
  }
}
