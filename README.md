jquery.ngaudio.js

https://github.com/nukegold/ngaudio

Nov 03, 2016 - First version

# Overview:
The HTML 5 ```<audio>``` is a powerful tool that allows playing audio from web pages. However, local network or stream server side problems can
impeded the experience. The NgAudio jQuery plugin is designed to simplify use of the HTML5 <audio> tag and add an internal reliability 
monitoring to the stream. In case of an error the plugin will attempt to automatically revive the connection. In addition
the plugin can try to resolve issues such as SHOUTcast url format.

## Options
**autoPlay**: false             // Auto play when stream address is set

**recoverCycleCount**: 3        // Times to retry before giving up (0 = no recovery effort, -1 = never 
stops trying)

**retryAfterError**: 2000       // Wait 2 seconds after error (e.g. server error) and try again 

**retryAfterStall**: 10000      // Wait 10 seconds after stall (e.g. stream connection 'hiccup') and try again

**shoutcastFix**: 1             // Ensure the url ends with '/;' (SHOUTcast protocol) during fail recovery if stream never played this session

## Callbacks
**callbackFailed**: undefined   // Callback - when stream error and recovery failed

**callbackUrlFix**: undefined   // Stream URL that did not play was altered by software and played successfuly 

## Events
ngaudio.stopped             // Player stopped or paused by user or when finished
ngaudio.playing             // Player is playing
ngaudio.recovering          // Player is loading, buffering, or recovering

## License
Released under the [MIT license](http://www.opensource.org/licenses/MIT).
