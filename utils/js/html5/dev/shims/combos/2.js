//additional tests for partial implementation of forms features
(function ($) {
    "use strict";
    var Modernizr = window.Modernizr;
    var webshims = $.webshims;
    var bugs = webshims.bugs;
    var form = $('<form action="#" style="width: 1px; height: 1px; overflow: hidden;"><select name="b" required="" /><input required="" name="a" /></form>');
    var testRequiredFind = function () {
        if(form[0].querySelector) {
            try {
                bugs.findRequired = !(form[0].querySelector('select:required'));
            } catch(er){
                bugs.findRequired = false;
            }
        }
    };
    var inputElem = $('input', form).eq(0);
    var onDomextend = function (fn) {
        webshims.loader.loadList(['dom-extend']);
        webshims.ready('dom-extend', fn);
    };
    
    bugs.findRequired = false;
    bugs.validationMessage = false;
    
    webshims.capturingEventPrevented = function (e) {
        if(!e._isPolyfilled) {
            var isDefaultPrevented = e.isDefaultPrevented;
            var preventDefault = e.preventDefault;
            e.preventDefault = function () {
                clearTimeout($.data(e.target, e.type + 'DefaultPrevented'));
                $.data(
                    e.target, e.type + 'DefaultPrevented', setTimeout(
                        function () {
                                $.removeData(e.target, e.type + 'DefaultPrevented');
                        }, 30
                    )
                );
                return preventDefault.apply(this, arguments);
            };
            e.isDefaultPrevented = function () {
                return !!(isDefaultPrevented.apply(this, arguments) || $.data(e.target, e.type + 'DefaultPrevented') || false);
            };
            e._isPolyfilled = true;
        }
    };
    
    if(!Modernizr.formvalidation || bugs.bustedValidity) {
        testRequiredFind();
        return;
    }
    
    //create delegatable events
    webshims.capturingEvents(['input']);
    webshims.capturingEvents(['invalid'], true);
    
    if(window.opera || window.testGoodWithFix) {
        
        form.appendTo('head');
        
        testRequiredFind();
        bugs.validationMessage = !(inputElem.prop('validationMessage'));
        
        webshims.reTest(['form-native-extend', 'form-message']);
        
        form.remove();
            
        $(
            function () {
                onDomextend(
                    function () {
                
                        //Opera shows native validation bubbles in case of input.checkValidity()
                        // Opera 11.6/12 hasn't fixed this issue right, it's buggy
                        var preventDefault = function (e) {
                            e.preventDefault();
                        };
                
                        ['form', 'input', 'textarea', 'select'].forEach(
                            function (name) {
                                var desc = webshims.defineNodeNameProperty(
                                    name, 'checkValidity', {
                                        prop: {
                                            value: function () {
                                                if (!webshims.fromSubmit) {
                                                    $(this).on('invalid.checkvalidity', preventDefault);
                                                }
                                
                                                webshims.fromCheckValidity = true;
                                                var ret = desc.prop._supvalue.apply(this, arguments);
                                                if (!webshims.fromSubmit) {
                                                    $(this).unbind('invalid.checkvalidity', preventDefault);
                                                }
                                                webshims.fromCheckValidity = false;
                                                return ret;
                                            }
                                        }
                                    }
                                );
                            }
                        );
                
                    }
                );
            }
        );
    }
    
    if($.browser.webkit && !webshims.bugs.bustedValidity) {
        (function () {
            var elems = /^(?:textarea|input)$/i;
            var form = false;

            document.addEventListener(
                'contextmenu', function (e) {
                    if(elems.test(e.target.nodeName || '') && (form = e.target.form)) {
                        setTimeout(
                            function () {
                                form = false;
                            }, 1
                        );
                    }
                }, false
            );
            
            $(window).on(
                'invalid', function (e) {
                    if(e.originalEvent && form && form == e.target.form) {
                           e.wrongWebkitInvalid = true;
                           e.stopImmediatePropagation();
                    }
                }
            );
        })();
    }
})(jQuery);

