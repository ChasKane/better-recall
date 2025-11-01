import { ButtonComponent, DropdownComponent, Modal, Notice } from 'obsidian';
import BetterRecallPlugin from 'src/main';
import {
  CARD_MODAL_DESCRIPTION,
  SETTING_ITEM_DESCRIPTION,
} from 'src/ui/classes';
import { ButtonsBarComponent } from 'src/ui/components/ButtonsBarComponent';
import { InputAreaComponent } from 'src/ui/components/input/InputAreaComponent';
import { cn } from 'src/util';
import { translateText } from 'src/util/translation';

export abstract class CardModal extends Modal {
  private optionsContainerEl: HTMLElement;

  protected deckDropdownComp: DropdownComponent;
  protected frontInputComp: InputAreaComponent;
  protected backInputComp: InputAreaComponent;
  protected buttonsBarComp: ButtonsBarComponent;
  protected translateButtonComp: ButtonComponent | null = null;
  protected sourceLangDropdownComp: DropdownComponent | null = null;
  protected targetLangDropdownComp: DropdownComponent | null = null;
  protected backFieldLabelContainer: HTMLElement | null = null;

  constructor(protected plugin: BetterRecallPlugin) {
    super(plugin.app);
  }

  onOpen(): void {
    super.onOpen();

    this.optionsContainerEl = this.contentEl.createDiv(
      'better-recall-card__add-options',
    );

    this.render();
  }

  onClose(): void {
    this.frontInputComp.keyboardListener.cleanup();
    this.backInputComp.keyboardListener.cleanup();
    super.onClose();
    this.plugin.decksManager.save();
    this.contentEl.empty();
  }

  protected abstract render(): void;

  protected abstract submit(): void;

  protected renderDeckDropdown(): void {
    const decks = Object.entries(this.plugin.decksManager.getDecks()).reduce<
      Record<string, string>
    >((curr, [id, deck]) => {
      curr[id] = deck.getName();
      return curr;
    }, {});

    this.optionsContainerEl.createEl('p', {
      text: 'Deck:',
      cls: cn(SETTING_ITEM_DESCRIPTION, CARD_MODAL_DESCRIPTION),
    });
    this.deckDropdownComp = new DropdownComponent(
      this.optionsContainerEl,
    ).addOptions(decks);
    this.deckDropdownComp.selectEl.addClass('better-recall-field');
  }

  protected renderCardTypeDropdown(): void {
    this.optionsContainerEl.createEl('p', {
      text: 'Type:',
      cls: cn(SETTING_ITEM_DESCRIPTION, CARD_MODAL_DESCRIPTION),
    });
    const cardTypeDropdown = new DropdownComponent(this.optionsContainerEl)
      .addOptions({ basic: 'Basic' })
      .setDisabled(true);
    cardTypeDropdown.selectEl.addClass('better-recall-field');
  }

  protected renderBasicTypeFields(front?: string, back?: string): void {
    this.frontInputComp = new InputAreaComponent(this.contentEl, {
      description: 'Front',
    })
      .setValue(front ?? '')
      .onChange(this.handleInputChange.bind(this));
    this.frontInputComp.keyboardListener.onEnter = () => {
      if (this.disabled) {
        return;
      }

      this.submit();
    };

    this.backInputComp = new InputAreaComponent(this.contentEl, {
      description: '',
    })
      .setValue(back ?? '')
      .onChange(this.handleInputChange.bind(this));

    this.backFieldLabelContainer = this.contentEl.createDiv(
      'better-recall-back-field-container',
    );
    this.contentEl.insertBefore(
      this.backFieldLabelContainer,
      this.backInputComp.inputEl,
    );

    const backDescriptionEl = this.backFieldLabelContainer.createEl('p', {
      text: 'Back',
      cls: cn(SETTING_ITEM_DESCRIPTION, CARD_MODAL_DESCRIPTION),
    });
    backDescriptionEl.addClass('better-recall-back-field');

    const translateControlsContainer = this.backFieldLabelContainer.createDiv(
      'better-recall-translate-controls-container',
    );

    const languageOptions: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
      ar: 'Arabic',
      nl: 'Dutch',
      pl: 'Polish',
      tr: 'Turkish',
      sv: 'Swedish',
      da: 'Danish',
      fi: 'Finnish',
      no: 'Norwegian',
      cs: 'Czech',
      hu: 'Hungarian',
      ro: 'Romanian',
      el: 'Greek',
      he: 'Hebrew',
      hi: 'Hindi',
      th: 'Thai',
      vi: 'Vietnamese',
    };

    const dropdownsRow = translateControlsContainer.createDiv(
      'better-recall-lang-dropdowns-row',
    );

