window.H5P = window.H5P || {};

/**
 * Custom controls for the full H5P Audio player.
 */
window.H5P.AudioControls = class {
  /**
   * @param {HTMLAudioElement} audio Audio element to control.
   * @param {Object} labels Localized control labels.
   */
  constructor(audio, labels) {
    this.audio = audio;
    this.labels = labels;
    this.listeners = [];
    this.lastVolume = audio.volume > 0 ? audio.volume : 1;
  }

  /**
   * Attach the controls.
   *
   * @param {HTMLElement} container Controls container.
   * @returns {HTMLElement} Controls element.
   */
  attach(container) {
    this.detach();

    this.controls = document.createElement('div');
    this.controls.className = 'h5p-audio-full-controls';
    this.controls.setAttribute('role', 'group');
    this.controls.setAttribute('aria-label', this.labels.audio);

    this.playButton = this.createButton(
      'h5p-audio-full-play',
      this.labels.play,
      () => this.togglePlayback()
    );

    this.progress = document.createElement('input');
    this.progress.type = 'range';
    this.progress.className = 'h5p-audio-full-progress';
    this.progress.min = '0';
    this.progress.max = '0';
    this.progress.step = '1';
    this.progress.value = '0';
    this.progress.setAttribute('aria-label', this.labels.progress);

    this.time = document.createElement('span');
    this.time.className = 'h5p-audio-full-time';
    this.time.textContent = '0:00 / 0:00';

    this.muteButton = this.createButton(
      'h5p-audio-full-mute',
      this.labels.mute,
      () => this.toggleMute()
    );

    this.volume = document.createElement('input');
    this.volume.type = 'range';
    this.volume.className = 'h5p-audio-full-volume';
    this.volume.min = '0';
    this.volume.max = '1';
    this.volume.step = '0.05';
    this.volume.value = String(this.audio.volume);
    this.volume.setAttribute('aria-label', this.labels.volume);

    this.controls.append(
      this.playButton,
      this.time,
      this.progress,
      this.muteButton,
      this.volume
    );

    container.append(this.controls);
    this.addEventListeners();
    this.updateDuration();
    this.updatePlaybackState();
    this.updateVolumeState();

    return this.controls;
  }

  /**
   * Remove the controls and their listeners.
   */
  detach() {
    this.listeners.forEach(({ target, type, listener }) => {
      target.removeEventListener(type, listener);
    });
    this.listeners = [];

    if (this.controls) {
      this.controls.remove();
      this.controls = undefined;
    }

    this.playButton = undefined;
    this.progress = undefined;
    this.time = undefined;
    this.muteButton = undefined;
    this.volume = undefined;
  }

  /**
   * Create a control button.
   *
   * @param {string} className Button class.
   * @param {string} label Accessible label.
   * @param {Function} listener Click listener.
   * @returns {HTMLButtonElement} Control button.
   */
  createButton(className, label, listener) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.addEventListener('click', listener);

    return button;
  }

  /**
   * Register an event listener for cleanup on reattachment.
   *
   * @param {EventTarget} target Event target.
   * @param {string} type Event type.
   * @param {Function} listener Event listener.
   */
  listen(target, type, listener) {
    target.addEventListener(type, listener);
    this.listeners.push({ target, type, listener });
  }

  /**
   * Add media and control event listeners.
   */
  addEventListeners() {
    this.listen(this.audio, 'play', () => this.updatePlaybackState());
    this.listen(this.audio, 'pause', () => this.updatePlaybackState());
    this.listen(this.audio, 'ended', () => this.updatePlaybackState());
    this.listen(this.audio, 'durationchange', () => this.updateDuration());
    this.listen(this.audio, 'loadedmetadata', () => this.updateDuration());
    this.listen(this.audio, 'timeupdate', () => this.updateTime());
    this.listen(this.audio, 'volumechange', () => this.updateVolumeState());

    this.listen(this.progress, 'input', () => {
      this.audio.currentTime = Number(this.progress.value);
    });

    this.listen(this.volume, 'input', () => {
      this.audio.muted = false;
      this.audio.volume = Number(this.volume.value);
      if (this.audio.volume > 0) {
        this.lastVolume = this.audio.volume;
      }
    });
  }

  /**
   * Toggle mute state.
   */
  toggleMute() {
    if (this.audio.muted || this.audio.volume === 0) {
      this.audio.muted = false;

      if (this.audio.volume === 0) {
        this.audio.volume = this.lastVolume || 1;
      }
    }
    else {
      this.lastVolume = this.audio.volume;
      this.audio.muted = true;
    }
  }

  /**
   * Toggle audio playback.
   */
  togglePlayback() {
    if (this.audio.paused) {
      try {
        const playPromise = this.audio.play();

        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((error) => console.warn(error));
        }
      }
      catch (error) {
        console.warn(error);
      }
    }
    else {
      this.audio.pause();
    }
  }

  /**
   * Update the play/pause control.
   */
  updatePlaybackState() {
    if (!this.playButton) {
      return;
    }

    const isPlaying = !this.audio.paused && !this.audio.ended;
    const label = isPlaying ? this.labels.pause : this.labels.play;

    this.playButton.classList.toggle('h5p-audio-full-pause', isPlaying);
    this.playButton.setAttribute('aria-label', label);
    this.playButton.title = label;
  }

  /**
   * Update duration-dependent controls.
   */
  updateDuration() {
    if (!this.progress) {
      return;
    }

    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    this.progress.max = String(duration);
    this.progress.disabled = duration === 0;
    this.updateTime();
  }

  /**
   * Update the progress and time display.
   */
  updateTime() {
    if (!this.progress || !this.time) {
      return;
    }

    const currentTime = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;

    this.progress.value = String(Math.min(currentTime, duration));
    this.progress.setAttribute(
      'aria-valuetext',
      `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`
    );
    this.time.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
  }

  /**
   * Update mute and volume controls.
   */
  updateVolumeState() {
    if (!this.muteButton || !this.volume) {
      return;
    }

    const isMuted = this.audio.muted || this.audio.volume === 0;
    const label = isMuted ? this.labels.unmute : this.labels.mute;

    this.muteButton.classList.toggle('h5p-audio-full-unmute', isMuted);
    this.muteButton.setAttribute('aria-label', label);
    this.muteButton.title = label;
    this.volume.value = String(this.audio.volume);
  }

  /**
   * Format a duration as minutes and seconds.
   *
   * @param {number} seconds Duration in seconds.
   * @returns {string} Formatted duration.
   */
  formatTime(seconds) {
    const wholeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(wholeSeconds / 3600);
    const minutes = Math.floor((wholeSeconds % 3600) / 60);
    const remainingSeconds = String(wholeSeconds % 60).padStart(2, '0');

    if (hours === 0) {
      return `${minutes}:${remainingSeconds}`;
    }

    return `${hours}:${String(minutes).padStart(2, '0')}:${remainingSeconds}`;
  }
};
