import { App, PluginSettingTab, Setting } from 'obsidian';
import TownGeneratorPlugin from '../main';
import { CityMap } from '../../renderer/CityMap';

export class TownGeneratorSettingsTab extends PluginSettingTab {
	plugin: TownGeneratorPlugin;

	constructor(app: App, plugin: TownGeneratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Town Generator Settings' });

		new Setting(containerEl)
			.setName('Default Town Size')
			.setDesc('The default size of generated towns (6-40)')
			.addSlider(slider => slider
				.setLimits(6, 40, 1)
				.setValue(this.plugin.settings.defaultSize)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.defaultSize = value;
					await this.plugin.saveSettings();
				}))
			.addExtraButton(button => button
				.setIcon('reset')
				.setTooltip('Reset to default (15)')
				.onClick(async () => {
					this.plugin.settings.defaultSize = 15;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName('Default Palette')
			.setDesc('The default color palette for town maps')
			.addDropdown(dropdown => {
				const palettes = ['DEFAULT', 'BLUEPRINT', 'BW', 'INK', 'NIGHT', 'ANCIENT', 'COLOUR', 'SIMPLE'];
				palettes.forEach(palette => {
					dropdown.addOption(palette, palette.charAt(0) + palette.slice(1).toLowerCase());
				});
				
				dropdown.setValue(this.plugin.settings.defaultPalette);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultPalette = value;
					CityMap.setPalette(value);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Show Tooltips')
			.setDesc('Show tooltips when hovering over districts in the town map')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showTooltips)
				.onChange(async (value) => {
					this.plugin.settings.showTooltips = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Town Generation Settings' });

		const townGenerationInfoEl = containerEl.createDiv();
		townGenerationInfoEl.innerHTML = `
			<p>Towns are generated with the following probability features:</p>
			<ul>
				<li>Plaza: 50% chance</li>
				<li>Citadel/Castle: 50% chance</li>
				<li>City Walls: 50% chance</li>
			</ul>
			<p>Different town sizes:</p>
			<ul>
				<li>Small Town: 6-9 districts</li>
				<li>Large Town: 10-14 districts</li>
				<li>Small City: 15-23 districts</li>
				<li>Large City: 24-39 districts</li>
				<li>Metropolis: 40+ districts</li>
			</ul>
		`;

		containerEl.createEl('h3', { text: 'About' });
		
		const aboutEl = containerEl.createDiv();
		aboutEl.innerHTML = `
			<p>This plugin is a conversion of watabou's town generator algorithm, which was 
			originally implemented in Haxe/OpenFL.</p>
			<p>The plugin allows you to generate procedural fantasy towns and cities for your 
			worldbuilding projects and RPG campaigns.</p>
			<p>Use the generated towns as a starting point and customize them to fit your needs.</p>
		`;
	}
}