    const sourceLangContainer = dropdownsRow.createDiv(
      'better-recall-lang-dropdown-container',
    );
    this.sourceLangDropdownComp = new DropdownComponent(sourceLangContainer)
      .addOptions(languageOptions)
      .setValue('en');
    this.sourceLangDropdownComp.selectEl.addClass(
      'better-recall-lang-dropdown',
    );

    const targetLangContainer = dropdownsRow.createDiv(
      'better-recall-lang-dropdown-container',
    );
    this.targetLangDropdownComp = new DropdownComponent(targetLangContainer)
      .addOptions(languageOptions)
      .setValue('es');
    this.targetLangDropdownComp.selectEl.addClass(
      'better-recall-lang-dropdown',
    );

    const translateButtonContainer = translateControlsContainer.createDiv(
      'better-recall-translate-button-container',
    );
    this.translateButtonComp = new ButtonComponent(translateButtonContainer)
      .setButtonText('Translate')
      .setTooltip('Translate text')
      .onClick(this.handleTranslate.bind(this));
    this.translateButtonComp.buttonEl.addClass(
      'better-recall-translate-button',
    );

    this.backInputComp.descriptionEl = backDescriptionEl;

    this.backInputComp.keyboardListener.onEnter = () => {
      if (this.disabled) {
        return;
      }

      this.submit();
    };
  }

  protected async handleTranslate(): Promise<void> {
    const frontText = this.frontInputComp.getValue().trim();

    if (!frontText) {
      return;
    }

    const sourceLang = this.sourceLangDropdownComp?.getValue() || 'en';
    const targetLang = this.targetLangDropdownComp?.getValue() || 'es';

    if (sourceLang === targetLang) {
      new Notice('Source and target languages cannot be the same', 3000);
      return;
    }

    if (this.translateButtonComp) {
      this.translateButtonComp.setDisabled(true);
      this.translateButtonComp.setButtonText('Translating...');
    }
    if (this.sourceLangDropdownComp) {
      this.sourceLangDropdownComp.setDisabled(true);
    }
    if (this.targetLangDropdownComp) {
      this.targetLangDropdownComp.setDisabled(true);
    }

    try {
      const translatedText = await translateText(frontText, {
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });
      this.backInputComp.setValue(translatedText);
      this.handleInputChange();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Translation failed';
      console.error('Translation error:', errorMessage);
      new Notice(`Translation failed: ${errorMessage}`, 5000);
    } finally {
      if (this.translateButtonComp) {
        this.translateButtonComp.setDisabled(false);
        this.translateButtonComp.setButtonText('Translate');
      }
      if (this.sourceLangDropdownComp) {
        this.sourceLangDropdownComp.setDisabled(false);
      }
      if (this.targetLangDropdownComp) {
        this.targetLangDropdownComp.setDisabled(false);
      }
    }
  }

  protected renderButtonsBar(
    submitText: string,
    options: { container?: HTMLElement } = {},
  ): void {
    options.container ??= this.contentEl;

    this.buttonsBarComp = new ButtonsBarComponent(options.container)
      .setSubmitButtonDisabled(true)
      .setSubmitText(submitText)
      .onClose(this.close.bind(this));

    const submitButtonInBar =
      this.buttonsBarComp.buttonsBarEl.querySelector('button:last-child');
    if (submitButtonInBar) {
      (submitButtonInBar as HTMLElement).style.display = 'none';
    }

    if (this.backFieldLabelContainer) {
      const submitButtonComp = new ButtonComponent(
        this.backFieldLabelContainer,
      );
      submitButtonComp.setButtonText(submitText);
      submitButtonComp.setCta();
      submitButtonComp.setDisabled(true);
      submitButtonComp.onClick(this.submit.bind(this));
      submitButtonComp.buttonEl.addClass('better-recall-submit-button');

      this.buttonsBarComp.setSubmitButtonDisabled = (disabled: boolean) => {
        submitButtonComp.setDisabled(disabled);
        return this.buttonsBarComp;
      };

      this.buttonsBarComp.setSubmitText = (text: string) => {
        submitButtonComp.setButtonText(text);
        return this.buttonsBarComp;
      };
    } else {
      if (submitButtonInBar) {
        (submitButtonInBar as HTMLElement).style.display = '';
        this.buttonsBarComp.onSubmit(this.submit.bind(this));
      }
    }
  }

  protected handleInputChange() {
    const disabled =
      this.frontInputComp.getValue().length === 0 ||
      this.backInputComp.getValue().length === 0;
    this.buttonsBarComp.setSubmitButtonDisabled(disabled);
  }

  protected get disabled(): boolean {
    return (
      this.frontInputComp.getValue().length === 0 ||
      this.backInputComp.getValue().length === 0
    );
  }
}
