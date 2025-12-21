import {
  Setting,
  PluginSettingTab,
  TextComponent,
  ButtonComponent,
} from 'obsidian';
import BetterRecallPlugin from 'src/main';
import { ResetButtonComponent } from '../components/ResetButtonComponent';
import { AnkiParameters, DEFAULT_SETTINGS } from 'src/settings/data';

export class SettingsTab extends PluginSettingTab {
  private titleParameterMapping: Record<
    string,
    { description: string; parameter: keyof AnkiParameters }
  > = {
    'Lapse interval': {
      parameter: 'lapseInterval',
      description:
        'The multiplier applied to the current interval when a card lapses.',
    },
    'Easy interval': {
      parameter: 'easyInterval',
      description:
        'The interval (in days) assigned to a card when rated as `easy` during learning/relearning.',
    },
    'Easy bonus': {
      parameter: 'easyBonus',
      description:
        'The multiplier applied to the interval when a review card is rated as `easy`.',
    },
    'Graduating interval': {
      parameter: 'graduatingInterval',
      description:
        'The interval (in days) assigned to a card when it graduates from learning to review.',
    },
    'Min ease factor': {
      parameter: 'minEaseFactor',
      description: 'The minimum allowed ease factor for a card.',
    },
    'Ease factor decrement': {
      parameter: 'easeFactorDecrement',
      description:
        'The amount by which the ease factor is decreased when a card is rated as `again`.',
    },
    'Ease factor increment': {
      parameter: 'easeFactorIncrement',
      description:
        'The amount by which the ease factor is increased when a card is rated as `easy`.',
    },
    'Hard interval multiplier': {
      parameter: 'hardIntervalMultiplier',
      description:
        'The multiplier applied to the current interval when a review card is rated as `hard`.',
    },
    'Learning steps': {
      parameter: 'learningSteps',
      description:
        'Comma-separated step intervals (in minutes) for new cards in the learning phase.',
    },
    'Relearning steps': {
      parameter: 'relearningSteps',
      description:
        'Comma-separated step intervals (in minutes) for cards in the relearning phase.',
    },
  };

  constructor(private plugin: BetterRecallPlugin) {
    super(plugin.app, plugin);
  }

  display() {
    this.containerEl.empty();

    // Decks folder name setting (at the top)
    let folderNameComponent: TextComponent | null = null;
    const folderNameSetting = new Setting(this.containerEl)
      .setName('Decks folder name')
      .setDesc(
        'The name of the folder where deck files are stored. Click "Save" to rename the folder and move all existing decks.',
      );

    // Warning about file names
    const warningDesc = this.containerEl.createDiv();
    warningDesc.addClass('setting-item-description');
    warningDesc.style.color = 'var(--text-muted)';
    warningDesc.style.fontStyle = 'italic';
    warningDesc.style.marginTop = 'var(--size-2-1)';
    warningDesc.style.marginBottom = 'var(--size-4-3)';
    warningDesc.setText(
      '⚠️ Please do not manually rename or move individual deck files. Only change the folder name using this setting. The plugin manages file names automatically.',
    );

    folderNameSetting.addText((text) => {
      folderNameComponent = text;
      const currentFolderName =
        this.plugin.getSettings().decksFolderName ||
        DEFAULT_SETTINGS.decksFolderName;
      text.setValue(currentFolderName);
      text.setPlaceholder('Language Recall');
    });

    folderNameSetting.addButton((button: ButtonComponent) => {
      button.setButtonText('Save').setCta().onClick(async () => {
        if (!folderNameComponent) {
          return;
        }

        const newFolderName = folderNameComponent.getValue().trim();
        if (!newFolderName) {
          return;
        }

        try {
          // Rename the folder and move all deck files
          await this.plugin.decksManager.renameDecksFolder(newFolderName);
          // Update the setting
          this.plugin.setDecksFolderName(newFolderName);
          await this.plugin.savePluginData();

          // Show success message
          button.setButtonText('Saved!');
          setTimeout(() => {
            button.setButtonText('Save');
          }, 2000);
        } catch (error) {
          console.error('Failed to rename decks folder:', error);
          button.setButtonText('Error');
          setTimeout(() => {
            button.setButtonText('Save');
          }, 2000);
        }
      });
    });

    // Add a separator
    this.containerEl.createEl('hr');

    Object.entries(this.titleParameterMapping).forEach(
      ([key, { parameter, description }]) => {
        let textComponent: TextComponent | null = null;
        const pluginValue = this.plugin.getSettings().ankiParameters[parameter];

        const setting = new Setting(this.containerEl)
          .setName(key)
          .setDesc(description);

        new ResetButtonComponent(setting.controlEl).onClick(async () => {
          if (!textComponent) {
            return;
          }

          const defaultValue = DEFAULT_SETTINGS.ankiParameters[parameter];
          this.setValue(textComponent, defaultValue);
          this.plugin.setAnkiParameter(parameter, defaultValue);
          await this.plugin.savePluginData();
        });

        setting.addText((text) => {
          textComponent = text;
          this.setValue(text, pluginValue);

          text.onChange(async (input) => {
            input = input.trim();
            if (
              parameter === 'learningSteps' ||
              parameter === 'relearningSteps'
            ) {
              if (!this.isStringValidArray(input)) {
                return;
              }

              const newValue = this.parseStringToArray(input);
              this.plugin.setAnkiParameter(parameter, newValue);
            } else {
              if (isNaN(+input)) {
                return;
              }

              this.plugin.setAnkiParameter(parameter, Number(input));
            }

            await this.plugin.savePluginData();
          });
        });
      },
    );
  }

  private setValue(text: TextComponent, value: number | number[]): void {
    if (Array.isArray(value)) {
      text.setValue(value.join(','));
    } else {
      text.setValue(value.toString());
    }
  }

  private parseStringToArray(input: string): number[] {
    return input
      .trim()
      .split(',')
      .map((text) => Number(text));
  }

  private isStringValidArray(input: string): boolean {
    return input
      .trim()
      .split(',')
      .every((text) => !isNaN(+text));
  }
}
