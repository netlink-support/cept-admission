(function ($, Modernizr, webshims) {
    "use strict";
    var hasNative = Modernizr.audio && Modernizr.video;
    var supportsLoop = false;
    var bugs = webshims.bugs;
    
    var loadSwf = function () {
        webshims.ready(
            swfType, function () {
                if(!webshims.mediaelement.createSWF) {
                    webshims.mediaelement.loadSwf = true;
                    webshims.reTest([swfType], hasNative);
                }
            }
        );
    };
    var options = webshims.cfg.mediaelement;
    var swfType = options && options.player == 'jwplayer' ? 'mediaelement-swf' : 'mediaelement-jaris';
    var hasSwf;
    if(!options) {
        webshims.error("mediaelement wasn't implemented but loaded");
        return;
    }
    if(hasNative) {
        var videoElem = document.createElement('video');
        Modernizr.videoBuffered = ('buffered' in videoElem);
        supportsLoop = ('loop' in videoElem);
        
        webshims.capturingEvents(['play', 'playing', 'waiting', 'paused', 'ended', 'durationchange', 'loadedmetadata', 'canplay', 'volumechange']);
        
        if(!Modernizr.videoBuffered) {
            webshims.addPolyfill(
                'mediaelement-native-fix', {
                    f: 'mediaelement',
                    test: Modernizr.videoBuffered,
                    d: ['dom-support']
                }
            );
            
            webshims.reTest('mediaelement-native-fix');
        }
    }
    
    if(hasNative && !options.preferFlash) {
        var switchOptions = function (e) {
            var parent = e.target.parentNode;
            if(!options.preferFlash && ($(e.target).is('audio, video') || (parent && $('source:last', parent)[0] == e.target)) ) {
                webshims.ready(
                    'DOM mediaelement', function () {
                        if(hasSwf) {
                            loadSwf();
                        }
                        webshims.ready(
                            'WINDOWLOAD '+swfType, function () {
                                setTimeout(
                                    function () {
                                        if(hasSwf && !options.preferFlash && webshims.mediaelement.createSWF && !$(e.target).closest('audio, video').is('.nonnative-api-active')) {
                                            options.preferFlash = true;
                                            document.removeEventListener('error', switchOptions, true);
                                            $('audio, video').mediaLoad();
                                            webshims.info("switching mediaelements option to 'preferFlash', due to an error with native player: "+e.target.src);
                                        } else if(!hasSwf) {
                                            document.removeEventListener('error', switchOptions, true);
                                        }
                                    }, 20
                                );
                            }
                        );
                    }
                );
            }
        };
        document.addEventListener('error', switchOptions, true);
        $('audio, video').each(
            function () {
                if(this.error) {
                    switchOptions({target: this});
                }
            }
        );
    }
    
    
    if(Modernizr.track && !bugs.track) {
        (function () {
            
            if(!bugs.track) {
                bugs.track = typeof $('<track />')[0].readyState != 'number';
            }
            
            if(!bugs.track) {
                try {
                    new TextTrackCue(2, 3, '');
                } catch(e){
                    bugs.track = true;
                }
            }
            
            var trackOptions = webshims.cfg.track;
            var trackListener = function (e) {
                $(e.target).filter('track').each(changeApi);
            };
            var changeApi = function () {
                if(bugs.track || (!trackOptions.override && $.prop(this, 'readyState') == 3)) {
                    trackOptions.override = true;
                    webshims.reTest('track');
                    document.removeEventListener('error', trackListener, true);
                    if(this && $.nodeName(this, 'track')) {
                         webshims.error("track support was overwritten. Please check your vtt including your vtt mime-type");
                    } else {
                        webshims.info("track support was overwritten. due to bad browser support");
                    }
                }
            };
            var detectTrackError = function () {
                document.addEventListener('error', trackListener, true);
                
                if(bugs.track) {
                    changeApi();
                } else {
                    $('track').each(changeApi);
                }
            };
            if(!trackOptions.override) {
                if(webshims.isReady('track')) {
                      detectTrackError();
                } else {
                    $(detectTrackError);
                }
            }
        })();
        
    }

    webshims.register(
        'mediaelement-core', function ($, webshims, window, document, undefined) {
            hasSwf = swfobject.hasFlashPlayerVersion('9.0.115');
            $('html').addClass(hasSwf ? 'swf' : 'no-swf');
            var mediaelement = webshims.mediaelement;
            mediaelement.parseRtmp = function (data) {
                var src = data.src.split('://');
                var paths = src[1].split('/');
                var i, len, found;
                data.server = src[0]+'://'+paths[0]+'/';
                data.streamId = [];
                for(i = 1, len = paths.length; i < len; i++){
                    if(!found && paths[i].indexOf(':') !== -1) {
                        paths[i] = paths[i].split(':')[1];
                        found = true;
                    }
                    if(!found) {
                        data.server += paths[i]+'/';
                    } else {
                        data.streamId.push(paths[i]);
                    }
                }
                if(!data.streamId.length) {
                    webshims.error('Could not parse rtmp url');
                }
                data.streamId = data.streamId.join('/');
                console.log(data)
            };
            var getSrcObj = function (elem, nodeName) {
                elem = $(elem);
                var src = {src: elem.attr('src') || '', elem: elem, srcProp: elem.prop('src')};
                var tmp;
        
                if(!src.src) {return src;}
        
                tmp = elem.attr('data-server');
                if(tmp != null) {
                    src.server = tmp;
                }
        
                tmp = elem.attr('type');
                if(tmp) {
                    src.type = tmp;
                    src.container = $.trim(tmp.split(';')[0]);
                } else {
                    if(!nodeName) {
                          nodeName = elem[0].nodeName.toLowerCase();
                        if(nodeName == 'source') {
                            nodeName = (elem.closest('video, audio')[0] || {nodeName: 'video'}).nodeName.toLowerCase();
                        }
                    }
                    if(src.server) {
                        src.type = nodeName+'/rtmp';
                        src.container = nodeName+'/rtmp';
                    } else {
                
                        tmp = mediaelement.getTypeForSrc(src.src, nodeName, src);
                
                        if(tmp) {
                            src.type = tmp;
                            src.container = tmp;
                        }
                    }
                }
                tmp = elem.attr('media');
                if(tmp) {
                    src.media = tmp;
                }
                if(src.type == 'audio/rtmp' || src.type == 'video/rtmp') {
                    if(src.server) {
                                src.streamId = src.src;
                    } else {
                        mediaelement.parseRtmp(src);
                    }
                }
                return src;
            };
    
    
    
            var hasYt = !hasSwf && ('postMessage' in window) && hasNative;
    
            var loadTrackUi = function () {
                if(loadTrackUi.loaded) {return;}
                loadTrackUi.loaded = true;
                $(
                    function () {
                        webshims.loader.loadList(['track-ui']);
                    }
                );
            };
            var loadYt = (function () {
                var loaded;
                return function () {
                    if(loaded || !hasYt) {return;}
                    loaded = true;
                    webshims.loader.loadScript("https://www.youtube.com/player_api");
                    $(
                        function () {
                            webshims.polyfill("mediaelement-yt");
                        }
                    );
                };
            })();
            var loadThird = function () {
                if(hasSwf) {
                    loadSwf();
                } else {
                    loadYt();
                }
            };
    
            webshims.addPolyfill(
                'mediaelement-yt', {
                    test: !hasYt,
                    d: ['dom-support']
                }
            );
    
            mediaelement.mimeTypes = {
                audio: {
                    //ogm shouldn´t be used!
                    'audio/ogg': ['ogg','oga', 'ogm'],
                    'audio/ogg;codecs="opus"': 'opus',
                    'audio/mpeg': ['mp2','mp3','mpga','mpega'],
                    'audio/mp4': ['mp4','mpg4', 'm4r', 'm4a', 'm4p', 'm4b', 'aac'],
                    'audio/wav': ['wav'],
                    'audio/3gpp': ['3gp','3gpp'],
                    'audio/webm': ['webm'],
                    'audio/fla': ['flv', 'f4a', 'fla'],
                    'application/x-mpegURL': ['m3u8', 'm3u']
                },
                video: {
                    //ogm shouldn´t be used!
                    'video/ogg': ['ogg','ogv', 'ogm'],
                    'video/mpeg': ['mpg','mpeg','mpe'],
                    'video/mp4': ['mp4','mpg4', 'm4v'],
                    'video/quicktime': ['mov','qt'],
                    'video/x-msvideo': ['avi'],
                    'video/x-ms-asf': ['asf', 'asx'],
                    'video/flv': ['flv', 'f4v'],
                    'video/3gpp': ['3gp','3gpp'],
                    'video/webm': ['webm'],
                    'application/x-mpegURL': ['m3u8', 'm3u'],
                    'video/MP2T': ['ts']
                }
            }
            ;
    
            mediaelement.mimeTypes.source =  $.extend({}, mediaelement.mimeTypes.audio, mediaelement.mimeTypes.video);
    
            mediaelement.getTypeForSrc = function (src, nodeName, data) {
                if(src.indexOf('youtube.com/watch?') != -1 || src.indexOf('youtube.com/v/') != -1) {
                    return 'video/youtube';
                }
                if(src.indexOf('rtmp') === 0) {
                    return nodeName+'/rtmp';
                }
                src = src.split('?')[0].split('.');
                src = src[src.length - 1];
                var mt;
        
                $.each(
                    mediaelement.mimeTypes[nodeName], function (mimeType, exts) {
                        if(exts.indexOf(src) !== -1) {
                            mt = mimeType;
                            return false;
                        }
                    }
                );
                return mt;
            };
    
    
            mediaelement.srces = function (mediaElem, srces) {
                mediaElem = $(mediaElem);
                if(!srces) {
                    srces = [];
                    var nodeName = mediaElem[0].nodeName.toLowerCase();
                    var src = getSrcObj(mediaElem, nodeName);
            
                    if(!src.src) {
                
                            $('source', mediaElem).each(
                                function () {
                                    src = getSrcObj(this, nodeName);
                                    if(src.src) {srces.push(src);}
                                }
                            );
                    } else {
                             srces.push(src);
                    }
                    return srces;
                } else {
                    mediaElem.removeAttr('src').removeAttr('type').find('source').remove();
                    if(!$.isArray(srces)) {
                        srces = [srces]; 
                    }
                    srces.forEach(
                        function (src) {
                            var source = document.createElement('source');
                            if(typeof src == 'string') {
                                src = {src: src};
                            } 
                            source.setAttribute('src', src.src);
                            if(src.type) {
                                source.setAttribute('type', src.type);
                            }
                            if(src.media) {
                                         source.setAttribute('media', src.media);
                            }
                            mediaElem.append(source);
                        }
                    );
            
                }
            };
    
    
            $.fn.loadMediaSrc = function (srces, poster) {
                return this.each(
                    function () {
                        if(poster !== undefined) {
                                $(this).removeAttr('poster');
                            if(poster) {
                                $.attr(this, 'poster', poster);
                            }
                        }
                        mediaelement.srces(this, srces);
                        $(this).mediaLoad();
                    }
                );
            };
    
            mediaelement.swfMimeTypes = ['video/3gpp', 'video/x-msvideo', 'video/quicktime', 'video/x-m4v', 'video/mp4', 'video/m4p', 'video/x-flv', 'video/flv', 'audio/mpeg', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/mp3', 'audio/x-fla', 'audio/fla', 'youtube/flv', 'jwplayer/jwplayer', 'video/youtube', 'video/rtmp', 'audio/rtmp'];
    
            mediaelement.canThirdPlaySrces = function (mediaElem, srces) {
                var ret = '';
                if(hasSwf || hasYt) {
                    mediaElem = $(mediaElem);
                    srces = srces || mediaelement.srces(mediaElem);
                    $.each(
                        srces, function (i, src) {
                            if(src.container && src.src && ((hasSwf && mediaelement.swfMimeTypes.indexOf(src.container) != -1) || (hasYt && src.container == 'video/youtube'))) {
                                ret = src;
                                return false;
                            }
                        }
                    );
            
                }
        
                return ret;
            };
    
            var nativeCanPlayType = {};
            mediaelement.canNativePlaySrces = function (mediaElem, srces) {
                var ret = '';
                if(hasNative) {
                    mediaElem = $(mediaElem);
                    var nodeName = (mediaElem[0].nodeName || '').toLowerCase();
                    if(!nativeCanPlayType[nodeName]) {return ret;}
                    srces = srces || mediaelement.srces(mediaElem);
            
                    $.each(
                        srces, function (i, src) {
                            if(src.type && nativeCanPlayType[nodeName].prop._supvalue.call(mediaElem[0], src.type) ) {
                                ret = src;
                                return false;
                            }
                        }
                    );
                }
                return ret;
            };
    
            mediaelement.setError = function (elem, message) {
                if(!message) {
                    message = "can't play sources";
                }
        
                $(elem).pause().data('mediaerror', message);
                webshims.warn('mediaelementError: '+ message);
                setTimeout(
                    function () {
                        if($(elem).data('mediaerror')) {
                            $(elem).trigger('mediaerror');
                        }
                    }, 1
                );
            };
    
            var handleThird = (function () {
                var requested;
                return function ( mediaElem, ret, data ) {
                    if(!requested) {
                            loadTrackUi();
                    }
                    webshims.ready(
                        hasSwf ? swfType : 'mediaelement-yt', function () {
                            if(mediaelement.createSWF) {
                                 mediaelement.createSWF(mediaElem, ret, data);
                            } else if(!requested) {
                                requested = true;
                                loadThird();
                                //readd to ready
                                handleThird(mediaElem, ret, data);
                            }
                        }
                    );
                    if(!requested && hasYt && !mediaelement.createSWF) {
                            loadYt();
                    }
                };
            })();
    
            var stepSources = function (elem, data, useSwf, _srces, _noLoop) {
                var ret;
                if(useSwf || (useSwf !== false && data && data.isActive == 'third')) {
                    ret = mediaelement.canThirdPlaySrces(elem, _srces);
                    if(!ret) {
                        if(_noLoop) {
                            mediaelement.setError(elem, false);
                        } else {
                            stepSources(elem, data, false, _srces, true);
                        }
                    } else {
                        handleThird(elem, ret, data);
                    }
                } else {
                    ret = mediaelement.canNativePlaySrces(elem, _srces);
                    if(!ret) {
                        if(_noLoop) {
                            mediaelement.setError(elem, false);
                            if(data && data.isActive == 'third') {
                                   mediaelement.setActive(elem, 'html5', data);
                            }
                        } else {
                            stepSources(elem, data, true, _srces, true);
                        }
                    } else if(data && data.isActive == 'third') {
                        mediaelement.setActive(elem, 'html5', data);
                    }
                }
            };
            var stopParent = /^(?:embed|object|datalist)$/i;
            var selectSource = function (elem, data) {
                var baseData = webshims.data(elem, 'mediaelementBase') || webshims.data(elem, 'mediaelementBase', {});
                var _srces = mediaelement.srces(elem);
                var parent = elem.parentNode;
        
                clearTimeout(baseData.loadTimer);
                $.data(elem, 'mediaerror', false);
        
                if(!_srces.length || !parent || parent.nodeType != 1 || stopParent.test(parent.nodeName || '')) {return;}
                data = data || webshims.data(elem, 'mediaelement');
                stepSources(elem, data, options.preferFlash || undefined, _srces);
            };
    
    
            $(document).on(
                'ended', function (e) {
                    var data = webshims.data(e.target, 'mediaelement');
                    if(supportsLoop && (!data || data.isActive == 'html5') && !$.prop(e.target, 'loop')) {return;}
                    setTimeout(
                        function () {
                            if($.prop(e.target, 'paused') || !$.prop(e.target, 'loop') ) {return;}
                            $(e.target).prop('currentTime', 0).play();
                        }, 1
                    );
        
                }
            );
            if(!supportsLoop) {
                webshims.defineNodeNamesBooleanProperty(['audio', 'video'], 'loop');
            }
    
            ['audio', 'video'].forEach(
                function (nodeName) {
                    var supLoad = webshims.defineNodeNameProperty(
                        nodeName, 'load',  {
                            prop: {
                                value: function () {
                                    var data = webshims.data(this, 'mediaelement');
                                    selectSource(this, data);
                                    if(hasNative && (!data || data.isActive == 'html5') && supLoad.prop._supvalue) {
                                        supLoad.prop._supvalue.apply(this, arguments);
                                    }
                                }
                            }
                        }
                    );
                    nativeCanPlayType[nodeName] = webshims.defineNodeNameProperty(
                        nodeName, 'canPlayType',  {
                            prop: {
                                value: function (type) {
                                      var ret = '';
                                    if(hasNative && nativeCanPlayType[nodeName].prop._supvalue) {
                                        ret = nativeCanPlayType[nodeName].prop._supvalue.call(this, type);
                                        if(ret == 'no') {
                                            ret = '';
                                        }
                                    }
                                    if(!ret && hasSwf) {
                                        type = $.trim((type || '').split(';')[0]);
                                        if(mediaelement.swfMimeTypes.indexOf(type) != -1) {
                                            ret = 'maybe';
                                        }
                                    }
                                    return ret;
                                }
                            }
                        }
                    );
                }
            );
            webshims.onNodeNamesPropertyModify(
                ['audio', 'video'], ['src', 'poster'], {
                    set: function () {
                        var elem = this;
                        var baseData = webshims.data(elem, 'mediaelementBase') || webshims.data(elem, 'mediaelementBase', {});
                        clearTimeout(baseData.loadTimer);
                        baseData.loadTimer = setTimeout(
                            function () {
                                selectSource(elem);
                                elem = null;
                            }, 9
                        );
                    }
                }
            );
        
            var initMediaElements = function () {
        
                webshims.addReady(
                    function (context, insertedElement) {
                        var media = $('video, audio', context)
                        .add(insertedElement.filter('video, audio'))
                        .each(
                            function () {
                                if($.browser.msie && webshims.browserVersion > 8 && $.prop(this, 'paused') && !$.prop(this, 'readyState') && $(this).is('audio[preload="none"][controls]:not([autoplay])')) {
                                    $(this).prop('preload', 'metadata').mediaLoad();
                                } else {
                                            selectSource(this);
                                }
                    
                    
                    
                                if(hasNative) {
                                    var bufferTimer;
                                    var lastBuffered;
                                    var elem = this;
                                    var getBufferedString = function () {
                                        var buffered = $.prop(elem, 'buffered');
                                        if(!buffered) {return;}
                                        var bufferString = "";
                                        for(var i = 0, len = buffered.length; i < len;i++){
                                                      bufferString += buffered.end(i);
                                        }
                                        return bufferString;
                                    };
                                    var testBuffer = function () {
                                        var buffered = getBufferedString();
                                        if(buffered != lastBuffered) {
                                            lastBuffered = buffered;
                                            $(elem).triggerHandler('progress');
                                        }
                                    };
                        
                                    $(this)
                                    .on(
                                        {
                                            'play loadstart progress': function (e) {
                                                if(e.type == 'progress') {
                                                    lastBuffered = getBufferedString();
                                                }
                                                clearTimeout(bufferTimer);
                                                bufferTimer = setTimeout(testBuffer, 999);
                                            },
                                            'emptied stalled mediaerror abort suspend': function (e) {
                                                if(e.type == 'emptied') {
                                                              lastBuffered = false;
                                                }
                                                clearTimeout(bufferTimer);
                                            }
                                        }
                                    );
                                }
                    
                            }
                        );
                        if(!loadTrackUi.loaded && $('track', media).length) {
                               loadTrackUi();
                        }
                        media = null;
                    }
                );
            };
    
            if(Modernizr.track && !bugs.track) {
                webshims.defineProperty(
                    TextTrack.prototype, 'shimActiveCues', {
                        get: function () {
                            return this._shimActiveCues || this.activeCues;
                        }
                    }
                );
            }
            //set native implementation ready, before swf api is retested
            if(hasNative) {
                webshims.isReady('mediaelement-core', true);
                initMediaElements();
                webshims.ready('WINDOWLOAD mediaelement', loadThird);
            } else {
                webshims.ready(swfType, initMediaElements);
            }
            webshims.ready('WINDOWLOAD mediaelement', loadTrackUi);
        }
    );
})(jQuery, Modernizr, jQuery.webshims);
/*
 * todos: 
 * - decouple muted/volume (needs improvement)
 * - implement video <-> flashcanvas pro API
 * - improve buffered-property with youtube/rtmp
 * - use jwplayer5 api instead of old flash4 api
 */

jQuery.webshims.register(
    'mediaelement-swf', function ($, webshims, window, document, undefined, options) {
        "use strict";
        var SENDEVENT = 'sendEvent';
        var mediaelement = webshims.mediaelement;
        var swfobject = window.swfobject;
        var hasNative = Modernizr.audio && Modernizr.video;
        var hasFlash = swfobject.hasFlashPlayerVersion('9.0.115');
        var loadedSwf = 0;
        var getProps = {
            paused: true,
            ended: false,
            currentSrc: '',
            duration: window.NaN,
        
            readyState: 0,
            networkState: 0,
            videoHeight: 0,
            videoWidth: 0,
            error: null,
            buffered: {
                start: function (index) {
                    if(index) {
                        webshims.error('buffered index size error');
                        return;
                    }
                    return 0;
                },
                end: function (index) {
                    if(index) {
                        webshims.error('buffered index size error');
                        return;
                    }
                    return 0;
                },
                length: 0
            }
        };
        var getPropKeys = Object.keys(getProps);
    
        var getSetProps = {
            currentTime: 0,
            volume: 1,
            muted: false
        };
        var getSetPropKeys = Object.keys(getSetProps);
    
        var playerStateObj = $.extend(
            {
                isActive: 'html5',
                activating: 'html5',    
                wasSwfReady: false,
                _bufferedEnd: 0,
                _bufferedStart: 0,
                _metadata: false,
                _durationCalcs: -1,
                _callMeta: false,
                currentTime: 0,
                _ppFlag: undefined
            }, getProps, getSetProps
        );
    
        var idRep = /^jwplayer-/;
        var getSwfDataFromID = function (id) {
        
            var elem = document.getElementById(id.replace(idRep, ''));
            if(!elem) {return;}
            var data = webshims.data(elem, 'mediaelement');
            return data.isActive == 'third' ? data : null;
        };
    
    
        var getSwfDataFromElem = function (elem) {
            try {
                (elem.nodeName);
            } catch(er){
                return null;
            }
            var data = webshims.data(elem, 'mediaelement');
            return (data && data.isActive== 'third') ? data : null;
        };
    
        var trigger = function (elem, evt) {
            evt = $.Event(evt);
            evt.preventDefault();
            $.event.trigger(evt, undefined, elem);
        };
    
        var playerSwfPath = options.playerPath || webshims.cfg.basePath + "jwplayer/" + (options.playerName || "player.swf");
        var jwplugin = options.pluginPath || webshims.cfg.basePath +'swf/jwwebshims.swf';
    
        webshims.extendUNDEFProp(
            options.params, {
                allowscriptaccess: 'always',
                allowfullscreen: 'true',
                wmode: 'transparent'
            }
        );
        webshims.extendUNDEFProp(
            options.vars, {
                screencolor: 'ffffffff'
            }
        );
        webshims.extendUNDEFProp(
            options.attrs, {
                bgcolor: '#000000'
            }
        );
    
        var getDuration = function (data, obj) {
            var curDuration = data.duration;
            if(curDuration && data._durationCalcs > 0) {return;}
            try {
                data.duration = data.jwapi.getPlaylist()[0].duration;
                if(!data.duration || data.duration <= 0 || data.duration === data._lastDuration) {
                     data.duration = curDuration;
                }
            } catch(er){}
            if(data.duration && data.duration != data._lastDuration) {
                trigger(data._elem, 'durationchange');
                if(data._elemNodeName == 'audio' || data._callMeta) {
                    mediaelement.jwEvents.Model.META($.extend({duration: data.duration}, obj), data);
                }
                data._durationCalcs--;
            } else {
                data._durationCalcs++;
            }
        };
        var setReadyState = function (readyState, data) {
            if(readyState < 3) {
                clearTimeout(data._canplaythroughTimer);
            }
            if(readyState >= 3 && data.readyState < 3) {
                data.readyState = readyState;
                trigger(data._elem, 'canplay');
                clearTimeout(data._canplaythroughTimer);
                data._canplaythroughTimer = setTimeout(
                    function () {
                        setReadyState(4, data);
                    }, 4000
                );
            }
            if(readyState >= 4 && data.readyState < 4) {
                data.readyState = readyState;
                trigger(data._elem, 'canplaythrough');
            }
            data.readyState = readyState;
        };
    
        $.extend(
            $.event.customEvent, {
                updatemediaelementdimensions: true,
                flashblocker: true,
                swfstageresize: true,
                mediaelementapichange: true
            }
        );
    
        mediaelement.jwEvents = {
            View: {
            
                PLAY: function (obj) {
                     var data = getSwfDataFromID(obj.id);
                    if(!data || data.stopPlayPause) {return;}
                     data._ppFlag = true;
                    if(data.paused == obj.state) {
                        data.paused = !obj.state;
                        if(data.ended) {
                            data.ended = false;
                        }
                        trigger(data._elem, obj.state ? 'play' : 'pause');
                    }
                }
            },
            Model: {
            
                BUFFER: function (obj) {
                     var data = getSwfDataFromID(obj.id);
                    if(!data || !('percentage' in obj) || data._bufferedEnd == obj.percentage) {return;}
                     data.networkState = (obj.percentage == 100) ? 1 : 2;
                    if(isNaN(data.duration) || (obj.percentage > 5 && obj.percentage < 25) || (obj.percentage === 100)) {
                        getDuration(data, obj);
                    }
                
                    if(data.ended) {
                        data.ended = false;
                    }
                    if(!data.duration) {
                        return;
                    }
                    if(obj.percentage > 2 && obj.percentage < 20) {
                        setReadyState(3, data);
                    } else if(obj.percentage > 20) {
                        setReadyState(4, data);
                    }
                    if(data._bufferedEnd && (data._bufferedEnd > obj.percentage)) {
                        data._bufferedStart = data.currentTime || 0;
                    }
                
                    data._bufferedEnd = obj.percentage;
                    data.buffered.length = 1;
                    if(obj.percentage == 100) {
                        data.networkState = 1;
                        setReadyState(4, data);
                    }
                    $.event.trigger('progress', undefined, data._elem, true);
                },
                META: function (obj, data) {
                
                    data = data && data.networkState ? data : getSwfDataFromID(obj.id);

                    if(!data) {return;}
                    if(!('duration' in obj) ) {
                        data._callMeta = true;
                        return;
                    }
                
                    if(data._metadata && (!obj.height || data.videoHeight == obj.height) && (obj.duration === data.duration) ) {return;}
                
                    data._metadata = true;
                                
                    var oldDur = data.duration;
                    if(obj.duration) {
                        data.duration = obj.duration;
                    }
                    data._lastDuration = data.duration;
                    if(obj.height || obj.width) {
                        data.videoHeight = obj.height || 0;
                        data.videoWidth = obj.width || 0;
                    }
                    if(!data.networkState) {
                        data.networkState = 2;
                    }
                    if(data.readyState < 1) {
                        setReadyState(1, data);
                    }
                    if(data.duration && oldDur !== data.duration) {
                        trigger(data._elem, 'durationchange');
                    }
                
                    trigger(data._elem, 'loadedmetadata');
                },
                TIME: function (obj) {
                    var data = getSwfDataFromID(obj.id);
                    if(!data || data.currentTime === obj.position) {return;}
                    data.currentTime = obj.position;
                    if(data.duration && data.duration < data.currentTime) {
                        getDuration(data, obj);
                    }
                    if(data.readyState < 2) {
                        setReadyState(2, data);
                    }
                    if(data.ended) {
                        data.ended = false;
                    }
                    trigger(data._elem, 'timeupdate');
                
                },
                STATE: function (obj) {
                    var data = getSwfDataFromID(obj.id);
                    if(!data) {return;}
                    switch(obj.newstate) {
                    case 'BUFFERING':
                        
                        if(data.ended) {
                                   data.ended = false;
                        }
                        setReadyState(1, data);
                        trigger(data._elem, 'waiting');
                    break;
                    case 'PLAYING':
                        data.paused = false;
                        data._ppFlag = true;
                        if(!data.duration) {
                            getDuration(data, obj);
                        }
                        if(data.readyState < 3) {
                            setReadyState(3, data);
                        }
                        if(data.ended) {
                               data.ended = false;
                        }
                        trigger(data._elem, 'playing');
                 break;
                    case 'PAUSED':
                        if(!data.paused && !data.stopPlayPause) {
                            data.paused = true;
                            data._ppFlag = true;
                            trigger(data._elem, 'pause');
                        }
                    break;
                    case 'COMPLETED':
                        if(data.readyState < 4) {
                            setReadyState(4, data);
                        }
                        data.ended = true;
                        trigger(data._elem, 'ended');
                 break;
                    }
                }
            }
            ,Controller: {
            
                ERROR: function (obj) {
                     var data = getSwfDataFromID(obj.id);
                    if(!data) {return;}
                     mediaelement.setError(data._elem, obj.message);
                },
                SEEK: function (obj) {
                    var data = getSwfDataFromID(obj.id);
                    if(!data) {return;}
                    if(data.ended) {
                        data.ended = false;
                    }
                    if(data.paused) {
                        try {
                            data.jwapi[SENDEVENT]('play', 'false');
                        } catch(er){}
                    }
                    if(data.currentTime != obj.position) {
                        data.currentTime = obj.position;
                        trigger(data._elem, 'timeupdate');
                    }
                
                
                },
                VOLUME: function (obj) {
                    var data = getSwfDataFromID(obj.id);
                    if(!data) {return;}
                    var newVolume = obj.percentage / 100;
                    if(data.volume == newVolume) {return;}
                    data.volume = newVolume;
                    trigger(data._elem, 'volumechange');
                },
                MUTE: function (obj) {
                    if(obj.state) {return;}
                    var data = getSwfDataFromID(obj.id);
                    if(!data) {return;}
                    if(data.muted == obj.state) {return;}
                    data.muted = obj.state;
                    trigger(data._elem, 'volumechange');
                }
            }
        };
    
        var initEvents = function (data) {
            var passed = true;
            $.each(
                mediaelement.jwEvents, function (mvcName, evts) {
                    $.each(
                        evts, function (evtName) {
                            try {
                                data.jwapi['add'+ mvcName +'Listener'](evtName, 'jQuery.webshims.mediaelement.jwEvents.'+ mvcName +'.'+ evtName);
                            } catch(er){
                                passed = false;
                                return false;
                            }
                        }
                    );
                }
            );
            return passed;
        };
    
        var workActionQueue = function (data) {
            var actionLen = data.actionQueue.length;
            var i = 0;
            var operation;
            if(actionLen && data.isActive == 'third') {
                while(data.actionQueue.length && actionLen > i){
                     i++;
                     operation = data.actionQueue.shift();
                     data.jwapi[operation.fn].apply(data.jwapi, operation.args);
                }
            }
            if(data.actionQueue.length) {
                data.actionQueue = [];
            }
        };
        var startAutoPlay = function (data) {
            if(!data) {return;}
            if((data._ppFlag === undefined && ($.prop(data._elem, 'autoplay')) || !data.paused)) {
                setTimeout(
                    function () {
                        if(data.isActive == 'third' && (data._ppFlag === undefined || !data.paused)) {
                            try {
                                 $(data._elem).play();
                            } catch(er){}
                        }
                    }, 1
                );
            }
        };
    
    
        mediaelement.playerResize = function (id) {
            if(!id) {return;}
            var elem = document.getElementById(id.replace(idRep, ''));
        
            if(elem) {
                $(elem).triggerHandler('swfstageresize');
            }
            elem = null;
        };
    
    
        $(document).on(
            'emptied', function (e) {
                var data = getSwfDataFromElem(e.target);
                startAutoPlay(data);
            }
        );
    
        var localConnectionTimer;
        mediaelement.jwPlayerReady = function (jwData) {
            var data = getSwfDataFromID(jwData.id);
            var passed = true;
            var i = 0;
            var doneFn = function () {
                if(i > 9) {return;}
                i++;
                if(initEvents(data)) {
                    if(!data.wasSwfReady) {
                         var version = parseFloat(jwData.version, 10);
                        if(version < 5.1 || version >= 6) {
                            webshims.warn('mediaelement-swf is only testet with jwplayer 5.6+');
                        }
                    } else {
                        $(data._elem).mediaLoad();
                    
                    }
                    data.wasSwfReady = true;
                    data.tryedReframeing = 0;
                    workActionQueue(data);
                    startAutoPlay(data);
                } else {
                    clearTimeout(data.reframeTimer);
                    data.reframeTimer = setTimeout(doneFn, 9 * i);
                    if(i > 2 && data.tryedReframeing < 9) {
                        data.tryedReframeing++;
                        data.shadowElem.css({overflow: 'visible'});
                        setTimeout(
                            function () {
                                  data.shadowElem.css({overflow: 'hidden'});
                            }, 16
                        );
                    }
                }
            };
            if(!data || !data.jwapi) {return;}
            if(!data.tryedReframeing) {
                data.tryedReframeing = 0;
            }
            clearTimeout(localConnectionTimer);
            data.jwData = jwData;
            data.shadowElem.removeClass('flashblocker-assumed');
            $.prop(data._elem, 'volume', data.volume);
            $.prop(data._elem, 'muted', data.muted);
            doneFn();
        
        };
    
        var addMediaToStopEvents = $.noop;
        if(hasNative) {
            var stopEvents = {
                play: 1,
                playing: 1
            };
            var hideEvtArray = ['play', 'pause', 'playing', 'canplay', 'progress', 'waiting', 'ended', 'loadedmetadata', 'durationchange', 'emptied'];
            var hidevents = hideEvtArray.map(
                function (evt) {
                    return evt +'.webshimspolyfill';
                }
            ).join(' ');
        
            var hidePlayerEvents = function (event) {
                var data = webshims.data(event.target, 'mediaelement');
                if(!data) {return;}
                var isNativeHTML5 = ( event.originalEvent && event.originalEvent.type === event.type );
                if(isNativeHTML5 == (data.activating == 'third') ) {
                    event.stopImmediatePropagation();
                    if(stopEvents[event.type] && data.isActive != data.activating) {
                          $(event.target).pause();
                    }
                }
            };
        
            addMediaToStopEvents = function (elem) {
                $(elem)
                .off(hidevents)
                .on(hidevents, hidePlayerEvents);
                hideEvtArray.forEach(
                    function (evt) {
                        webshims.moveToFirstEvent(elem, evt);
                    }
                );
            };
            addMediaToStopEvents(document);
        }
    
    
        mediaelement.setActive = function (elem, type, data) {
            if(!data) {
                data = webshims.data(elem, 'mediaelement');
            }
            if(!data || data.isActive == type) {return;}
            if(type != 'html5' && type != 'third') {
                webshims.warn('wrong type for mediaelement activating: '+ type);
            }
            var shadowData = webshims.data(elem, 'shadowData');
            data.activating = type;
            $(elem).pause();
            data.isActive = type;
            if(type == 'third') {
                shadowData.shadowElement = shadowData.shadowFocusElement = data.shadowElem[0];
                $(elem).addClass('swf-api-active nonnative-api-active').hide().getShadowElement().show();
            } else {
                $(elem).removeClass('swf-api-active nonnative-api-active').show().getShadowElement().hide();
                shadowData.shadowElement = shadowData.shadowFocusElement = false;
            }
            $(elem).trigger('mediaelementapichange');
        };
    
    
    
        var resetSwfProps = (function () {
            var resetProtoProps = ['_bufferedEnd', '_bufferedStart', '_metadata', '_ppFlag', 'currentSrc', 'currentTime', 'duration', 'ended', 'networkState', 'paused', 'videoHeight', 'videoWidth', '_callMeta', '_durationCalcs'];
            var len = resetProtoProps.length;
            return function (data) {
            
                if(!data) {return;}
                var lenI = len;
                var networkState = data.networkState;
                setReadyState(0, data);
                while(--lenI){
                    delete data[resetProtoProps[lenI]];
                }
                data.actionQueue = [];
                data.buffered.length = 0;
                if(networkState) {
                    trigger(data._elem, 'emptied');
                }
            };
        })();
    
        var setElementDimension = function (data, hasControls) {
            var elem = data._elem;
            var box = data.shadowElem;
            $(elem)[hasControls ? 'addClass' : 'removeClass']('webshims-controls');
            if(data._elemNodeName == 'audio' && !hasControls) {
                box.css({width: 0, height: 0});
            } else {
                box.css(
                    {
                        width: elem.style.width || $(elem).width(),
                        height: elem.style.height || $(elem).height()
                    }
                );
            }
        };
    
        mediaelement.createSWF = function ( elem, canPlaySrc, data ) {
            if(!hasFlash) {
                setTimeout(
                    function () {
                        $(elem).mediaLoad(); //<- this should produce a mediaerror
                    }, 1
                );
                return;
            }
        
            if(loadedSwf < 1) {
                loadedSwf = 1;
            } else {
                loadedSwf++;
            }
            var vars = $.extend(
                {}, options.vars, {
                    image: $.prop(elem, 'poster') || '',
                    file: canPlaySrc.streamId || canPlaySrc.srcProp
                }
            );
            var elemVars = $(elem).data('vars') || {};
        
            if(canPlaySrc.server) {
                vars.streamer = canPlaySrc.server;
            }
            if(!data) {
                data = webshims.data(elem, 'mediaelement');
            }
        
            if(data && data.swfCreated) {
                mediaelement.setActive(elem, 'third', data);
                resetSwfProps(data);
                data.currentSrc = canPlaySrc.srcProp;
                $.extend(vars, elemVars);
                options.changeSWF(vars, elem, canPlaySrc, data, 'load');
                queueSwfMethod(elem, SENDEVENT, ['LOAD', vars]);
                return;
            }
        
        
            var hasControls = $.prop(elem, 'controls');
            var elemId = 'jwplayer-'+ webshims.getID(elem);
            var params = $.extend(
                {},
                options.params,
                $(elem).data('params')
            );
            var elemNodeName = elem.nodeName.toLowerCase();
            var attrs = $.extend(
                {},
                options.attrs,
                {
                    name: elemId,
                    id: elemId
                },
                $(elem).data('attrs')
            );
            var box = $('<div class="polyfill-'+ (elemNodeName) +' polyfill-mediaelement" id="wrapper-'+ elemId +'"><div id="'+ elemId +'"></div>')
            .css(
                {
                    position: 'relative',
                    overflow: 'hidden'
                }
            );
            data = webshims.data(
                elem, 'mediaelement', webshims.objectCreate(
                    playerStateObj, {
                        actionQueue: {
                            value: []
                        },
                        shadowElem: {
                            value: box
                        },
                        _elemNodeName: {
                            value: elemNodeName
                        },
                        _elem: {
                            value: elem
                        },
                        currentSrc: {
                            value: canPlaySrc.srcProp
                        },
                        swfCreated: {
                            value: true
                        },
                        buffered: {
                            value: {
                                start: function (index) {
                                    if(index >= data.buffered.length) {
                                        webshims.error('buffered index size error');
                                        return;
                                    }
                                    return 0;
                                },
                                end: function (index) {
                                    if(index >= data.buffered.length) {
                                           webshims.error('buffered index size error');
                                           return;
                                    }
                                    return ( (data.duration - data._bufferedStart) * data._bufferedEnd / 100) + data._bufferedStart;
                                },
                                length: 0
                            }
                        }
                    }
                )
            );
        
            setElementDimension(data, hasControls);
        
            box.insertBefore(elem);
        
            if(hasNative) {
                $.extend(data, {volume: $.prop(elem, 'volume'), muted: $.prop(elem, 'muted')});
            }
        
            $.extend(
                vars, 
                {
                    id: elemId,
                    controlbar: hasControls ? options.vars.controlbar || (elemNodeName == 'video' ? 'over' : 'bottom') : (elemNodeName == 'video') ? 'none' : 'bottom',
                    icons: ''+ (hasControls && elemNodeName == 'video')
                },
                elemVars,
                {playerready: 'jQuery.webshims.mediaelement.jwPlayerReady'}
            );
            if(vars.plugins) {
                vars.plugins += ','+jwplugin;
            } else {
                vars.plugins = jwplugin;
            }
        
        
            webshims.addShadowDom(elem, box);
        
            addMediaToStopEvents(elem);
        
            mediaelement.setActive(elem, 'third', data);
        
            options.changeSWF(vars, elem, canPlaySrc, data, 'embed');
        
            $(elem).on(
                'updatemediaelementdimensions updateshadowdom', function () {
                    setElementDimension(data, $.prop(elem, 'controls'));
                }
            );
        
        
            swfobject.embedSWF(
                playerSwfPath, elemId, "100%", "100%", "9.0.0", false, vars, params, attrs, function (swfData) {
            
                    if(swfData.success) {
                          data.jwapi = swfData.ref;
                
                        if(!hasControls) {
                            $(swfData.ref).attr('tabindex', '-1').css('outline', 'none');
                        }
                        setTimeout(
                            function () {
                                if((!swfData.ref.parentNode && box[0].parentNode) || swfData.ref.style.display == "none") {
                                    box.addClass('flashblocker-assumed');
                                    $(elem).trigger('flashblocker');
                                    webshims.warn("flashblocker assumed");
                                }
                                $(swfData.ref).css({'minHeight': '2px', 'minWidth': '2px', display: 'block'});
                            }, 9
                        );
                        if(!localConnectionTimer) {
                               clearTimeout(localConnectionTimer);
                            localConnectionTimer = setTimeout(
                                function () {
                                    var flash = $(swfData.ref);
                                    if(flash[0].offsetWidth > 1 && flash[0].offsetHeight > 1 && location.protocol.indexOf('file:') === 0) {
                                                 webshims.error("Add your local development-directory to the local-trusted security sandbox:  http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html");
                                    } else if(flash[0].offsetWidth < 2 || flash[0].offsetHeight < 2) {
                                             webshims.warn("JS-SWF connection can't be established on hidden or unconnected flash objects");
                                    }
                                    flash = null;
                                }, 8000
                            );
                        }
                    }
                }
            );
        };
    
    
        var queueSwfMethod = function (elem, fn, args, data) {
            data = data || getSwfDataFromElem(elem);
            if(data) {
                if(data.jwapi && data.jwapi[fn]) {
                     data.jwapi[fn].apply(data.jwapi, args || []);
                } else {
                    //todo add to queue
                    data.actionQueue.push({fn: fn, args: args});
                    if(data.actionQueue.length > 10) {
                        setTimeout(
                            function () {
                                if(data.actionQueue.length > 5) {
                                    data.actionQueue.shift();
                                }
                            }, 99
                        );
                    }
                }
                return data;
            }
            return false;
        };
    
        ['audio', 'video'].forEach(
            function (nodeName) {
                var descs = {};
                var mediaSup;
                var createGetProp = function (key) {
                    if(nodeName == 'audio' && (key == 'videoHeight' || key == 'videoWidth')) {return;}
            
                    descs[key] = {
                        get: function () {
                                 var data = getSwfDataFromElem(this);
                            if(data) {
                                return data[key];
                            } else if(hasNative && mediaSup[key].prop._supget) {
                                return mediaSup[key].prop._supget.apply(this);
                            } else {
                                return playerStateObj[key];
                            }
                        },
                        writeable: false
                    };
                };
                var createGetSetProp = function (key, setFn) {
                    createGetProp(key);
                    delete descs[key].writeable;
                    descs[key].set = setFn;
                };
        
                createGetSetProp(
                    'volume', function (v) {
                        var data = getSwfDataFromElem(this);
                        if(data) {
                            v *= 100;
                            if(!isNaN(v)) {
                                var muted = data.muted;
                                if(v < 0 || v > 100) {
                                    webshims.error('volume greater or less than allowed '+ (v / 100));
                                }
                    
                                queueSwfMethod(this, SENDEVENT, ['VOLUME', v], data);
                                if(muted) {
                                    try {
                                        data.jwapi.sendEvent('mute', 'true');
                                    } catch(er){}
                                }
                                v /= 100;
                                if(data.volume == v || data.isActive != 'third') {return;}
                                data.volume = v;
                                trigger(data._elem, 'volumechange');
                                data = null;
                            } 
                        } else if(mediaSup.volume.prop._supset) {
                            return mediaSup.volume.prop._supset.apply(this, arguments);
                        }
                    }
                );
        
                createGetSetProp(
                    'muted', function (m) {
                        var data = getSwfDataFromElem(this);
                        if(data) {
                            m = !!m;
                            queueSwfMethod(this, SENDEVENT, ['mute', ''+m], data);
                            if(data.muted == m || data.isActive != 'third') {return;}
                            data.muted = m;
                            trigger(data._elem, 'volumechange');
                            data = null;
                        } else if(mediaSup.muted.prop._supset) {
                            return mediaSup.muted.prop._supset.apply(this, arguments);
                        }
                    }
                );
        
        
                createGetSetProp(
                    'currentTime', function (t) {
                        var data = getSwfDataFromElem(this);
                        if(data) {
                            t *= 1;
                            if (!isNaN(t)) {
                                if(data.paused) {
                                    clearTimeout(data.stopPlayPause);
                                    data.stopPlayPause = setTimeout(
                                        function () {
                                                          data.paused = true;
                                                          data.stopPlayPause = false;
                                        }, 50
                                    );
                                }
                                 queueSwfMethod(this, SENDEVENT, ['SEEK', '' + t], data);
                    
                                if(data.paused) {
                                    if(data.readyState > 0) {
                                        data.currentTime = t;
                                        trigger(data._elem, 'timeupdate');
                                    }
                                    try {
                                           data.jwapi[SENDEVENT]('play', 'false');
                                    } catch(er){}
                        
                                }
                            }
                 
                        } else if(mediaSup.currentTime.prop._supset) {
                            return mediaSup.currentTime.prop._supset.apply(this, arguments);
                        }
                    }
                );
        
                ['play', 'pause'].forEach(
                    function (fn) {
                        descs[fn] = {
                            value: function () {
                                  var data = getSwfDataFromElem(this);
                                if(data) {
                                    if(data.stopPlayPause) {
                                         clearTimeout(data.stopPlayPause);
                                    }
                                    queueSwfMethod(this, SENDEVENT, ['play', fn == 'play'], data);
                                    setTimeout(
                                        function () {
                                            if(data.isActive == 'third') {
                                                data._ppFlag = true;
                                                if(data.paused != (fn != 'play')) {
                                                       data.paused = fn != 'play';
                                                       trigger(data._elem, fn);
                                                }
                                            }
                                        }, 1
                                    );
                                } else if(mediaSup[fn].prop._supvalue) {
                                    return mediaSup[fn].prop._supvalue.apply(this, arguments);
                                }
                            }
                        };
                    }
                );
        
                getPropKeys.forEach(createGetProp);
        
                webshims.onNodeNamesPropertyModify(
                    nodeName, 'controls', function (val, boolProp) {
                        var data = getSwfDataFromElem(this);
                        $(this)[boolProp ? 'addClass' : 'removeClass']('webshims-controls');
            
                        if(data) {
                            try {
                                  queueSwfMethod(this, boolProp ? 'showControls' : 'hideControls', [nodeName], data);
                            } catch(er){
                                       webshims.warn("you need to generate a crossdomain.xml");
                            }
                            if(nodeName == 'audio') {
                                  setElementDimension(data, boolProp);
                            }
                            $(data.jwapi).attr('tabindex', boolProp ? '0' : '-1');
                        }
                    }
                );
        
                mediaSup = webshims.defineNodeNameProperties(nodeName, descs, 'prop');
            }
        );
    
        if(hasFlash) {
            var oldClean = $.cleanData;
            var gcBrowser = $.browser.msie && webshims.browserVersion < 9;
            var flashNames = {
                object: 1,
                OBJECT: 1
            };
            $.cleanData = function (elems) {
                var i, len, prop;
                if(elems && (len = elems.length) && loadedSwf) {
                
                    for(i = 0; i < len; i++){
                        if(flashNames[elems[i].nodeName]) {
                            if(SENDEVENT in elems[i]) {
                                          loadedSwf--;
                                try {
                                    elems[i][SENDEVENT]('play', false);
                                } catch(er){}
                            }
                            if(gcBrowser) {
                                try {
                                    for (prop in elems[i]) {
                                        if (typeof elems[i][prop] == "function") {
                                            elems[i][prop] = null;
                                        }
                                    }
                                } catch(er){}
                            }
                        }
                    }
                
                }
                return oldClean.apply(this, arguments);
            };
        }

        if(!hasNative) {
        
            ['poster', 'src'].forEach(
                function (prop) {
                    webshims.defineNodeNamesProperty(
                        prop == 'src' ? ['audio', 'video', 'source'] : ['video'], prop, {
                            //attr: {},
                            reflect: true,
                            propType: 'src'
                        }
                    );
                }
            );
        
        
            ['autoplay', 'controls'].forEach(
                function (name) {
                     webshims.defineNodeNamesBooleanProperty(['audio', 'video'], name);
                }
            );
            
            webshims.defineNodeNamesProperties(
                ['audio', 'video'], {
                    HAVE_CURRENT_DATA: {
                        value: 2
                    },
                    HAVE_ENOUGH_DATA: {
                        value: 4
                    },
                    HAVE_FUTURE_DATA: {
                        value: 3
                    },
                    HAVE_METADATA: {
                        value: 1
                    },
                    HAVE_NOTHING: {
                        value: 0
                    },
                    NETWORK_EMPTY: {
                        value: 0
                    },
                    NETWORK_IDLE: {
                        value: 1
                    },
                    NETWORK_LOADING: {
                        value: 2
                    },
                    NETWORK_NO_SOURCE: {
                        value: 3
                    }
                    
                }, 'prop'
            );
        }
    }
);