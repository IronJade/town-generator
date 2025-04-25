import { ItemView, WorkspaceLeaf, Menu, TFile, Notice } from 'obsidian';
import TownGeneratorPlugin from '../main';
import { CityMap } from '../renderer/CityMap';
import { Model } from '../generator/Model';
import { StateManager } from '../generator/StateManager';
import { Palette } from '../renderer/Palette';

export const VIEW_TYPE_TOWN_GENERATOR = 'town-generator-view';

export class TownGeneratorView extends ItemView {
	private plugin: TownGeneratorPlugin;
	private canvas: HTMLCanvasElement;
	private cityMap: CityMap | null = null;
	private model: Model | null = null;
	public containerEl: HTMLDivElement;
	private controlsEl: HTMLDivElement;

	constructor(leaf: WorkspaceLeaf, plugin: TownGeneratorPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_TOWN_GENERATOR;
	}

	getDisplayText(): string {
		return 'Town Generator';
	}

	async onOpen() {
		// Create containing elements
		this.containerEl = this.contentEl.createDiv({ cls: 'town-generator-container' });
		this.controlsEl = this.containerEl.createDiv({ cls: 'town-generator-controls' });
		
		// Create canvas
		this.canvas = document.createElement('canvas');
		this.canvas.className = 'town-generator-canvas';
		this.containerEl.appendChild(this.canvas);
		
		// Add controls
		this.createControls();
		
		// Initialize model if needed
		if (!Model.instance) {
			new Model(StateManager.size, StateManager.seed);
		}
		
		// Create town map
		await this.renderTown();
		
		// Add context menu on right-click
		this.canvas.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			this.showContextMenu(event);
		});
	}

	async onClose() {
		// Clean up any resources
		this.canvas.remove();
	}

	private createControls() {
		// Clear previous controls
		this.controlsEl.empty();
		
		// Create size buttons
		const sizeButtonsEl = this.controlsEl.createDiv({ cls: 'town-generator-size-buttons' });
		
		const createSizeButton = (label: string, minSize: number, maxSize: number) => {
			const button = sizeButtonsEl.createEl('button', { text: label });
			button.addEventListener('click', () => {
				const size = minSize + Math.floor(Math.random() * (maxSize - minSize));
				StateManager.size = size;
				StateManager.seed = -1; // Generate new seed
				new Model(size, StateManager.seed);
				this.renderTown();
			});
		};
		
		createSizeButton('Small Town', 6, 10);
		createSizeButton('Large Town', 10, 15);
		createSizeButton('Small City', 15, 24);
		createSizeButton('Large City', 24, 40);
		
		// Create regenerate button
		const regenerateButton = this.controlsEl.createEl('button', { 
			cls: 'town-generator-regenerate',
			text: 'Regenerate' 
		});
		regenerateButton.addEventListener('click', () => {
			StateManager.seed = -1; // Reset seed to generate a new one
			new Model(StateManager.size, StateManager.seed);
			this.renderTown();
		});
		
		// Create palette selector
		const paletteSelector = this.controlsEl.createEl('select', {
			cls: 'town-generator-palette-select'
		});
		
		// Add palette options
		const palettes = ['DEFAULT', 'BLUEPRINT', 'BW', 'INK', 'NIGHT', 'ANCIENT', 'COLOUR', 'SIMPLE'];
		palettes.forEach(palette => {
			const option = paletteSelector.createEl('option', {
				value: palette,
				text: palette.charAt(0) + palette.slice(1).toLowerCase()
			});
			
			if (palette === this.plugin.settings.defaultPalette) {
				option.selected = true;
			}
		});
		
		paletteSelector.addEventListener('change', () => {
			CityMap.setPalette(paletteSelector.value);
			this.renderTown();
		});
	}

    public async renderTown() {
        // Show loading indicator
        this.showLoading(true);
        
        try {
            // If no model exists yet, create one asynchronously
            if (!Model.instance) {
                // Use the async factory method instead of constructor
                await Model.createAsync(StateManager.size, StateManager.seed);
            }
            
            this.model = Model.instance;
            
            if (!this.model) {
                console.error("No town model available");
                this.showLoading(false);
                return;
            }
            
            // Adjust canvas size
            const parentWidth = this.containerEl.clientWidth;
            const parentHeight = Math.max(500, this.containerEl.clientHeight - this.controlsEl.clientHeight - 20);
            this.canvas.width = parentWidth;
            this.canvas.height = parentHeight;
            
            // Create city map and render
            this.cityMap = new CityMap(this.model, this.canvas);
            this.cityMap.render();
            
            // Update title to reflect town size
            this.leaf.setViewState({
                type: VIEW_TYPE_TOWN_GENERATOR,
                state: { size: StateManager.size, seed: StateManager.seed }
            });
        } catch (error) {
            console.error("Error rendering town:", error);
            new Notice("Failed to generate town. Please try again.");
        } finally {
            // Hide loading indicator
            this.showLoading(false);
        }
    }

    private showLoading(show: boolean) {
        if (!this.loadingEl) {
            this.loadingEl = this.containerEl.createDiv({ cls: 'town-generator-loading' });
            this.loadingEl.innerHTML = `
                <div class="town-generator-loading-spinner"></div>
                <div class="town-generator-loading-text">Generating town...</div>
            `;
            
            // Add styles if not already added
            if (!document.getElementById('town-generator-loading-styles')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'town-generator-loading-styles';
                styleEl.textContent = `
                    .town-generator-loading {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(var(--background-primary-rgb), 0.7);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        z-index: 100;
                    }
                    .town-generator-loading-spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid var(--text-faint);
                        border-top: 4px solid var(--interactive-accent);
                        border-radius: 50%;
                        animation: town-generator-spin 1s linear infinite;
                    }
                    .town-generator-loading-text {
                        margin-top: 10px;
                        color: var(--text-normal);
                    }
                    @keyframes town-generator-spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(styleEl);
            }
        }
        
        this.loadingEl.style.display = show ? 'flex' : 'none';
    }
    
    // Add the loading element property
    private loadingEl: HTMLElement | null = null;
    
    // Make refresh async
    public async refresh() {
        await this.renderTown();
    }

	private showContextMenu(event: MouseEvent) {
		const menu = new Menu();
		
		menu.addItem(item => {
			item.setTitle("Export as PNG")
				.setIcon("image-file")
				.onClick(() => this.exportAsPng());
		});
		
		menu.addItem(item => {
			item.setTitle("Insert as Note")
				.setIcon("document")
				.onClick(() => this.createTownNote());
		});
		
		menu.addItem(item => {
			item.setTitle("Copy Town Seed")
				.setIcon("clipboard-copy")
				.onClick(() => {
					navigator.clipboard.writeText(String(StateManager.seed));
				});
		});
		
		menu.showAtMouseEvent(event);
	}

	private exportAsPng() {
		if (!this.canvas) return;
		
		const link = document.createElement('a');
		link.download = `town-${StateManager.size}-${StateManager.seed}.png`;
		link.href = this.canvas.toDataURL('image/png');
		link.click();
	}

	private async createTownNote() {
		if (!this.model) return;
		
		// Generate a town description
		const townType = this.getTownTypeName(StateManager.size);
		const title = `${townType} (Seed: ${StateManager.seed})`;
		
		// Generate town info
		let content = `# ${title}\n\n`;
		content += `![${title}](town-${StateManager.size}-${StateManager.seed}.png)\n\n`;
		content += `## Town Information\n`;
		content += `- **Size**: ${StateManager.size}\n`;
		content += `- **Seed**: ${StateManager.seed}\n\n`;
		
		content += `## Districts\n`;
		const wardCounts: Record<string, number> = {};
		
		this.model.patches.forEach(patch => {
			if (patch.ward) {
				const label = patch.ward.getLabel();
				if (label) {
					wardCounts[label] = (wardCounts[label] || 0) + 1;
				}
			}
		});
		
		// List the wards in descending order of count
		Object.entries(wardCounts)
			.sort((a, b) => b[1] - a[1])
			.forEach(([label, count]) => {
				content += `- ${label}: ${count}\n`;
			});
		
		// Export the canvas
		const dataUrl = this.canvas.toDataURL('image/png');
		const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
		
		// Create the attachment
		const fileName = `town-${StateManager.size}-${StateManager.seed}.png`;
		await this.app.vault.createBinary(fileName, this.base64ToArrayBuffer(base64Data));
		
		// Create the note
		const notePath = `${title}.md`;
		await this.app.vault.create(notePath, content);
		
		// Open the note
		const file = this.app.vault.getAbstractFileByPath(notePath);
        if (file) {
            // Check if it's a TFile before opening
            if (file instanceof TFile) {
                this.app.workspace.getLeaf().openFile(file);
            }
        }
	}

	private getTownTypeName(size: number): string {
		if (size < 10) return "Small Town";
		if (size < 15) return "Large Town";
		if (size < 24) return "Small City";
		if (size < 40) return "Large City";
		return "Metropolis";
	}

	private base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binaryString = window.atob(base64);
		const len = binaryString.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes.buffer;
	}
}