jQuery.webshims.register(
    'form-core', function ($, webshims, window, document, undefined, options) {
        "use strict";
    
        var groupTypes = {radio: 1};
        var checkTypes = {checkbox: 1, radio: 1};
        var emptyJ = $([]);
        var bugs = webshims.bugs;
        var getGroupElements = function (elem) {
            elem = $(elem);
            var name;
            var form;
            var ret = emptyJ;
            if(groupTypes[elem[0].type]) {
                form = elem.prop('form');
                name = elem[0].name;
                if(!name) {
                     ret = elem;
                } else if(form) {
                    ret = $(form[name]);
                } else {
                    ret = $(document.getElementsByName(name)).filter(
                        function () {
                            return !$.prop(this, 'form');
                        }
                    );
                }
                ret = ret.filter('[type="radio"]');
            }
            return ret;
        };
    
        var getContentValidationMessage = webshims.getContentValidationMessage = function (elem, validity, key) {
            var message = $(elem).data('errormessage') || elem.getAttribute('x-moz-errormessage') || '';
            if(key && message[key]) {
                message = message[key];
            }
            if(typeof message == 'object') {
                validity = validity || $.prop(elem, 'validity') || {valid: 1};
                if(!validity.valid) {
                    $.each(
                        validity, function (name, prop) {
                            if(prop && name != 'valid' && message[name]) {
                                message = message[name];
                                return false;
                            }
                        }
                    );
                }
            }
        
            if(typeof message == 'object') {
                message = message.defaultMessage;
            }
            return message || '';
        };
    
        /*
        * Selectors for all browsers
        */
        var rangeTypes = {number: 1, range: 1, date: 1/*, time: 1, 'datetime-local': 1, datetime: 1, month: 1, week: 1*/};
        var hasInvalid = function (elem) {
            var ret = false;
            $($.prop(elem, 'elements')).each(
                function () {
                    ret = $(this).is(':invalid');
                    if(ret) {
                          return false;
                    }
                }
            );
            return ret;
        };
        $.extend(
            $.expr[":"], {
                "valid-element": function (elem) {
                    return $.nodeName(elem, 'form') ? !hasInvalid(elem) :!!($.prop(elem, 'willValidate') && isValid(elem));
                },
                "invalid-element": function (elem) {
                    return $.nodeName(elem, 'form') ? hasInvalid(elem) : !!($.prop(elem, 'willValidate') && !isValid(elem));
                },
                "required-element": function (elem) {
                    return !!($.prop(elem, 'willValidate') && $.prop(elem, 'required'));
                },
                "user-error": function (elem) {
                    return ($.prop(elem, 'willValidate') && $(elem).hasClass('user-error'));
                },
                "optional-element": function (elem) {
                    return !!($.prop(elem, 'willValidate') && $.prop(elem, 'required') === false);
                },
                "in-range": function (elem) {
                    if(!rangeTypes[$.prop(elem, 'type')] || !$.prop(elem, 'willValidate')) {
                        return false;
                    }
                    var val = $.prop(elem, 'validity');
                    return !!(val && !val.rangeOverflow && !val.rangeUnderflow);
                },
                "out-of-range": function (elem) {
                    if(!rangeTypes[$.prop(elem, 'type')] || !$.prop(elem, 'willValidate')) {
                        return false;
                    }
                    var val = $.prop(elem, 'validity');
                    return !!(val && (val.rangeOverflow || val.rangeUnderflow));
                }
        
            }
        );
    
        ['valid', 'invalid', 'required', 'optional'].forEach(
            function (name) {
                $.expr[":"][name] = $.expr.filters[name+"-element"];
            }
        );
    
    
        $.expr[":"].focus = function ( elem ) {
            try {
                var doc = elem.ownerDocument;
                return elem === doc.activeElement && (!doc.hasFocus || doc.hasFocus());
            } catch(e){}
            return false;
        };
    
        var customEvents = $.event.customEvent || {};
        var isValid = function (elem) {
            return ($.prop(elem, 'validity') || {valid: 1}).valid;
        };
    
        if (bugs.bustedValidity || bugs.findRequired) {
            (function () {
                var find = $.find;
                var matchesSelector = $.find.matchesSelector;
            
                var regExp = /(\:valid|\:invalid|\:optional|\:required|\:in-range|\:out-of-range)(?=[\s\[\~\.\+\>\:\#*]|$)/ig;
                var regFn = function (sel) {
                    return sel + '-element';
                };
            
                $.find = (function () {
                    var slice = Array.prototype.slice;
                    var fn = function (sel) {
                        var ar = arguments;
                        ar = slice.call(ar, 1, ar.length);
                        ar.unshift(sel.replace(regExp, regFn));
                        return find.apply(this, ar);
                    };
                    for (var i in find) {
                        if(find.hasOwnProperty(i)) {
                            fn[i] = find[i];
                        }
                    }
                    return fn;
                })();
                if(!Modernizr.prefixed || Modernizr.prefixed("matchesSelector", document.documentElement)) {
                    $.find.matchesSelector = function (node, expr) {
                         expr = expr.replace(regExp, regFn);
                         return matchesSelector.call(this, node, expr);
                    };
                }
            
            })();
        }
    
        //ToDo needs testing
        var oldAttr = $.prop;
        var changeVals = {selectedIndex: 1, value: 1, checked: 1, disabled: 1, readonly: 1};
        $.prop = function (elem, name, val) {
            var ret = oldAttr.apply(this, arguments);
            if(elem && 'form' in elem && changeVals[name] && val !== undefined && $(elem).hasClass(invalidClass)) {
                if(isValid(elem)) {
                     $(elem).getShadowElement().removeClass(invalidClasses);
                    if(name == 'checked' && val) {
                        getGroupElements(elem).not(elem).removeClass(invalidClasses).removeAttr('aria-invalid');
                    }
                }
            }
            return ret;
        };
    
        var returnValidityCause = function (validity, elem) {
            var ret;
            $.each(
                validity, function (name, value) {
                    if(value) {
                          ret = (name == 'customError') ? $.prop(elem, 'validationMessage') : name;
                          return false;
                    }
                }
            );
            return ret;
        };
    
        var isInGroup = function (name) {
            var ret;
            try {
                ret = document.activeElement.name === name;
            } catch(e){}
            return ret;
        };
        /* form-ui-invalid/form-ui-valid are deprecated. use user-error/user-succes instead */
        var invalidClass = 'user-error';
        var invalidClasses = 'user-error form-ui-invalid';
        var validClass = 'user-success';
        var validClasses = 'user-success form-ui-valid';
        var switchValidityClass = function (e) {
            var elem, timer;
            if(!e.target) {return;}
            elem = $(e.target).getNativeElement()[0];
            if(elem.type == 'submit' || !$.prop(elem, 'willValidate')) {return;}
            timer = $.data(elem, 'webshimsswitchvalidityclass');
            var switchClass = function () {
                if(e.type == 'focusout' && elem.type == 'radio' && isInGroup(elem.name)) {return;}
                var validity = $.prop(elem, 'validity');
                var shadowElem = $(elem).getShadowElement();
                var addClass, removeClass, trigger, generaltrigger, validityCause;
            
                $(elem).trigger('refreshCustomValidityRules');
                if(validity.valid) {
                    if(!shadowElem.hasClass(validClass)) {
                         addClass = validClasses;
                         removeClass = invalidClasses;
                         generaltrigger = 'changedvaliditystate';
                         trigger = 'changedvalid';
                        if(checkTypes[elem.type] && elem.checked) {
                            getGroupElements(elem).not(elem).removeClass(removeClass).addClass(addClass).removeAttr('aria-invalid');
                        }
                        $.removeData(elem, 'webshimsinvalidcause');
                    }
                } else {
                    validityCause = returnValidityCause(validity, elem);
                    if($.data(elem, 'webshimsinvalidcause') != validityCause) {
                        $.data(elem, 'webshimsinvalidcause', validityCause);
                        generaltrigger = 'changedvaliditystate';
                    }
                    if(!shadowElem.hasClass(invalidClass)) {
                        addClass = invalidClasses;
                        removeClass = validClasses;
                        if (checkTypes[elem.type] && !elem.checked) {
                            getGroupElements(elem).not(elem).removeClass(removeClass).addClass(addClass);
                        }
                        trigger = 'changedinvalid';
                    }
                }
                if(addClass) {
                    shadowElem.addClass(addClass).removeClass(removeClass);
                    //jQuery 1.6.1 IE9 bug (doubble trigger bug)
                    setTimeout(
                        function () {
                            $(elem).trigger(trigger);
                        }, 0
                    );
                }
                if(generaltrigger) {
                    setTimeout(
                        function () {
                            $(elem).trigger(generaltrigger);
                        }, 0
                    );
                }
                $.removeData(e.target, 'webshimsswitchvalidityclass');
            };
        
            if(timer) {
                clearTimeout(timer);
            }
            if(e.type == 'refreshvalidityui') {
                switchClass();
            } else {
                $.data(elem, 'webshimsswitchvalidityclass', setTimeout(switchClass, 9));
            }
        };
    
        $(document).on(options.validityUIEvents || 'focusout change refreshvalidityui', switchValidityClass);
        customEvents.changedvaliditystate = true;
        customEvents.refreshCustomValidityRules = true;
        customEvents.changedvalid = true;
        customEvents.changedinvalid = true;
        customEvents.refreshvalidityui = true;
    
    
        webshims.triggerInlineForm = function (elem, event) {
            $(elem).trigger(event);
        };
    
        webshims.modules["form-core"].getGroupElements = getGroupElements;
    
    
        var setRoot = function () {
            webshims.scrollRoot = ($.browser.webkit || document.compatMode == 'BackCompat') ?
            $(document.body) : 
            $(document.documentElement);
        };
        setRoot();
        webshims.ready('DOM', setRoot);
    
        webshims.getRelOffset = function (posElem, relElem) {
            posElem = $(posElem);
            var offset = $(relElem).offset();
            var bodyOffset;
            $.swap(
                $(posElem)[0], {visibility: 'hidden', display: 'inline-block', left: 0, top: 0}, function () {
                    bodyOffset = posElem.offset();
                }
            );
            offset.top -= bodyOffset.top;
            offset.left -= bodyOffset.left;
            return offset;
        };
    
        /* some extra validation UI */
        webshims.validityAlert = (function () {
            var alertElem = (!$.browser.msie || parseInt($.browser.version, 10) > 7) ? 'span' : 'label';
            var errorBubble;
            var hideTimer = false;
            var focusTimer = false;
            var resizeTimer = false;
            var boundHide;
        
            var api = {
                hideDelay: 5000,
            
                showFor: function (elem, message, noFocusElem, noBubble) {
                     api._create();
                     elem = $(elem);
                     var visual = $(elem).getShadowElement();
                     var offset = api.getOffsetFromBody(visual);
                     api.clear();
                    if(noBubble) {
                        this.hide();
                    } else {
                        this.getMessage(elem, message);
                        this.position(visual, offset);
                    
                        this.show();
                        if(this.hideDelay) {
                            hideTimer = setTimeout(boundHide, this.hideDelay);
                        }
                        $(window)
                        .on(
                            'resize.validityalert', function () {
                                clearTimeout(resizeTimer);
                                resizeTimer = setTimeout(
                                    function () {
                                        api.position(visual);
                                    }, 9
                                );
                            }
                        );
                    }
                
                    if(!noFocusElem) {
                        this.setFocus(visual, offset);
                    }
                },
                getOffsetFromBody: function (elem) {
                    return webshims.getRelOffset(errorBubble, elem);
                },
                setFocus: function (visual, offset) {
                    var focusElem = $(visual).getShadowFocusElement();
                    var scrollTop = webshims.scrollRoot.scrollTop();
                    var elemTop = ((offset || focusElem.offset()).top) - 30;
                    var smooth;
                
                    if(webshims.getID && alertElem == 'label') {
                        errorBubble.attr('for', webshims.getID(focusElem));
                    }
                
                    if(scrollTop > elemTop) {
                        webshims.scrollRoot.animate(
                            {scrollTop: elemTop - 5}, 
                            {
                                queue: false, 
                                duration: Math.max(Math.min(600, (scrollTop - elemTop) * 1.5), 80)
                            }
                        );
                        smooth = true;
                    }
                    try {
                        focusElem[0].focus();
                    } catch(e){}
                    if(smooth) {
                        webshims.scrollRoot.scrollTop(scrollTop);
                        setTimeout(
                            function () {
                                webshims.scrollRoot.scrollTop(scrollTop);
                            }, 0
                        );
                    }
                    setTimeout(
                        function () {
                            $(document).on('focusout.validityalert', boundHide);
                        }, 10
                    );
                },
                getMessage: function (elem, message) {
                    if (!message) {
                        message = getContentValidationMessage(elem[0]) || elem.prop('validationMessage');
                    }
                    if (message) {
                        $('span.va-box', errorBubble).text(message);
                    }
                    else {
                        this.hide();
                    }
                },
                position: function (elem, offset) {
                    offset = offset ? $.extend({}, offset) : api.getOffsetFromBody(elem);
                    offset.top += elem.outerHeight();
                    errorBubble.css(offset);
                },
                show: function () {
                    if(errorBubble.css('display') === 'none') {
                        errorBubble.css({opacity: 0}).show();
                    }
                    errorBubble.addClass('va-visible').fadeTo(400, 1);
                },
                hide: function () {
                    errorBubble.removeClass('va-visible').fadeOut();
                },
                clear: function () {
                    clearTimeout(focusTimer);
                    clearTimeout(hideTimer);
                    $(document).unbind('.validityalert');
                    $(window).unbind('.validityalert');
                    errorBubble.stop().removeAttr('for');
                },
                _create: function () {
                    if(errorBubble) {return;}
                    errorBubble = api.errorBubble = $('<'+alertElem+' class="validity-alert-wrapper" role="alert"><span  class="validity-alert"><span class="va-arrow"><span class="va-arrow-box"></span></span><span class="va-box"></span></span></'+alertElem+'>').css({position: 'absolute', display: 'none'});
                    webshims.ready(
                        'DOM', function () {
                            errorBubble.appendTo('body');
                            if($.fn.bgIframe && $.browser.msie && parseInt($.browser.version, 10) < 7) {
                                errorBubble.bgIframe();
                            }
                        }
                    );
                }
            };
        
        
            boundHide = $.proxy(api, 'hide');
        
            return api;
        })();
    
    
        /* extension, but also used to fix native implementation workaround/bugfixes */
        (function () {
            var firstEvent,
            invalids = [],
            stopSubmitTimer,
            form
            ;
        
            $(document).on(
                'invalid', function (e) {
                    if(e.wrongWebkitInvalid) {return;}
                    var jElm = $(e.target);
                    var shadowElem = jElm.getShadowElement();
                    if(!shadowElem.hasClass(invalidClass)) {
                          shadowElem.addClass(invalidClasses).removeClass(validClasses);
                        setTimeout(
                            function () {
                                $(e.target).trigger('changedinvalid').trigger('changedvaliditystate');
                            }, 0
                        );
                    }
            
                    if(!firstEvent) {
                         //trigger firstinvalid
                         firstEvent = $.Event('firstinvalid');
                         firstEvent.isInvalidUIPrevented = e.isDefaultPrevented;
                         var firstSystemInvalid = $.Event('firstinvalidsystem');
                         $(document).triggerHandler(firstSystemInvalid, {element: e.target, form: e.target.form, isInvalidUIPrevented: e.isDefaultPrevented});
                         jElm.trigger(firstEvent);
                    }

                    //if firstinvalid was prevented all invalids will be also prevented
                    if(firstEvent && firstEvent.isDefaultPrevented() ) {
                          e.preventDefault();
                    }
                    invalids.push(e.target);
                    e.extraData = 'fix'; 
                    clearTimeout(stopSubmitTimer);
                    stopSubmitTimer = setTimeout(
                        function () {
                              var lastEvent = {type: 'lastinvalid', cancelable: false, invalidlist: $(invalids)};
                              //reset firstinvalid
                              firstEvent = false;
                              invalids = [];
                              $(e.target).trigger(lastEvent, lastEvent);
                        }, 9
                    );
                    jElm = null;
                    shadowElem = null;
                }
            );
        })();
    
        $.fn.getErrorMessage = function () {
            var message = '';
            var elem = this[0];
            if(elem) {
                message = getContentValidationMessage(elem) || $.prop(elem, 'customValidationMessage') || $.prop(elem, 'validationMessage');
            }
            return message;
        };
    
        if(options.replaceValidationUI) {
            webshims.ready(
                'DOM forms', function () {
                    $(document).on(
                        'firstinvalid', function (e) {
                            if(!e.isInvalidUIPrevented()) {
                                e.preventDefault();
                                $.webshims.validityAlert.showFor(e.target, $(e.target).prop('customValidationMessage')); 
                            }
                        }
                    );
                }
            );
        }
    
    }
);
if(!Modernizr.formvalidation || jQuery.webshims.bugs.bustedValidity) {
    jQuery.webshims.register(
        'form-shim-extend', function ($, webshims, window, document) {
            "use strict";
            webshims.inputTypes = webshims.inputTypes || {};
            //some helper-functions
            var cfg = webshims.cfg.forms;
            var isSubmit;

            var isNumber = function (string) {
                return (typeof string == 'number' || (string && string == string * 1));
            },
            typeModels = webshims.inputTypes,
            checkTypes = {
                radio: 1,
                checkbox: 1
            },
            getType = function (elem) {
                return (elem.getAttribute('type') || elem.type || '').toLowerCase();
            }
            ;

            //API to add new input types
            webshims.addInputType = function (type, obj) {
                typeModels[type] = obj;
            };

            //contsrain-validation-api
            var validityPrototype = {
                customError: false,

                typeMismatch: false,
                rangeUnderflow: false,
                rangeOverflow: false,
                stepMismatch: false,
                tooLong: false,
                patternMismatch: false,
                valueMissing: false,
    
                valid: true
            };

            var isPlaceholderOptionSelected = function (select) {
                if(select.type == 'select-one' && select.size < 2) {
                    var option = $('> option:first-child', select);
                    return !!option.prop('selected');
                } 
                return false;
            };

            var validityRules = {
                valueMissing: function (input, val, cache) {
                    if(!input.prop('required')) {return false;}
                    var ret = false;
                    if(!('type' in cache)) {
                            cache.type = getType(input[0]);
                    }
                    if(cache.nodeName == 'select') {
                             ret = (!val && (input[0].selectedIndex < 0 || isPlaceholderOptionSelected(input[0]) ));
                    } else if(checkTypes[cache.type]) {
                          ret = (cache.type == 'checkbox') ? !input.is(':checked') : !webshims.modules["form-core"].getGroupElements(input).filter(':checked')[0];
                    } else {
                        ret = !(val);
                    }
                    return ret;
                },
                tooLong: function () {
                    return false;
                },
                typeMismatch: function (input, val, cache) {
                    if(val === '' || cache.nodeName == 'select') {return false;}
                    var ret = false;
                    if(!('type' in cache)) {
                         cache.type = getType(input[0]);
                    }
            
                    if(typeModels[cache.type] && typeModels[cache.type].mismatch) {
                        ret = typeModels[cache.type].mismatch(val, input);
                    } else if('validity' in input[0]) {
                        ret = input[0].validity.typeMismatch;
                    }
                    return ret;
                },
                patternMismatch: function (input, val, cache) {
                    if(val === '' || cache.nodeName == 'select') {return false;}
                    var pattern = input.attr('pattern');
                    if(!pattern) {return false;}
                    try {
                         pattern = new RegExp('^(?:' + pattern + ')$');
                    } catch(er){
                        webshims.error('invalid pattern value: "'+ pattern +'" | '+ er);
                        pattern = false;
                    }
                    if(!pattern) {return false;}
                    return !(pattern.test(val));
                }
            }
            ;

            webshims.addValidityRule = function (type, fn) {
                validityRules[type] = fn;
            };

            $.event.special.invalid = {
                add: function () {
                    $.event.special.invalid.setup.call(this.form || this);
                },
                setup: function () {
                    var form = this.form || this;
                    if($.data(form, 'invalidEventShim') ) {
                        form = null;
                        return;
                    }
                    $(form)
                    .data('invalidEventShim', true)
                    .on('submit', $.event.special.invalid.handler);
                    webshims.moveToFirstEvent(form, 'submit');
                    if(webshims.bugs.bustedValidity && $.nodeName(form, 'form')) {
                        (function () {
                            var noValidate = form.getAttribute('novalidate');
                            form.setAttribute('novalidate', 'novalidate');
                            webshims.data(form, 'bustedNoValidate', (noValidate == null) ? null : noValidate);
                        })();
                    }
                    form = null;
                },
                teardown: $.noop,
                handler: function (e, d) {
        
                    if(e.type != 'submit' || e.testedValidity || !e.originalEvent || !$.nodeName(e.target, 'form') || $.prop(e.target, 'noValidate') ) {return;}
        
                    isSubmit = true;
                    e.testedValidity = true;
                    var notValid = !($(e.target).checkValidity());
                    if(notValid) {
                        e.stopImmediatePropagation();
                        isSubmit = false;
                        return false;
                    }
                    isSubmit = false;
                }
            };

            var addSubmitBubbles = function (form) {
                if (!$.support.submitBubbles && form && typeof form == 'object' && !form._submit_attached ) {
                
                    $.event.add(
                        form, 'submit._submit', function ( event ) {
                            event._submit_bubble = true;
                        }
                    );
        
                    form._submit_attached = true;
                }
            };
            if(!$.support.submitBubbles && $.event.special.submit) {
                $.event.special.submit.setup = function () {
                    // Only need this for delegated form submit events
                    if ($.nodeName(this, "form") ) {
                           return false;
                    }

                    // Lazy-add a submit handler when a descendant form may potentially be submitted
                    $.event.add(
                        this, "click._submit keypress._submit", function ( e ) {
                            // Node name check avoids a VML-related crash in IE (#9807)
                            var elem = e.target,
                            form = $.nodeName(elem, 'input') || $.nodeName(elem, 'button') ? $.prop(elem, 'form') : undefined;
                            addSubmitBubbles(form);
            
                        }
                    );
                    // return undefined since we don't need an event listener
                };
            }

            $.event.special.submit = $.event.special.submit || {setup: function () {
                return false;}};
            var submitSetup = $.event.special.submit.setup;
            $.extend(
                $.event.special.submit, {
                    setup: function () {
                        if($.nodeName(this, 'form')) {
                                 $(this).on('invalid', $.noop);
                        } else {
                            $('form', this).on('invalid', $.noop);
                        }
                        return submitSetup.apply(this, arguments);
                    }
                }
            );

            $(window).on('invalid', $.noop);


            webshims.addInputType(
                'email', {
                    mismatch: (function () {
                        //taken from http://www.whatwg.org/specs/web-apps/current-work/multipage/states-of-the-type-attribute.html#valid-e-mail-address
                        var test = cfg.emailReg || /^[a-zA-Z0-9.!#$%&'*+-\/=?\^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
                        return function (val) {
                                 return !test.test(val);
                        };
                    })()
                }
            );

            webshims.addInputType(
                'url', {
                    mismatch: (function () {
                        //taken from scott gonzales
                        var test = cfg.urlReg || /^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
                        return function (val) {
                                 return !test.test(val);
                        };
                    })()
                }
            );

            webshims.defineNodeNameProperty(
                'input', 'type', {
                    prop: {
                        get: function () {
                                 var elem = this;
                                 var type = (elem.getAttribute('type') || '').toLowerCase();
                                 return (webshims.inputTypes[type]) ? type : elem.type;
                        }
                    }
                }
            );

            // IDLs for constrain validation API
            //ToDo: add object to this list
            webshims.defineNodeNamesProperties(
                ['button', 'fieldset', 'output'], {
                    checkValidity: {
                        value: function () {
                            return true;}
                    },
                    willValidate: {
                        value: false
                    },
                    setCustomValidity: {
                        value: $.noop
                    },
                    validity: {
                        writeable: false,
                        get: function () {
                                 return $.extend({}, validityPrototype);
                        }
                    }
                }, 'prop'
            );

            var baseCheckValidity = function (elem) {
                var e,
                v = $.prop(elem, 'validity');
                if(v) {
                    $.data(elem, 'cachedValidity', v);
                } else {
                    return true;
                }
                if(!v.valid ) {
                    e = $.Event('invalid');
                    var jElm = $(elem).trigger(e);
                    if(isSubmit && !baseCheckValidity.unhandledInvalids && !e.isDefaultPrevented()) {
                        webshims.validityAlert.showFor(jElm);
                        baseCheckValidity.unhandledInvalids = true;
                    }
                }
                $.removeData(elem, 'cachedValidity');
                return v.valid;
            };
            var rsubmittable = /^(?:select|textarea|input)/i;
            webshims.defineNodeNameProperty(
                'form', 'checkValidity', {
                    prop: {
                        value: function () {
            
                                 var ret = true,
                            elems = $($.prop(this, 'elements')).filter(
                                function () {
                                    if(!rsubmittable.test(this.nodeName)) {return false;}
                                    var shadowData = webshims.data(this, 'shadowData');
                                    return !shadowData || !shadowData.nativeElement || shadowData.nativeElement === this;
                                }
                            );
            
                                 baseCheckValidity.unhandledInvalids = false;
                            for(var i = 0, len = elems.length; i < len; i++){
                                if(!baseCheckValidity(elems[i]) ) {
                                      ret = false;
                                }
                            }
                            return ret;
                        }
                    }
                }
            );

            webshims.defineNodeNamesProperties(
                ['input', 'textarea', 'select'], {
                    checkValidity: {
                        value: function () {
                                 baseCheckValidity.unhandledInvalids = false;
                                 return baseCheckValidity($(this).getNativeElement()[0]);
                        }
                    },
                    setCustomValidity: {
                        value: function (error) {
                                 $.removeData(this, 'cachedValidity');
                                 webshims.data(this, 'customvalidationMessage', ''+error);
                        }
                    },
                    willValidate: {
                        writeable: false,
                        get: (function () {
                                 var types = {
                                        button: 1,
                                        reset: 1,
                                        hidden: 1,
                                        image: 1
                            }
                                 ;
                                 return function () {
                                    var elem = $(this).getNativeElement()[0];
                                    //elem.name && <- we don't use to make it easier for developers
                                    return !!(!elem.disabled && !elem.readOnly && !types[elem.type] );
                                 };
                        })()
                    },
                    validity: {
                        writeable: false,
                        get: function () {
                                 var jElm = $(this).getNativeElement();
                                 var elem = jElm[0];
                                 var validityState = $.data(elem, 'cachedValidity');
                            if(validityState) {
                                return validityState;
                            }
                            validityState     = $.extend({}, validityPrototype);
            
                            if(!$.prop(elem, 'willValidate') || elem.type == 'submit' ) {
                                return validityState;
                            }
                            var val                = jElm.val(),
                            cache             = {nodeName: elem.nodeName.toLowerCase()}
                            ;
            
                            validityState.customError = !!(webshims.data(elem, 'customvalidationMessage'));
                            if(validityState.customError ) {
                                validityState.valid = false;
                            }
                            
                            $.each(
                                validityRules, function (rule, fn) {
                                    if (fn(jElm, val, cache)) {
                                        validityState[rule] = true;
                                        validityState.valid = false;
                                    }
                                }
                            );
                                 $(this).getShadowFocusElement().attr('aria-invalid',  validityState.valid ? 'false' : 'true');
                                 jElm = null;
                                 elem = null;
                                 return validityState;
                        }
                    }
                }, 'prop'
            );

            webshims.defineNodeNamesBooleanProperty(
                ['input', 'textarea', 'select'], 'required', {
                    set: function (value) {
                        $(this).getShadowFocusElement().attr('aria-required', !!(value)+'');
                    },
                    initAttr: (!$.browser.msie || webshims.browserVersion > 7)//only if we have aria-support
                }
            );

            webshims.reflectProperties(['input'], ['pattern']);


            if(!('maxLength' in document.createElement('textarea')) ) {
                var constrainMaxLength = (function () {
                    var timer;
                    var curLength = 0;
                    var lastElement = $([]);
                    var max = 1e9;
                    var constrainLength = function () {
                        var nowValue = lastElement.prop('value');
                        var nowLen = nowValue.length;
                        if(nowLen > curLength && nowLen > max) {
                                     nowLen = Math.max(curLength, max);
                                     lastElement.prop('value', nowValue.substr(0, nowLen));
                        }
                        curLength = nowLen;
                    };
                    var remove = function () {
                        clearTimeout(timer);
                        lastElement.unbind('.maxlengthconstraint');
                    };
                    return function (element, maxLength) {
                        remove();
                        if(maxLength > -1) {
                            max = maxLength;
                            curLength = $.prop(element, 'value').length;
                            lastElement = $(element);
                            lastElement.on(
                                {
                                    'keydown.maxlengthconstraint keypress.maxlengthconstraint paste.maxlengthconstraint cut.maxlengthconstraint': function (e) {
                                        setTimeout(constrainLength, 0);
                                    },
                                    'keyup.maxlengthconstraint': constrainLength,
                                    'blur.maxlengthconstraint': remove
                                }
                            );
                            timer = setInterval(constrainLength, 200);
                        }
                    };
                })();
    
                constrainMaxLength.update = function (element, maxLength) {
                    if($(element).is(':focus')) {
                        if(!maxLength) {
                                maxLength = $.prop(element, 'maxlength');
                        }
                        constrainMaxLength(element, maxLength);
                    }
                };
    
                $(document).on(
                    'focusin', function (e) {
                        var maxLength;
                        if(e.target.nodeName == "TEXTAREA" && (maxLength = $.prop(e.target, 'maxlength')) > -1) {
                            constrainMaxLength(e.target, maxLength);
                        }
                    }
                );
    
                webshims.defineNodeNameProperty(
                    'textarea', 'maxlength', {
                        attr: {
                            set: function (val) {
                                this.setAttribute('maxlength', ''+val);
                                constrainMaxLength.update(this);
                            },
                            get: function () {
                                var ret = this.getAttribute('maxlength');
                                return ret == null ? undefined : ret;
                            }
                        },
                        prop: {
                            set: function (val) {
                                if(isNumber(val)) {
                                    if(val < 0) {
                                        throw('INDEX_SIZE_ERR');
                                    }
                                    val = parseInt(val, 10);
                                    this.setAttribute('maxlength', val);
                                    constrainMaxLength.update(this, val);
                                    return;
                                }
                                this.setAttribute('maxlength', '0');
                                constrainMaxLength.update(this, 0);
                            },
                            get: function () {
                                var val = this.getAttribute('maxlength');
                                return (isNumber(val) && val >= 0) ? parseInt(val, 10) : -1; 
                
                            }
                        }
                    }
                );
                webshims.defineNodeNameProperty(
                    'textarea', 'maxLength', {
                        prop: {
                            set: function (val) {
                                $.prop(this, 'maxlength', val);
                            },
                            get: function () {
                                return $.prop(this, 'maxlength');
                            }
                        }
                    }
                );
            } 



            var submitterTypes = {submit: 1, button: 1, image: 1};
            var formSubmitterDescriptors = {};
            [
            {
                name: "enctype",
                limitedTo: {
                    "application/x-www-form-urlencoded": 1,
                    "multipart/form-data": 1,
                    "text/plain": 1
                },
                defaultProp: "application/x-www-form-urlencoded",
                proptype: "enum"
            },
            {
                name: "method",
                limitedTo: {
                    "get": 1,
                    "post": 1
                },
                defaultProp: "get",
                proptype: "enum"
            },
            {
                name: "action",
                proptype: "url"
            },
            {
                name: "target"
            },
            {
                name: "novalidate",
                propName: "noValidate",
                proptype: "boolean"
            }
            ].forEach(
                function (desc) {
                    var propName = 'form'+ (desc.propName || desc.name).replace(
                        /^[a-z]/, function (f) {
                            return f.toUpperCase();
                        }
                    );
                    var attrName = 'form'+ desc.name;
                    var formName = desc.name;
                    var eventName = 'click.webshimssubmittermutate'+formName;
    
                    var changeSubmitter = function () {
                          var elem = this;
                        if(!('form' in elem) || !submitterTypes[elem.type] ) {return;}
                          var form = $.prop(elem, 'form');
                        if(!form) {return;}
                          var attr = $.attr(elem, attrName);
                        if(attr != null && ( !desc.limitedTo || attr.toLowerCase() === $.prop(elem, propName))) {
            
                            var oldAttr = $.attr(form, formName);
            
                            $.attr(form, formName, attr);
                            setTimeout(
                                function () {
                                    if(oldAttr != null) {
                                        $.attr(form, formName, oldAttr);
                                    } else {
                                        try {
                                            $(form).removeAttr(formName);
                                        } catch(er){
                                            form.removeAttribute(formName);
                                        }
                                    }
                                }, 9
                            );
                        }
                    };
    
    

                    switch(desc.proptype) {
                    case "url":
                        var urlForm = document.createElement('form');
                        formSubmitterDescriptors[propName] = {
                            prop: {
                                set: function (value) {
                                        $.attr(this, attrName, value);
                                },
                                get: function () {
                                       var value = $.attr(this, attrName);
                                    if(value == null) {return '';}
                                       urlForm.setAttribute('action', value);
                                       return urlForm.action;
                                }
                            }
                        };
                       break;
                    case "boolean":
                        formSubmitterDescriptors[propName] = {
                            prop: {
                                set: function (val) {
                                    val = !!val;
                                    if(val) {
                                        $.attr(this, 'formnovalidate', 'formnovalidate');
                                    } else {
                                        $(this).removeAttr('formnovalidate');
                                    }
                                },
                                get: function () {
                                    return $.attr(this, 'formnovalidate') != null;
                                }
                            }
                        };
                       break;
                    case "enum":
                        formSubmitterDescriptors[propName] = {
                            prop: {
                                set: function (value) {
                                    $.attr(this, attrName, value);
                                },
                                get: function () {
                                    var value = $.attr(this, attrName);
                                    return (!value || ( (value = value.toLowerCase()) && !desc.limitedTo[value] )) ? desc.defaultProp : value;
                                }
                            }
                        };
                      break;
                    default:
                        formSubmitterDescriptors[propName] = {
                            prop: {
                                set: function (value) {
                                    $.attr(this, attrName, value);
                                },
                                get: function () {
                                    var value = $.attr(this, attrName);
                                    return (value != null) ? value : "";
                                }
                            }
                        };
                    }


                    if(!formSubmitterDescriptors[attrName]) {
                        formSubmitterDescriptors[attrName] = {};
                    }
                    formSubmitterDescriptors[attrName].attr = {
                        set: function (value) {
                            formSubmitterDescriptors[attrName].attr._supset.call(this, value);
                            $(this).unbind(eventName).on(eventName, changeSubmitter);
                        },
                        get: function () {
                            return formSubmitterDescriptors[attrName].attr._supget.call(this);
                        }
                    };
                    formSubmitterDescriptors[attrName].initAttr = true;
                    formSubmitterDescriptors[attrName].removeAttr = {
                        value: function () {
                               $(this).unbind(eventName);
                               formSubmitterDescriptors[attrName].removeAttr._supvalue.call(this);
                        }
                    };
                }
            );

            webshims.defineNodeNamesProperties(['input', 'button'], formSubmitterDescriptors);


            if(!$.support.getSetAttribute && $('<form novalidate></form>').attr('novalidate') == null) {
                webshims.defineNodeNameProperty(
                    'form', 'novalidate', {
                        attr: {
                            set: function (val) {
                                     this.setAttribute('novalidate', ''+val);
                            },
                            get: function () {
                                     var ret = this.getAttribute('novalidate');
                                     return ret == null ? undefined : ret;
                            }
                        }
                    }
                );
            } else if(webshims.bugs.bustedValidity) {
    
                webshims.defineNodeNameProperty(
                    'form', 'novalidate', {
                        attr: {
                            set: function (val) {
                                webshims.data(this, 'bustedNoValidate', ''+val);
                            },
                            get: function () {
                                var ret = webshims.data(this, 'bustedNoValidate');
                                return ret == null ? undefined : ret;
                            }
                        },
                        removeAttr: {
                            value: function () {
                                webshims.data(this, 'bustedNoValidate', null);
                            }
                        }
                    }
                );
    
                $.each(
                    ['rangeUnderflow', 'rangeOverflow', 'stepMismatch'], function (i, name) {
                        validityRules[name] = function (elem) {
                               return (elem[0].validity || {})[name] || false;
                        };
                    }
                );
    
            }

            webshims.defineNodeNameProperty(
                'form', 'noValidate', {
                    prop: {
                        set: function (val) {
                                 val = !!val;
                            if(val) {
                                $.attr(this, 'novalidate', 'novalidate');
                            } else {
                                $(this).removeAttr('novalidate');
                            }
                        },
                        get: function () {
                            return $.attr(this, 'novalidate') != null;
                        }
                    }
                }
            );

            if($.browser.webkit && Modernizr.inputtypes.date) {
                (function () {
        
                    var noInputTriggerEvts = {updateInput: 1, input: 1},
                    fixInputTypes = {
                        date: 1,
                        time: 1,
                        "datetime-local": 1
                    },
                    noFocusEvents = {
                        focusout: 1,
                        blur: 1
                    },
                    changeEvts = {
                        updateInput: 1,
                        change: 1
                    },
                    observe = function (input) {
                        var timer,
                        focusedin = true,
                        lastInputVal = input.prop('value'),
                        lastChangeVal = lastInputVal,
                        trigger = function (e) {
                             //input === null
                            if(!input) {return;}
                             var newVal = input.prop('value');
                        
                            if(newVal !== lastInputVal) {
                                lastInputVal = newVal;
                                if(!e || !noInputTriggerEvts[e.type]) {
                                     input.trigger('input');
                                }
                            }
                            if(e && changeEvts[e.type]) {
                                lastChangeVal = newVal;
                            }
                            if(!focusedin && newVal !== lastChangeVal) {
                                input.trigger('change');
                            }
                        },
                        extraTimer,
                        extraTest = function () {
                             clearTimeout(extraTimer);
                             extraTimer = setTimeout(trigger, 9);
                        },
                        unbind = function (e) {
                             clearInterval(timer);
                            setTimeout(
                                function () {
                                    if(e && noFocusEvents[e.type]) {
                                              focusedin = false;
                                    }
                                    if(input) {
                                               input.unbind('focusout blur', unbind).unbind('input change updateInput', trigger);
                                               trigger();
                                    }
                                    input = null;
                                }, 1
                            );
                        
                        }
                        ;
                
                        clearInterval(timer);
                        timer = setInterval(trigger, 160);
                        extraTest();
                        input
                        .off(
                            {
                                'focusout blur': unbind,
                                'input change updateInput': trigger
                            }
                        )
                        .on(
                            {
                                'focusout blur': unbind,
                                'input updateInput change': trigger
                            }
                        );
                    }
                    ;
                    if($.event.customEvent) {
                        $.event.customEvent.updateInput = true;
                    }
        
                    (function () {
            
                        var correctValue = function (elem) {
                              var i = 1;
                              var len = 3;
                              var abort, val;
                            if(elem.type == 'date' && (isSubmit || !$(elem).is(':focus'))) {
                                val = elem.value;
                                if(val && val.length < 10 && (val = val.split('-')) && val.length == len) {
                                    for(; i < len; i++){
                                        if(val[i].length == 1) {
                                            val[i] = '0'+val[i];
                                        } else if(val[i].length != 2) {
                                            abort = true;
                                            break;
                                        }
                                    }
                                    if(!abort) {
                                        val = val.join('-');
                                        $.prop(elem, 'value', val);
                                        return val;
                                    }
                                }
                            }
                        };
                        var inputCheckValidityDesc, formCheckValidityDesc, inputValueDesc, inputValidityDesc;
            
                        inputCheckValidityDesc = webshims.defineNodeNameProperty(
                            'input', 'checkValidity', {
                                prop: {
                                    value: function () {
                                        correctValue(this);
                                        return inputCheckValidityDesc.prop._supvalue.apply(this, arguments);
                                    }
                                }
                            }
                        );
            
                        formCheckValidityDesc = webshims.defineNodeNameProperty(
                            'form', 'checkValidity', {
                                prop: {
                                    value: function () {
                                        $('input', this).each(
                                            function () {
                                                correctValue(this);
                                            }
                                        );
                                        return formCheckValidityDesc.prop._supvalue.apply(this, arguments);
                                    }
                                }
                            }
                        );
            
                        inputValueDesc = webshims.defineNodeNameProperty(
                            'input', 'value', {
                                prop: {
                                    set: function () {
                                        return inputValueDesc.prop._supset.apply(this, arguments);
                                    },
                                    get: function () {
                                        return correctValue(this) || inputValueDesc.prop._supget.apply(this, arguments);
                                    }
                                }
                            }
                        );
            
                        inputValidityDesc = webshims.defineNodeNameProperty(
                            'input', 'validity', {
                                prop: {
                                    writeable: false,
                                    get: function () {
                                        correctValue(this);
                                        return inputValidityDesc.prop._supget.apply(this, arguments);
                                    }
                                }
                            }
                        );
            
                        $(document).on(
                            'change', function (e) {
                                  correctValue(e.target);
                            }
                        );
            
                    })();
        
                    $(document)
                    .on(
                        'focusin', function (e) {
                            if(e.target && fixInputTypes[e.target.type] && !e.target.readOnly && !e.target.disabled ) {
                                   observe($(e.target));
                            }
                        }
                    );
        
        
                })();
            }

            webshims.addReady(
                function (context, contextElem) {
                    //start constrain-validation
                    var focusElem;
                    $('form', context)
                    .add(contextElem.filter('form'))
                    .bind('invalid', $.noop);
    
                    try {
                        if(context == document && !('form' in(document.activeElement || {}))) {
                               focusElem = $('input[autofocus], select[autofocus], textarea[autofocus]', context).eq(0).getShadowFocusElement()[0];
                            if (focusElem && focusElem.offsetHeight && focusElem.offsetWidth) {
                                focusElem.focus();
                            }
                        }
                    } 
                    catch (er) {}
    
                }
            );

            if(!Modernizr.formattribute || !Modernizr.fieldsetdisabled) {
                (function () {
                    (function (prop, undefined) {
                        $.prop = function (elem, name, value) {
                                     var ret;
                            if(elem && elem.nodeType == 1 && value === undefined && $.nodeName(elem, 'form') && elem.id) {
                                ret = document.getElementsByName(name);
                                if(!ret || !ret.length) {
                                       ret = document.getElementById(name);
                                }
                                if(ret) {
                                    ret = $(ret).filter(
                                        function () {
                                            return $.prop(this, 'form') == elem;
                                        }
                                    ).get();
                                    if(ret.length) {
                                        return ret.length == 1 ? ret[0] : ret;
                                    }
                                }
                            }
                            return prop.apply(this, arguments);
                        };
                    })($.prop, undefined);
                    var removeAddedElements = function (form) {
                        var elements = $.data(form, 'webshimsAddedElements');
                        if(elements) {
                                     elements.remove();
                                     $.removeData(form, 'webshimsAddedElements');
                        }
                    };
                    var rCRLF = /\r?\n/g,
                    rinput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,
                    rselectTextarea = /^(?:select|textarea)/i;
        
                    if(!Modernizr.formattribute) {
                        webshims.defineNodeNamesProperty(
                            ['input', 'textarea', 'select', 'button', 'fieldset'], 'form', {
                                prop: {
                                    get: function () {
                                            var form = webshims.contentAttr(this, 'form');
                                        if(form) {
                                            form = document.getElementById(form);
                                            if(form && !$.nodeName(form, 'form')) {
                                                  form = null;
                                            }
                                        } 
                                        return form || this.form;
                                    },
                                    writeable: false
                                }
                            }
                        );
            
            
                        webshims.defineNodeNamesProperty(
                            ['form'], 'elements', {
                                prop: {
                                    get: function () {
                                        var id = this.id;
                                        var elements = $.makeArray(this.elements);
                                        if(id) {
                                            elements = $(elements).add('input[form="'+ id +'"], select[form="'+ id +'"], textarea[form="'+ id +'"], button[form="'+ id +'"], fieldset[form="'+ id +'"]').not('.webshims-visual-hide > *').get();
                                        }
                                        return elements;
                                    },
                                    writeable: false
                                }
                            }
                        );
            
            
            
                        $(
                            function () {
                                   var stopPropagation = function (e) {
                                    e.stopPropagation();
                                   };
                                $(document).on(
                                    'submit', function (e) {
                    
                                        if(!e.isDefaultPrevented()) {
                                            var form = e.target;
                                            var id = form.id;
                                            var elements;
                        
                        
                                            if(id) {
                                                 removeAddedElements(form);
                            
                                                 elements = $('input[form="'+ id +'"], select[form="'+ id +'"], textarea[form="'+ id +'"]')
                                                .filter(
                                                    function () {
                                                        return !this.disabled && this.name && this.form != form;
                                                    }
                                                )
                                                  .clone();
                                                if(elements.length) {
                                                    $.data(form, 'webshimsAddedElements', $('<div class="webshims-visual-hide" />').append(elements).appendTo(form));
                                                    setTimeout(
                                                        function () {
                                                            removeAddedElements(form);
                                                        }, 9
                                                    );
                                                }
                                                elements = null;
                                            }
                                        }
                                    }
                                );
                
                                                $(document).on(
                                                    'click', function (e) {
                                                        if(!e.isDefaultPrevented() && $(e.target).is('input[type="submit"][form], button[form], input[type="button"][form], input[type="image"][form], input[type="reset"][form]')) {
                                                            var trueForm = $.prop(e.target, 'form');
                                                            var formIn = e.target.form;
                                                            var clone;
                                                            if(trueForm && trueForm != formIn) {
                                                                 clone = $(e.target)
                                                                  .clone()
                                                                  .removeAttr('form')
                                                                  .addClass('webshims-visual-hide')
                                                                  .on('click', stopPropagation)
                                                                  .appendTo(trueForm);
                                                                if(formIn) {
                                                                    e.preventDefault();
                                                                }
                                                                addSubmitBubbles(trueForm);
                                                                clone.trigger('click');
                                                                setTimeout(
                                                                    function () {
                                                                        clone.remove();
                                                                        clone = null;
                                                                    }, 9
                                                                );
                                                            }
                                                        }
                                                    }
                                                );
                            }
                        );
                    }
        
                    if(!Modernizr.fieldsetdisabled) {
                        webshims.defineNodeNamesProperty(
                            ['fieldset'], 'elements', {
                                prop: {
                                    get: function () {
                                          //add listed elements without keygen, object, output
                                          return $('input, select, textarea, button, fieldset', this).get() || [];
                                    },
                                    writeable: false
                                }
                                       }
                        );
                    }
        
                    $.fn.serializeArray = function () {
                        return this.map(
                            function () {
                                var elements = $.prop(this, 'elements');
                                return elements ? $.makeArray(elements) : this;
                            }
                        )
                        .filter(
                            function () {
                                return this.name && !this.disabled &&
                                ( this.checked || rselectTextarea.test(this.nodeName) ||
                                rinput.test(this.type) );
                            }
                        )
                        .map(
                            function ( i, elem ) {
                                var val = $(this).val();
        
                                return val == null ?
                                null :
                                $.isArray(val) ?
                                $.map(
                                    val, function ( val, i ) {
                                        return { name: elem.name, value: val.replace(rCRLF, "\r\n") };
                                    }
                                ) :
                                { name: elem.name, value: val.replace(rCRLF, "\r\n") };
                            }
                        ).get();
                    };
        
                })();
            }

            try {
                document.querySelector(':checked');
            } catch(er){
                (function () {
                    var checkInputs = {
                        radio: 1,
                        checkbox: 1
                    };
                    var selectChange = function () {
                           var options = this.options || [];
                           var i, len, option;
                        for(i = 0, len = options.length; i < len; i++){
                            option = $(options[i]);
                            option[$.prop(options[i], 'selected') ? 'addClass' : 'removeClass']('prop-checked');
                        }
                    };
                    var checkChange = function () {
                           var fn = $.prop(this, 'checked')  ? 'addClass' : 'removeClass';
                           var className = this.className || '';
                           var parent;
            
                           //IE8- has problems to update styles, we help
                        if((className.indexOf('prop-checked') == -1) == (fn == 'addClass')) { 
                            $(this)[fn]('prop-checked');
                            if((parent = this.parentNode)) {
                                  parent.className = parent.className;
                            }
                        }
                    };
        
        
                    webshims.onNodeNamesPropertyModify('select', 'value', selectChange);
                    webshims.onNodeNamesPropertyModify('select', 'selectedIndex', selectChange);
                    webshims.onNodeNamesPropertyModify(
                        'option', 'selected', function () {
                            $(this).closest('select').each(selectChange);
                        }
                    );
                    webshims.onNodeNamesPropertyModify(
                        'input', 'checked', function (value, boolVal) {
                            var type = this.type;
                            if(type == 'radio' && boolVal) {
                                webshims.modules["form-core"].getGroupElements(this).each(checkChange);
                            } else if(checkInputs[type]) {
                                $(this).each(checkChange);
                            }
                        }
                    );
        
                    $(document).on(
                        'change', function (e) {
            
                            if(checkInputs[e.target.type]) {
                                if(e.target.type == 'radio') {
                                    webshims.modules["form-core"].getGroupElements(e.target).each(checkChange);
                                } else {
                                      $(e.target)[$.prop(e.target, 'checked') ? 'addClass' : 'removeClass']('prop-checked');
                                }
                            } else if(e.target.nodeName.toLowerCase() == 'select') {
                                $(e.target).each(selectChange);
                            }
                        }
                    );
        
                    webshims.addReady(
                        function (context, contextElem) {
                            $('option, input', context)
                            .add(contextElem.filter('option, input'))
                            .each(
                                function () {
                                    var prop;
                                    if(checkInputs[this.type]) {
                                                 prop = 'checked';
                                    } else if(this.nodeName.toLowerCase() == 'option') {
                                           prop = 'selected';
                                    }  
                                    if(prop) {
                                           $(this)[$.prop(this, prop) ? 'addClass' : 'removeClass']('prop-checked');
                                    }
                    
                                }
                            );
                        }
                    );
                })();
            }

            (function () {
                Modernizr.textareaPlaceholder = !!('placeholder' in $('<textarea />')[0]);
                var bustedTextarea = $.browser.webkit && Modernizr.textareaPlaceholder && webshims.browserVersion < 535;
                if(Modernizr.input.placeholder && Modernizr.textareaPlaceholder && !bustedTextarea) {return;}
    
                var isOver = (webshims.cfg.forms.placeholderType == 'over');
                var isResponsive = (webshims.cfg.forms.responsivePlaceholder);
                var polyfillElements = ['textarea'];
                if(!Modernizr.input.placeholder) {
                    polyfillElements.push('input');
                }
    
                var setSelection = function (elem) {
                    try {
                        if(elem.setSelectionRange) {
                               elem.setSelectionRange(0, 0);
                               return true;
                        } else if(elem.createTextRange) {
                                  var range = elem.createTextRange();
                                  range.collapse(true);
                                  range.moveEnd('character', 0);
                                  range.moveStart('character', 0);
                                  range.select();
                                  return true;
                        }
                    } catch(er){}
                };
    
                var hidePlaceholder = function (elem, data, value, _onFocus) {
                    if(value === false) {
                        value = $.prop(elem, 'value');
                    }
                    if(!isOver && elem.type != 'password') {
                        if(!value && _onFocus && setSelection(elem)) {
                            var selectTimer  = setTimeout(
                                function () {
                                    setSelection(elem);
                                }, 9
                            );
                            $(elem)
                            .off('.placeholderremove')
                            .on(
                                {
                                    'keydown.placeholderremove keypress.placeholderremove paste.placeholderremove input.placeholderremove': function (e) {
                                        if(e && (e.keyCode == 17 || e.keyCode == 16)) {return;}
                                        elem.value = $.prop(elem, 'value');
                                        data.box.removeClass('placeholder-visible');
                                        clearTimeout(selectTimer);
                                        $(elem).unbind('.placeholderremove');
                                    },
                                    'mousedown.placeholderremove drag.placeholderremove select.placeholderremove': function (e) {
                                        setSelection(elem);
                                        clearTimeout(selectTimer);
                                        selectTimer = setTimeout(
                                            function () {
                                                setSelection(elem);
                                            }, 9
                                        );
                                    },
                                    'blur.placeholderremove': function () {
                                        clearTimeout(selectTimer);
                                        $(elem).unbind('.placeholderremove');
                                    }
                                }
                            );
                            return;
                        }
                        elem.value = value;
                    } else if(!value && _onFocus) {
                        $(elem)
                        .off('.placeholderremove')
                        .on(
                            {
                                'keydown.placeholderremove keypress.placeholderremove paste.placeholderremove input.placeholderremove': function (e) {
                                    if(e && (e.keyCode == 17 || e.keyCode == 16)) {return;}
                                    data.box.removeClass('placeholder-visible');
                                    $(elem).unbind('.placeholderremove');
                                },
                                'blur.placeholderremove': function () {
                                    $(elem).unbind('.placeholderremove');
                                }
                            }
                        );
                        return;
                    }
                    data.box.removeClass('placeholder-visible');
                },
                showPlaceholder = function (elem, data, placeholderTxt) {
                    if(placeholderTxt === false) {
                        placeholderTxt = $.prop(elem, 'placeholder');
                    }
            
                    if(!isOver && elem.type != 'password') {
                        elem.value = placeholderTxt;
                    }
                    data.box.addClass('placeholder-visible');
                },
                changePlaceholderVisibility = function (elem, value, placeholderTxt, data, type) {
                    if(!data) {
                        data = $.data(elem, 'placeHolder');
                        if(!data) {return;}
                    }
                    $(elem).unbind('.placeholderremove');
                    if(type == 'focus' || (!type && $(elem).is(':focus'))) {
                        if(elem.type == 'password' || isOver || $(elem).hasClass('placeholder-visible')) {
                              hidePlaceholder(elem, data, '', true);
                        }
                        return;
                    }
                    if(value === false) {
                                value = $.prop(elem, 'value');
                    }
                    if(value) {
                              hidePlaceholder(elem, data, value);
                              return;
                    }
                    if(placeholderTxt === false) {
                          placeholderTxt = $.attr(elem, 'placeholder') || '';
                    }
                    if(placeholderTxt && !value) {
                          showPlaceholder(elem, data, placeholderTxt);
                    } else {
                        hidePlaceholder(elem, data, value);
                    }
                },
                createPlaceholder = function (elem) {
                    elem = $(elem);
                    var id             = elem.prop('id'),
                    hasLabel    = !!(elem.prop('title') || elem.attr('aria-labelledby'))
                    ;
                    if(!hasLabel && id) {
                        hasLabel = !!( $('label[for="'+ id +'"]', elem[0].form)[0] );
                    }
                    if(!hasLabel) {
                        if(!id) {
                              id = $.webshims.getID(elem);
                        }
                        hasLabel = !!($('label #'+ id)[0]);
                    }
                    return $(hasLabel ? '<span class="placeholder-text"></span>' : '<label for="'+ id +'" class="placeholder-text"></label>');
                },
                pHolder = (function () {
                    var delReg     = /\n|\r|\f|\t/g,
                    allowedPlaceholder = {
                        text: 1,
                        search: 1,
                        url: 1,
                        email: 1,
                        password: 1,
                        tel: 1,
                        number: 1
                    }
                    ;
            
                    return {
                        create: function (elem) {
                            var data = $.data(elem, 'placeHolder');
                            var form;
                            var responsiveElem;
                            if(data) {return data;}
                            data = $.data(elem, 'placeHolder', {});
                    
                            $(elem).on(
                                'focus.placeholder blur.placeholder', function (e) {
                                    changePlaceholderVisibility(this, false, false, data, e.type);
                                    data.box[e.type == 'focus' ? 'addClass' : 'removeClass']('placeholder-focused');
                                }
                            );
                    
                            if((form = $.prop(elem, 'form'))) {
                                    $(form).on(
                                        'reset.placeholder', function (e) {
                                            setTimeout(
                                                function () {
                                                    changePlaceholderVisibility(elem, false, false, data, e.type);
                                                }, 0
                                            );
                                        }
                                    );
                            }
                    
                            if(elem.type == 'password' || isOver) {
                                   data.text = createPlaceholder(elem);
                                if(isResponsive || $(elem).is('.responsive-width') || (elem.currentStyle || {width: ''}).width.indexOf('%') != -1) {
                                    responsiveElem = true;
                                    data.box = data.text;
                                } else {
                                    data.box = $(elem)
                                    .wrap('<span class="placeholder-box placeholder-box-'+ (elem.nodeName || '').toLowerCase() +' placeholder-box-'+$.css(elem, 'float')+'" />')
                                    .parent();
                                }
                                data.text
                                .insertAfter(elem)
                                .on(
                                    'mousedown.placeholder', function () {
                                        changePlaceholderVisibility(this, false, false, data, 'focus');
                                        try {
                                            setTimeout(
                                                function () {
                                                    elem.focus();
                                                }, 0
                                            );
                                        } catch(e){}
                                        return false;
                                    }
                                );
                        
                        
                                    $.each(
                                        ['lineHeight', 'fontSize', 'fontFamily', 'fontWeight'], function (i, style) {
                                            var prop = $.css(elem, style);
                                            if(data.text.css(style) != prop) {
                                                data.text.css(style, prop);
                                            }
                                        }
                                    );
                                    $.each(
                                        ['Left', 'Top'], function (i, side) {
                                            var size = (parseInt($.css(elem, 'padding'+ side), 10) || 0) + Math.max((parseInt($.css(elem, 'margin'+ side), 10) || 0), 0) + (parseInt($.css(elem, 'border'+ side +'Width'), 10) || 0);
                                            data.text.css('padding'+ side, size);
                                        }
                                    );
                        
                                       $(elem)
                                    .on(
                                        'updateshadowdom', function () {
                                            var height, width; 
                                            if((width = elem.offsetWidth) || (height = elem.offsetHeight)) {
                                                data.text
                                                .css(
                                                    {
                                                        width: width,
                                                        height: height
                                                    }
                                                )
                                                .css($(elem).position());
                                            }
                                        }
                                    )
                                    .triggerHandler('updateshadowdom');
                        
                            } else {
                                var reset = function (e) {
                                    if($(elem).hasClass('placeholder-visible')) {
                                        hidePlaceholder(elem, data, '');
                                        if(e && e.type == 'submit') {
                                            setTimeout(
                                                function () {
                                                    if(e.isDefaultPrevented()) {
                                                         changePlaceholderVisibility(elem, false, false, data);
                                                    }
                                                }, 9
                                            );
                                        }
                                    }
                                };
                        
                                $(window).on('beforeunload', reset);
                                data.box = $(elem);
                                if(form) {
                                    $(form).submit(reset);
                                }
                            }
                    
                            return data;
                        },
                        update: function (elem, val) {
                            var type = ($.attr(elem, 'type') || $.prop(elem, 'type') || '').toLowerCase();
                            if(!allowedPlaceholder[type] && !$.nodeName(elem, 'textarea')) {
                                webshims.error('placeholder not allowed on input[type="'+type+'"]');
                                if(type == 'date') {
                                    webshims.error('but you can use data-placeholder for input[type="date"]');
                                }
                                return;
                            }
                    
                    
                            var data = pHolder.create(elem);
                            if(data.text) {
                                data.text.text(val);
                            }
                    
                            changePlaceholderVisibility(elem, false, val, data);
                        }
                    };
                })();
    
                $.webshims.publicMethods = {
                    pHolder: pHolder
                };
                polyfillElements.forEach(
                    function (nodeName) {
                        var desc = webshims.defineNodeNameProperty(
                            nodeName, 'placeholder', {
                                attr: {
                                    set: function (val) {
                                        var elem = this;
                                        if(bustedTextarea) {
                                            webshims.data(elem, 'textareaPlaceholder', val);
                                            elem.placeholder = '';
                                        } else {
                                            webshims.contentAttr(elem, 'placeholder', val);
                                        }
                                        pHolder.update(elem, val);
                                    },
                                    get: function () {
                                        var ret = (bustedTextarea) ? webshims.data(this, 'textareaPlaceholder') : '';
                                        return ret || webshims.contentAttr(this, 'placeholder');
                                    }
                                },
                                reflect: true,
                                initAttr: true
                            }
                        );
                    }
                );
    
    
                polyfillElements.forEach(
                    function (name) {
                        var placeholderValueDesc =  {};
                        var desc;
                        ['attr', 'prop'].forEach(
                            function (propType) {
                                placeholderValueDesc[propType] = {
                                    set: function (val) {
                                            var elem = this;
                                            var placeholder;
                                        if(bustedTextarea) {
                                            placeholder = webshims.data(elem, 'textareaPlaceholder');
                                        } 
                                        if(!placeholder) {
                                            placeholder = webshims.contentAttr(elem, 'placeholder');
                                        }
                                        $.removeData(elem, 'cachedValidity');
                                        var ret = desc[propType]._supset.call(elem, val);
                                        if(placeholder && 'value' in elem) {
                                            changePlaceholderVisibility(elem, val, placeholder);
                                        }
                                        return ret;
                                    },
                                    get: function () {
                                                 var elem = this;
                                                 return $(elem).hasClass('placeholder-visible') ? '' : desc[propType]._supget.call(elem);
                                    }
                                };
                            }
                        );
                        desc = webshims.defineNodeNameProperty(name, 'value', placeholderValueDesc);
                    }
                );
    
            })();

            (function () {
                var doc = document;    
                if('value' in document.createElement('output') ) {return;}
        
                webshims.defineNodeNameProperty(
                    'output', 'value', {
                        prop: {
                            set: function (value) {
                                var setVal = $.data(this, 'outputShim');
                                if(!setVal) {
                                    setVal = outputCreate(this);
                                }
                                setVal(value);
                            },
                            get: function () {
                                return webshims.contentAttr(this, 'value') || $(this).text() || '';
                            }
                        }
                    }
                );
        
        
                webshims.onNodeNamesPropertyModify(
                    'input', 'value', function (value, boolVal, type) {
                        if(type == 'removeAttr') {return;}
                        var setVal = $.data(this, 'outputShim');
                        if(setVal) {
                            setVal(value);
                        }
                    }
                );
        
                var outputCreate = function (elem) {
                    if(elem.getAttribute('aria-live')) {return;}
                    elem = $(elem);
                    var value = (elem.text() || '').trim();
                    var    id     = elem.attr('id');
                    var    htmlFor = elem.attr('for');
                    var shim = $('<input class="output-shim" type="text" disabled name="'+ (elem.attr('name') || '')+'" value="'+value+'" style="display: none !important;" />').insertAfter(elem);
                    var form = shim[0].form || doc;
                    var setValue = function (val) {
                        shim[0].value = val;
                        val = shim[0].value;
                        elem.text(val);
                        webshims.contentAttr(elem[0], 'value', val);
                    };
            
                    elem[0].defaultValue = value;
                    webshims.contentAttr(elem[0], 'value', value);
            
                    elem.attr({'aria-live': 'polite'});
                    if(id) {
                        shim.attr('id', id);
                        elem.attr('aria-labelledby', webshims.getID($('label[for="'+id+'"]', form)));
                    }
                    if(htmlFor) {
                        id = webshims.getID(elem);
                        htmlFor.split(' ').forEach(
                            function (control) {
                                control = document.getElementById(control);
                                if(control) {
                                    control.setAttribute('aria-controls', id);
                                }
                            }
                        );
                    }
                    elem.data('outputShim', setValue);
                    shim.data('outputShim', setValue);
                    return setValue;
                };
                        
                webshims.addReady(
                    function (context, contextElem) {
                        $('output', context).add(contextElem.filter('output')).each(
                            function () {
                                outputCreate(this);
                            }
                        );
                    }
                );
        
                /*
                * Implements input event in all browsers
                */
                (function () {
                    var noInputTriggerEvts = {updateInput: 1, input: 1},
                    noInputTypes = {
                        radio: 1,
                        checkbox: 1,
                        submit: 1,
                        button: 1,
                        image: 1,
                        reset: 1,
                        file: 1
                    
                        //pro forma
                        ,color: 1
                        //,range: 1
                    },
                    observe = function (input) {
                        var timer,
                        lastVal = input.prop('value'),
                        trigger = function (e) {
                                //input === null
                            if(!input) {return;}
                                var newVal = input.prop('value');
                            
                            if(newVal !== lastVal) {
                                lastVal = newVal;
                                if(!e || !noInputTriggerEvts[e.type]) {
                                    webshims.triggerInlineForm && webshims.triggerInlineForm(input[0], 'input');
                                }
                            }
                        },
                        extraTimer,
                        extraTest = function () {
                                clearTimeout(extraTimer);
                                extraTimer = setTimeout(trigger, 9);
                        },
                        unbind = function () {
                                input.unbind('focusout', unbind).unbind('keyup keypress keydown paste cut', extraTest).unbind('input change updateInput', trigger);
                                clearInterval(timer);
                                setTimeout(
                                    function () {
                                        trigger();
                                        input = null;
                                    }, 1
                                );
                            
                        }
                        ;
                    
                        clearInterval(timer);
                        timer = setInterval(trigger, 99);
                        extraTest();
                        input.on(
                            {
                                'keyup keypress keydown paste cut': extraTest,
                                focusout: unbind,
                                'input updateInput change': trigger
                            }
                        );
                    }
                    ;
                    if($.event.customEvent) {
                        $.event.customEvent.updateInput = true;
                    } 
            
                    $(doc)
                    .on(
                        'focusin', function (e) {
                            if(e.target && e.target.type && !e.target.readOnly && !e.target.disabled && (e.target.nodeName || '').toLowerCase() == 'input' && !noInputTypes[e.target.type] ) {
                                observe($(e.target));
                            }
                        }
                    );
                })();
            })();

        }
    ); //webshims.ready end
}//end formvalidation

jQuery.webshims.register(
    'form-message', function ($, webshims, window, document, undefined, options) {
        "use strict";
        var validityMessages = webshims.validityMessages;
    
        var implementProperties = (options.overrideMessages || options.customMessages) ? ['customValidationMessage'] : [];
    
        validityMessages['en'] = $.extend(
            true, {
                typeMismatch: {
                    email: 'Please enter an email address.',
                    url: 'Please enter a URL.',
                    number: 'Please enter a number.',
                    date: 'Please enter a date.',
                    time: 'Please enter a time.',
                    range: 'Invalid input.',
                    "datetime-local": 'Please enter a datetime.'
                },
                rangeUnderflow: {
                    defaultMessage: 'Value must be greater than or equal to {%min}.'
                },
                rangeOverflow: {
                    defaultMessage: 'Value must be less than or equal to {%max}.'
                },
                stepMismatch: 'Invalid input.',
                tooLong: 'Please enter at most {%maxlength} character(s). You entered {%valueLen}.',
        
                patternMismatch: 'Invalid input. {%title}',
                valueMissing: {
                    defaultMessage: 'Please fill out this field.',
                    checkbox: 'Please check this box if you want to proceed.'
                }
            }, (validityMessages['en'] || validityMessages['en-US'] || {})
        );
    
    
        ['select', 'radio'].forEach(
            function (type) {
                validityMessages['en'].valueMissing[type] = 'Please select an option.';
            }
        );
    
        ['date', 'time', 'datetime-local'].forEach(
            function (type) {
                validityMessages.en.rangeUnderflow[type] = 'Value must be at or after {%min}.';
            }
        );
        ['date', 'time', 'datetime-local'].forEach(
            function (type) {
                validityMessages.en.rangeOverflow[type] = 'Value must be at or before {%max}.';
            }
        );
    
        validityMessages['en-US'] = validityMessages['en-US'] || validityMessages['en'];
        validityMessages[''] = validityMessages[''] || validityMessages['en-US'];
    
        validityMessages['de'] = $.extend(
            true, {
                typeMismatch: {
                    email: '{%value} ist keine zulässige E-Mail-Adresse',
                    url: '{%value} ist keine zulässige Webadresse',
                    number: '{%value} ist keine Nummer!',
                    date: '{%value} ist kein Datum',
                    time: '{%value} ist keine Uhrzeit',
                    range: '{%value} ist keine Nummer!',
                    "datetime-local": '{%value} ist kein Datum-Uhrzeit Format.'
                },
                rangeUnderflow: {
                    defaultMessage: '{%value} ist zu niedrig. {%min} ist der unterste Wert, den Sie benutzen können.'
                },
                rangeOverflow: {
                    defaultMessage: '{%value} ist zu hoch. {%max} ist der oberste Wert, den Sie benutzen können.'
                },
                stepMismatch: 'Der Wert {%value} ist in diesem Feld nicht zulässig. Hier sind nur bestimmte Werte zulässig. {%title}',
                tooLong: 'Der eingegebene Text ist zu lang! Sie haben {%valueLen} Zeichen eingegeben, dabei sind {%maxlength} das Maximum.',
                patternMismatch: '{%value} hat für dieses Eingabefeld ein falsches Format! {%title}',
                valueMissing: {
                    defaultMessage: 'Bitte geben Sie einen Wert ein',
                    checkbox: 'Bitte aktivieren Sie das Kästchen'
                }
            }, (validityMessages['de'] || {})
        );
    
        ['select', 'radio'].forEach(
            function (type) {
                validityMessages['de'].valueMissing[type] = 'Bitte wählen Sie eine Option aus';
            }
        );
    
        ['date', 'time', 'datetime-local'].forEach(
            function (type) {
                validityMessages.de.rangeUnderflow[type] = '{%value} ist zu früh. {%min} ist die früheste Zeit, die Sie benutzen können.';
            }
        );
        ['date', 'time', 'datetime-local'].forEach(
            function (type) {
                validityMessages.de.rangeOverflow[type] = '{%value} ist zu spät. {%max} ist die späteste Zeit, die Sie benutzen können.';
            }
        );
    
        var currentValidationMessage =  validityMessages[''];
    
    
        webshims.createValidationMessage = function (elem, name) {
            var message = currentValidationMessage[name];
            if(message && typeof message !== 'string') {
                message = message[ $.prop(elem, 'type') ] || message[ (elem.nodeName || '').toLowerCase() ] || message[ 'defaultMessage' ];
            }
            if(message) {
                ['value', 'min', 'max', 'title', 'maxlength', 'label'].forEach(
                    function (attr) {
                        if(message.indexOf('{%'+attr) === -1) {return;}
                        var val = ((attr == 'label') ? $.trim($('label[for="'+ elem.id +'"]', elem.form).text()).replace(/\*$|:$/, '') : $.attr(elem, attr)) || '';
                        if(name == 'patternMismatch' && attr == 'title' && !val) {
                             webshims.error('no title for patternMismatch provided. Always add a title attribute.');
                        }
                        message = message.replace('{%'+ attr +'}', val);
                        if('value' == attr) {
                                message = message.replace('{%valueLen}', val.length);
                        }
                    }
                );
            }
            return message || '';
        };
    
    
        if(webshims.bugs.validationMessage || !Modernizr.formvalidation || webshims.bugs.bustedValidity) {
            implementProperties.push('validationMessage');
        }
    
        webshims.activeLang(
            {
                langObj: validityMessages, 
                module: 'form-core', 
                callback: function (langObj) {
                    currentValidationMessage = langObj;
                }
            }
        );
    
        implementProperties.forEach(
            function (messageProp) {
                webshims.defineNodeNamesProperty(
                    ['fieldset', 'output', 'button'], messageProp, {
                        prop: {
                            value: '',
                            writeable: false
                        }
                    }
                );
                ['input', 'select', 'textarea'].forEach(
                    function (nodeName) {
                        var desc = webshims.defineNodeNameProperty(
                            nodeName, messageProp, {
                                prop: {
                                    get: function () {
                                        var elem = this;
                                        var message = '';
                                        if(!$.prop(elem, 'willValidate')) {
                                            return message;
                                        }
                        
                                        var validity = $.prop(elem, 'validity') || {valid: 1};
                        
                                        if(validity.valid) {return message;}
                                        message = webshims.getContentValidationMessage(elem, validity);
                        
                                        if(message) {return message;}
                        
                                        if(validity.customError && elem.nodeName) {
                                            message = (Modernizr.formvalidation && !webshims.bugs.bustedValidity && desc.prop._supget) ? desc.prop._supget.call(elem) : webshims.data(elem, 'customvalidationMessage');
                                            if(message) {return message;}
                                        }
                                        $.each(
                                            validity, function (name, prop) {
                                                if(name == 'valid' || !prop) {return;}
                            
                                                message = webshims.createValidationMessage(elem, name);
                                                if(message) {
                                                    return false;
                                                }
                                            }
                                        );
                                        return message || '';
                                    },
                                    writeable: false
                                }
                            }
                        );
                    }
                );
        
            }
        );
    }
);