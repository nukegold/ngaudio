/*!
 * jQuery NGAudio, version: 0.0.2
 * Author: Nuke Goldstein
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 */

(function ($) {
    "use strict";

    var NgAudio = function (element, options) {
        var base = this;
        base.$element = $(element);
        base.domPlayer = base.$element[0];
        base.state = 0;
        base.streamWasLive = false;

        base.setOptions(options);

        // --- translate native player events to PLAYING / STOPPED / RECOVERING status ---

        base.events = {
            0: $.Event('ngaudio.stopped'),      // Player stopped or paused by user or when finished
            1: $.Event('ngaudio.playing'),      // Player is playing
            2: $.Event('ngaudio.recovering'),   // Player is loading, buffering, or recovering
        };

        base.domPlayer.onplaying = function () { base.monitor.stop(1); base.stateChange(1); }
        base.domPlayer.onloadstart = function () { if (base.state > 0) base.stateChange(2); }
        base.domPlayer.onerror = function () { if (base.state > 0) { base.monitor.start(1); base.stateChange(2); } }
        base.domPlayer.onstalled = function () { if (base.state > 0) { base.monitor.start(); base.stateChange(2); } }
        base.domPlayer.onsuspend = function () { if (base.state > 0) { base.monitor.start(); base.stateChange(2); } }
        base.domPlayer.onwaiting = function () { if (base.state > 0) { base.monitor.start(); base.stateChange(2); } }
        base.domPlayer.onended = function () { base.monitor.stop(); base.stateChange(0); }
        base.domPlayer.onprogress = function () {
            if (base.state && base.domPlayer.readyState === 4 && (base.domPlayer.networkState === 1 || base.domPlayer.networkState === 2)) {
                // Trigger event if an altered stream player after the original failed to play this session
                if (!base.streamWasLive && base.options.urlNew) {
                    var newUrl = base.options.urlNew; 
                    base.options.urlNew = null;     // do this first to prevent continuous callback calls in case of an exception in callback
                    if (base.options.callbackUrlFix) base.options.callbackUrlFix(newUrl);
                }

                base.monitor.stop(1);
                base.stateChange(1);

                // The current stream url managed to play (i.e. it is not a url that need fixing)
                base.streamWasLive = true;
            }
        }

        base.domPlayer.onplay = function () { if (base.state === 0) base.stateChange(1); }

        // -------------------------------------------------------------------------------

        base.getState = function () { return base.state; }

        base.play = function () {
            if (!base.options.url) return false;

            this.domPlayer.pause();
            this.domPlayer.play();
            return true;
        }

        base.pause = function () {
            this.domPlayer.pause();
            this.monitor.stop();
            this.stateChange(0);
            return true;
        }

        // ------------------------------ stream monitor ---------------------------------
        base.monitor = function () {
            base.monitor.init();
        }

        base.monitor.init = function () {
            if (base.monitor.timer) clearTimeout(base.monitor.timer);
            base.monitor.timer = null;
            base.monitor.failsCounter = 0;
        }

        base.monitor.start = function (isRetryAfterError) {
            if (base.monitor.timer) return;

            base.monitor.timer = setTimeout(function () {
                base.monitor.recover();
            }, isRetryAfterError ? base.options.retryAfterError : base.options.retryAfterStall);
        }

        base.monitor.stop = function (isStreamPlaying) {
            if (!base.monitor.timer) return;
            base.monitor.init();
        }

        base.monitor.recover = function () {
            base.monitor.timer = null;

            if (!base.streamWasLive && base.options.url && !base.options.url.endsWith(';')) {
                var a = '';
                if (!base.options.url.endsWith('/')) a = '/;'; else a = ';';
                base.options.urlNew = base.options.url + a;
                base.setDomSource(base.options.urlNew);
            }

            if (this.streamWasLive) this.domPlayer.pause();
            if (base.monitor.failsCounter++ >= base.options.recoverCycleCount) {
                base.monitor.failsCounter = 0;
                base.stateChange(0);
                if (base.options.callbackFailed) base.options.callbackFailed();
            } else {
                base.monitor.start();
                base.domPlayer.load();
                base.domPlayer.play();
            }
        }

        base.monitor();
        // ----------------------------------------------------------------------------
    }

    NgAudio.prototype.setOptions = function (_options) {
        this.options = _options;
        this.setSource(_options.url);
    }

    NgAudio.prototype.stateChange = function (_newState) {
        if (this.state === _newState) return;
        this.state = _newState;
        this.$element.trigger(this.events[_newState]);
    }

    NgAudio.prototype.setDomSource = function (url) {
        if (this.$element.find('source').prop('src') === url) return false;

        var src = '<source src="' + (url || '#') + '">';

        if (url) {
            src += '<object type="application/x-shockwave-flash" data="http://www.google.com/reader/ui/3523697345-audio-player.swf">';
            src += '<param name="flashvars" value="audioUrl=' + url + '">';
            src += '<param name="src" value="http://www.google.com/reader/ui/3523697345-audio-player.swf"/><param name="quality" value="best"/></object>';
        }

        this.$element.html(src);
        return true;
    }

    NgAudio.prototype.setSource = function (url) {
        if (!this.setDomSource(url)) return;

        if (this.streamWasLive) this.domPlayer.pause();
        this.streamWasLive = false;

        if (url) {
            this.domPlayer.load();
            if (this.options.autoPlay) this.domPlayer.play();
        } else {
            this.stateChange(0);
        }
    }

    $.fn.ngaudio = function (option) {
        var $this = $(this)
            , data = $this.data('ngplayer')
            , options = $.extend({}, $.fn.ngaudio.defaults, $this.data(), typeof option == 'object' && option);

        if (!data) $this.data('ngplayer', (data = new NgAudio(this, options)));
        else if (typeof option == 'string') return data[option]();
        else data.setOptions.call(data, options);
    }

    $.fn.ngaudio.defaults = {
        autoPlay: false,            // Auto play when stream address is set
        recoverCycleCount: 3,       // Times to retry before giving up (0 = no recovery effort, -1 = never stops trying)
        retryAfterError: 2000,      // Wait 2 seconds after error (e.g. server error) and try again 
        retryAfterStall: 10000,     // Wait 10 seconds after stall (e.g. stream connection 'hiccup') and try again
        shoutcastFix: 1,            // Ensure the url ends with '/;' (SHOUTcast protocol) during fail recovery if stream never played this session
        callbackFailed: undefined,  // Callback - when stream error and recovery failed
        callbackUrlFix: undefined   // Stream URL that did not play was altered by software and played successfuly 
    }

} (jQuery));
