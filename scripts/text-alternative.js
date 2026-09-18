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
      this.handleFallbackFocus = this.handleFallbackFocus.bind(this);
      this.handleFallbackKeydown = this.handleFallbackKeydown.bind(this);
      this.handleFallbackPointer = this.handleFallbackPointer.bind(this);
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
      this.container = container;
      this.resizeElement = this.params.resizeElement;
      this.wrapperElement = container.classList.contains('h5p-audio-wrapper') ?
        container :
        container.closest('.h5p-audio-wrapper');
      this.mode = mode;
      this.container.classList.add('h5p-audio-has-text-alternative');
      this.container.classList.add(`h5p-audio-has-text-alternative-${mode}`);
      if (this.wrapperElement) {
        this.wrapperElement.classList.add('h5p-audio-has-text-alternative-wrapper');
      }
      this.button = this.createButton(mode);
      this.dialog = this.createDialog();

      container.append(this.button, this.dialog);
    }

    /**
     * Close the dialog.
     */
    close() {
      if (!this.dialog || !this.isDialogOpen()) {
        return;
      }

      const usedFallbackModal = this.isFallbackModalActive();

      if (typeof this.dialog.close === 'function') {
        this.dialog.close();
      }
      else {
        this.dialog.removeAttribute('open');
        this.dialog.dispatchEvent(new Event('close'));
      }

      if (usedFallbackModal) {
        this.handleDialogClosed(this.dialog);
      }
    }

    /**
     * Detach the text alternative control.
     */
    detach() {
      const dialog = this.dialog;
      this.close();

      if (dialog && (this.backdrop || this.fallbackPlaceholder)) {
        this.disableFallbackModal();
        dialog.removeAttribute('aria-modal');
      }

      if (this.container) {
        this.container.classList.remove('h5p-audio-has-text-alternative');
        if (this.mode) {
          this.container.classList.remove(`h5p-audio-has-text-alternative-${this.mode}`);
        }
        this.container = undefined;
      }
      if (this.resizeElement) {
        this.resizeElement.classList.remove('h5p-audio-text-alternative-is-open');
        this.resizeElement = undefined;
      }
      if (this.wrapperElement) {
        this.wrapperElement.classList.remove('h5p-audio-has-text-alternative-wrapper');
        this.wrapperElement = undefined;
      }
      this.mode = undefined;

      if (this.button) {
        this.button.remove();
        this.button = undefined;
      }

      if (dialog) {
        dialog.remove();
        if (this.dialog === dialog) {
          this.dialog = undefined;
        }
      }

      this.text = undefined;
    }

    /**
     * Check whether a text alternative is available.
     *
     * @param {string} text Text alternative.
     * @returns {boolean} True if a text alternative is available.
     */
    hasTextAlternative(text) {
      return typeof text === 'string' && text.trim() !== '';
    }

    /**
     * Check whether the dialog is open.
     *
     * @returns {boolean} True if the dialog is open.
     */
    isDialogOpen() {
      return Boolean(this.dialog && (this.dialog.open || this.dialog.hasAttribute('open')));
    }

    /**
     * Check whether fallback modal scaffolding is currently attached.
     *
     * @returns {boolean} True if fallback modal scaffolding is attached.
     */
    isFallbackModalActive() {
      return Boolean(this.backdrop || this.fallbackPlaceholder);
    }

    /**
     * Request parent layout recalculation.
     */
    requestResize() {
      if (typeof this.params.onResize === 'function') {
        this.params.onResize();
      }
    }

    /**
     * Disable fallback modal event handling.
     */
    disableFallbackModal() {
      document.removeEventListener('focusin', this.handleFallbackFocus, true);
      document.removeEventListener('keydown', this.handleFallbackKeydown, true);
      document.removeEventListener('click', this.handleFallbackPointer, true);
      document.removeEventListener('pointerdown', this.handleFallbackPointer, true);
      if (this.backdrop) {
        this.backdrop.remove();
        this.backdrop = undefined;
      }
      if (this.fallbackPlaceholder) {
        if (this.fallbackPlaceholder.parentNode) {
          this.fallbackPlaceholder.parentNode.insertBefore(
            this.dialog,
            this.fallbackPlaceholder
          );
        }
        this.fallbackPlaceholder.remove();
        this.fallbackPlaceholder = undefined;
      }
      this.dialog.classList.remove('h5p-audio-text-alternative-dialog--fallback');
      if (typeof this.fallbackHadDirAttribute !== 'undefined') {
        if (this.fallbackHadDirAttribute) {
          this.dialog.setAttribute('dir', this.fallbackOriginalDir);
        }
        else {
          this.dialog.removeAttribute('dir');
        }
      }
      this.fallbackHadDirAttribute = undefined;
      this.fallbackOriginalDir = undefined;
    }

    /**
     * Keep keyboard focus inside the fallback dialog.
     *
     * @param {FocusEvent} event Focus event.
     */
    handleFallbackFocus(event) {
      if (!this.dialog || !this.isDialogOpen() || this.dialog.contains(event.target)) {
        return;
      }

      this.focusDialogTitle();
    }

    /**
     * Handle fallback modal keyboard interaction.
     *
     * @param {KeyboardEvent} event Keyboard event.
     */
    handleFallbackKeydown(event) {
      if (!this.isDialogOpen()) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = Array.prototype.slice
        .call(this.dialog.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ))
        .filter((element) => !element.disabled);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!firstElement || !lastElement) {
        event.preventDefault();
        this.focusDialogTitle();
      }
      else if (
        !this.dialog.contains(activeElement) ||
        focusableElements.indexOf(activeElement) === -1
      ) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      }
      else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }

      if (event.defaultPrevented) {
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
      }
    }

    /**
     * Block pointer interaction outside the fallback dialog.
     *
     * @param {PointerEvent|MouseEvent} event Pointer event.
     */
    handleFallbackPointer(event) {
      if (!this.dialog || !this.isDialogOpen() || this.dialog.contains(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      this.close();
    }

    /**
     * Enable fallback modal event handling.
     */
    enableFallbackModal() {
      this.fallbackPlaceholder = document.createComment('h5p-audio-text-alternative-dialog');
      this.fallbackHadDirAttribute = this.dialog.hasAttribute('dir');
      this.fallbackOriginalDir = this.dialog.getAttribute('dir');
      this.dialog.dir = window.getComputedStyle(this.dialog).direction;
      this.dialog.classList.add('h5p-audio-text-alternative-dialog--fallback');
      this.dialog.parentNode.insertBefore(this.fallbackPlaceholder, this.dialog);
      const modalRoot = document.fullscreenElement || document.body;
      this.backdrop = document.createElement('div');
      this.backdrop.className = 'h5p-audio-text-alternative-fallback-backdrop';
      this.backdrop.setAttribute('aria-hidden', 'true');
      modalRoot.append(this.backdrop);
      modalRoot.append(this.dialog);
      document.addEventListener('focusin', this.handleFallbackFocus, true);
      document.addEventListener('keydown', this.handleFallbackKeydown, true);
      document.addEventListener('click', this.handleFallbackPointer, true);
      document.addEventListener('pointerdown', this.handleFallbackPointer, true);
    }

    /**
     * Handle the dialog closing.
     *
     * @param {HTMLDialogElement} dialog Closed dialog.
     */
    handleDialogClosed(dialog) {
      if (dialog !== this.dialog || !this.button || this.isDialogOpen()) {
        return;
      }

      this.disableFallbackModal();
      dialog.removeAttribute('aria-modal');
      this.button.setAttribute('aria-expanded', 'false');
      if (this.resizeElement) {
        this.resizeElement.classList.remove('h5p-audio-text-alternative-is-open');
      }

      if (this.button.isConnected) {
        this.button.focus();
      }
      this.requestResize();
    }

    /**
     * Move focus to the dialog title.
     */
    focusDialogTitle() {
      this.dialog.querySelector('.h5p-audio-text-alternative-title').focus({
        preventScroll: true
      });
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
      button.append(...this.createButtonContent());
      button.title = this.params.buttonLabel;
      button.setAttribute('aria-label', this.params.buttonLabel);
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
     * Create the visible button contents.
     *
     * @returns {HTMLElement[]} Button content.
     */
    createButtonContent() {
      const content = [];

      content.push(this.createIcon('document'));

      const label = document.createElement('span');
      label.className = 'h5p-audio-text-alternative-label';
      label.textContent = this.params.buttonLabel;
      content.push(label);

      return content;
    }

    /**
     * Create a decorative icon.
     *
     * @param {string} icon Icon type.
     * @returns {HTMLSpanElement} Icon.
     */
    createIcon(icon) {
      const span = document.createElement('span');
      span.className = `h5p-audio-text-alternative-icon h5p-audio-text-alternative-icon-${icon}`;
      span.setAttribute('aria-hidden', 'true');

      return span;
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
      dialog.setAttribute('role', 'dialog');
      dialog.tabIndex = -1;

      const title = document.createElement('h2');
      title.id = `${this.id}-title`;
      title.className = 'h5p-audio-text-alternative-title';
      title.tabIndex = -1;
      title.textContent = this.params.dialogTitle;

      const headerCloseButton = this.createCloseButton(
        'h5p-audio-text-alternative-close-icon'
      );
      headerCloseButton.textContent = '×';

      const header = document.createElement('div');
      header.className = 'h5p-audio-text-alternative-header';
      header.append(title, headerCloseButton);

      const content = document.createElement('div');
      content.id = `${this.id}-content`;
      content.className = 'h5p-audio-text-alternative-content';
      content.textContent = this.text;

      const closeButton = this.createCloseButton(
        'h5p-audio-text-alternative-close-footer'
      );
      closeButton.textContent = this.params.closeLabel;

      const footer = document.createElement('div');
      footer.className = 'h5p-audio-text-alternative-footer';
      footer.append(closeButton);

      dialog.addEventListener('close', (event) => {
        this.handleDialogClosed(event.target);
      });

      dialog.addEventListener('click', (event) => {
        const bounds = dialog.getBoundingClientRect();
        const isOutside = event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom;

        if (isOutside) {
          this.close();
        }
      });

      dialog.append(header, content, footer);

      return dialog;
    }

    /**
     * Create a button that closes the dialog.
     *
     * @param {string} className Extra button class.
     * @returns {HTMLButtonElement} Close button.
     */
    createCloseButton(className) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `h5p-audio-text-alternative-close ${className}`;
      button.setAttribute('aria-label', this.params.closeLabel);
      button.addEventListener('click', () => {
        this.close();
      });

      return button;
    }

    /**
     * Open the dialog.
     */
    open() {
      if (!this.dialog || !this.dialog.isConnected || this.isDialogOpen()) {
        return;
      }

      this.button.setAttribute('aria-expanded', 'true');
      if (this.resizeElement) {
        this.resizeElement.classList.add('h5p-audio-text-alternative-is-open');
      }

      if (typeof this.dialog.showModal === 'function') {
        this.dialog.showModal();
      }
      else {
        if (this.isFallbackModalActive()) {
          this.disableFallbackModal();
        }
        this.enableFallbackModal();
        this.dialog.setAttribute('open', 'open');
        this.dialog.setAttribute('aria-modal', 'true');
      }

      this.dialog.scrollTop = 0;
      this.focusDialogTitle();
      this.requestResize();
    }
  }

  return AudioTextAlternative;
})();
