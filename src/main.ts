import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TownGeneratorView, VIEW_TYPE_TOWN_GENERATOR } from './ui/TownView';
import { TownGeneratorSettingsTab } from './ui/SettingsTab';
import { Model } from './generator/Model';
import { StateManager } from './src/generator/StateManager';

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
			(leaf) => new TownGeneratorView(leaf, this)
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
			callback: () => {
				this.generateTownWithSize(6 + Math.floor(Math.random() * 4)); // 6-9
			}
		});

		this.addCommand({
			id: 'generate-large-town',
			name: 'Generate Large Town',
			callback: () => {
				this.generateTownWithSize(10 + Math.floor(Math.random() * 5)); // 10-14
			}
		});

		this.addCommand({
			id: 'generate-small-city',
			name: 'Generate Small City',
			callback: () => {
				this.generateTownWithSize(15 + Math.floor(Math.random() * 9)); // 15-23
			}
		});

		this.addCommand({
			id: 'generate-large-city',
			name: 'Generate Large City',
			callback: () => {
				this.generateTownWithSize(24 + Math.floor(Math.random() * 16)); // 24-39
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

	private generateTownWithSize(size: number) {
		StateManager.size = size;
		StateManager.seed = -1; // Generate new seed
		new Model(size, StateManager.seed);
		this.activateTownGeneratorView();
	}

	private refreshView() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TOWN_GENERATOR);
		if (leaves.length > 0) {
			const view = leaves[0].view as TownGeneratorView;
			view.refresh();
		}
	}
}