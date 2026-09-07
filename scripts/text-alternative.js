window.H5P = window.H5P || {};

/**
 * Text alternative control for H5P Audio.
 */
window.H5P.AudioTextAlternative = (() => {
  let instanceCounter = 0;

  class AudioTextAlternative {
    /**
     * @param {Object} params Text alternative parameters.
     */
    constructor(params) {
      this.params = params;
      this.id = `h5p-audio-text-alternative-${++instanceCounter}`;
    }

    /**
     * Attach the text alternative control.
     *
     * @param {HTMLElement} container Container for the control.
     * @param {string} mode Player mode.
     * @param {string} text Text alternative.
     */
    attach(container, mode, text) {
      this.detach();

      if (!this.hasTextAlternative(text) || !container) {
        return;
      }

      this.text = text;
      this.button = this.createButton(mode);
      this.dialog = this.createDialog();

      container.append(this.button, this.dialog);
    }

    /**
     * Close the dialog.
     */
    close() {
      if (!this.dialog || !this.dialog.open) {
        return;
      }

      this.dialog.close();
    }

    /**
     * Detach the text alternative control.
     */
    detach() {
      this.close();

      if (this.button) {
        this.button.remove();
        this.button = undefined;
      }

      if (this.dialog) {
        this.dialog.remove();
        this.dialog = undefined;
      }
    }

    /**
     * Determine whether a text alternative is available.
     *
     * @param {string} text Text alternative.
     * @returns {boolean} True if a text alternative is available.
     */
    hasTextAlternative(text) {
      return typeof text === 'string' && text.trim() !== '';
    }

    /**
     * Create the opener button.
     *
     * @param {string} mode Player mode.
     * @returns {HTMLButtonElement} Opener button.
     */
    createButton(mode) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `h5p-audio-text-alternative-button h5p-audio-text-alternative-${mode}`;
      button.textContent = this.params.label;
      button.title = this.params.label;
      button.setAttribute('aria-label', this.params.label);
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', `${this.id}-dialog`);
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.open();
      });

      return button;
    }

    /**
     * Create the native dialog.
     *
     * @returns {HTMLDialogElement} Dialog.
     */
    createDialog() {
      const dialog = document.createElement('dialog');
      dialog.id = `${this.id}-dialog`;
      dialog.className = 'h5p-audio-text-alternative-dialog';
      dialog.setAttribute('aria-labelledby', `${this.id}-title`);
      dialog.setAttribute('aria-describedby', `${this.id}-content`);

      const title = document.createElement('h2');
      title.id = `${this.id}-title`;
      title.className = 'h5p-audio-text-alternative-title';
      title.textContent = this.params.label;

      const content = document.createElement('div');
      content.id = `${this.id}-content`;
      content.className = 'h5p-audio-text-alternative-content';
      content.textContent = this.text;

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'h5p-audio-text-alternative-close';
      closeButton.textContent = this.params.closeLabel;
      closeButton.setAttribute('aria-label', this.params.closeLabel);
      closeButton.setAttribute('autofocus', 'autofocus');
      closeButton.addEventListener('click', () => {
        this.close();
      });

      dialog.addEventListener('close', () => {
        if (!this.button) {
          return;
        }

        this.button.setAttribute('aria-expanded', 'false');

        if (this.button.isConnected) {
          this.button.focus();
        }
      });

      dialog.append(title, content, closeButton);

      return dialog;
    }

    /**
     * Open the dialog.
     */
    open() {
      if (!this.dialog || this.dialog.open) {
        return;
      }

      this.button.setAttribute('aria-expanded', 'true');
      this.dialog.showModal();
    }
  }

  return AudioTextAlternative;
})();
