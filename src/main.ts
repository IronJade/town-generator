import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, View } from 'obsidian';
import { TownGeneratorView, VIEW_TYPE_TOWN_GENERATOR } from './ui/TownView';
import { TownGeneratorSettingsTab } from './ui/SettingsTab';
import { Model } from './generator/Model';
import { StateManager } from './generator/StateManager';

interface TownGeneratorSettings {
	defaultSize: number;
	defaultSeed: number;
	defaultPalette: string;
	showTooltips: boolean;
}

const DEFAULT_SETTINGS: TownGeneratorSettings = {
	defaultSize: 15,
	defaultSeed: -1,
	defaultPalette: 'DEFAULT',
	showTooltips: true
}

export default class TownGeneratorPlugin extends Plugin {
	settings: TownGeneratorSettings;

	async onload() {
		await this.loadSettings();

		// Initialize StateManager with default settings
		StateManager.size = this.settings.defaultSize;
		StateManager.seed = this.settings.defaultSeed;

		// Register town generator view
		this.registerView(
			VIEW_TYPE_TOWN_GENERATOR,
			(leaf) => {
				return new TownGeneratorView(leaf, this) as unknown as View;
			}
		);

		// Add ribbon icon to generate a town
		this.addRibbonIcon('map', 'Generate Town', () => {
			this.activateTownGeneratorView();
		});

		// Add command to generate a town
		this.addCommand({
			id: 'generate-town',
			name: 'Generate Town',
			callback: () => {
				this.activateTownGeneratorView();
			}
		});

		// Add command to regenerate town with new seed
		this.addCommand({
			id: 'regenerate-town',
			name: 'Regenerate Town (New Seed)',
			callback: () => {
				StateManager.seed = -1; // Reset seed to generate a new one
				// Create new model with current size
				new Model(StateManager.size, StateManager.seed);
				// Refresh view if open
				this.refreshView();
			}
		});

		// Add commands for different town sizes
		this.addCommand({
			id: 'generate-small-town',
			name: 'Generate Small Town',
			callback: async () => {
				await this.generateTownWithSize(6 + Math.floor(Math.random() * 4)); // 6-9
			}
		});
		
		this.addCommand({
			id: 'generate-large-town',
			name: 'Generate Large Town',
			callback: async () => {
				await this.generateTownWithSize(10 + Math.floor(Math.random() * 5)); // 10-14
			}
		});
		
		this.addCommand({
			id: 'generate-small-city',
			name: 'Generate Small City',
			callback: async () => {
				await this.generateTownWithSize(15 + Math.floor(Math.random() * 9)); // 15-23
			}
		});
		
		this.addCommand({
			id: 'generate-large-city',
			name: 'Generate Large City',
			callback: async () => {
				await this.generateTownWithSize(24 + Math.floor(Math.random() * 16)); // 24-39
			}
		});

		// Add settings tab
		this.addSettingTab(new TownGeneratorSettingsTab(this.app, this));
	}

	onunload() {
		// Close town generator view if open
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_TOWN_GENERATOR);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async activateTownGeneratorView() {
		const { workspace } = this.app;
		
		// Show loading notice
		new Notice("Generating town...");
		
		// Check if view is already open
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_TOWN_GENERATOR)[0];
		
		if (!leaf) {
			// If not open, create a new leaf
			leaf = workspace.getLeaf('split', 'vertical');
			await leaf.setViewState({
				type: VIEW_TYPE_TOWN_GENERATOR,
				active: true
			});
		}
		
		// Reveal and focus the leaf
		workspace.revealLeaf(leaf);
	}
	
	private async generateTownWithSize(size: number) {
		StateManager.size = size;
		StateManager.seed = -1; // Generate new seed
		
		// Use async creation instead of constructor
		try {
			await Model.createAsync(size);
			await this.activateTownGeneratorView();
		} catch (error) {
			console.error("Failed to generate town:", error);
			new Notice("Failed to generate town. Please try again.");
		}
	}
	
	private async refreshView() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TOWN_GENERATOR);
		if (leaves.length > 0) {
			// Use type assertion with unknown intermediate
			const view = leaves[0].view as unknown as TownGeneratorView;
			await view.refresh();
		}
	}
}