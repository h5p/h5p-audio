var H5P = H5P || {};

/**
 * Constructor.
 * 
 * @param {object} params Options for this library.
 * @param {string} contentPath The path to our content folder.
 */
H5P.Audio = function (params, contentPath) {
  this.params = params;
  this.contentPath = contentPath;
  
  if (window['H5PEditor'] !== undefined) {
    // TODO: Clean up tmp stuff
    this.tmpPath = H5PEditor.filesPath + '/h5peditor/';
  }
};

/**
 * Wipe out the content of the wrapper and put our HTML in it.
 * 
 * @param {jQuery} $wrapper Our poor container.
 */
H5P.Audio.prototype.attach = function ($wrapper) {
  // Check if browser supports audio.
  var audio = document.createElement('audio');
  if (audio.canPlayType === undefined) {
    // Try flash
    this.attachFlash($wrapper);
    return;
  }
  
  // Add supported source files.
  if (this.params.files !== undefined) {
    for (var i = 0; i < this.params.files.length; i++) {
      var file = this.params.files[i];
    
      if (audio.canPlayType(file.mime)) {
        var source = document.createElement('source');
        source.src = (file.tmp !== undefined && file.tmp ? this.tmpPath : this.contentPath) + file.path;
        source.type = file.mime;
        audio.appendChild(source);
      }
    }
  }
  
  if (!audio.children) {
    $wrapper.text('No supported audio files found.');
    return;
  }
  
  audio.className = 'h5p-audio';
  audio.controls = this.params.controls === undefined ? true : this.params.controls;
  audio.autoplay = this.params.autoplay === undefined ? false : this.params.autoplay;
  
  if (this.params.fitToWrapper === undefined || this.params.fitToWrapper) {
    audio.style.width = '100%';
    audio.style.height = '100%';
  }
  
  $wrapper.html(audio);
};

/**
 * Attaches a flash audio player to the wrapper.
 * 
 * @param {jQuery} $wrapper Our dear container.
 */
H5P.Audio.prototype.attachFlash = function ($wrapper) {
  if (this.params.files !== undefined) {
    for (var i = 0; i < this.params.files.length; i++) {
      var file = this.params.files[i];
      if (file.mime === 'audio/mpeg' || file.mime === 'audio/mp3') {
        var audioSource = (file.tmp !== undefined && file.tmp ? this.tmpPath : this.contentPath) + file.path;
        break;
      }
    }
  }
  
  if (audioSource === undefined) {
    $wrapper.text('No supported audio files found.');
  }
  
  var options = {
    buffering: true,
    clip: {
      url: window.location.protocol + '//' + window.location.host + audioSource,
      autoPlay: this.params.autoplay === undefined ? false : this.params.autoplay,
      autoBuffering: true,
      scaling: 'fit'
    },
    plugins: {}
  };
  
  if (this.params.controls === undefined || this.params.controls) {
    options.plugins.controls = {
      url: 'http://releases.flowplayer.org/swf/flowplayer.controls-tube-3.2.15.swf',
      autoHide: false
    };
  }
  
  this.flowplayer = flowplayer($wrapper[0], {
    src: "http://releases.flowplayer.org/swf/flowplayer-3.2.16.swf",
    wmode: "opaque"
  }, options);
};