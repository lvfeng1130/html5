"use strict";
!function ($) {
    //TODO: Change away from last status instantiated.
    var status = null;
    var methods = {
        init: function (config) {
            console.log("Init.");
            var loadStatus = function(){
                console.log("Status loaded.");
                var navDiv = config.selector;

                var undoLast = function(){};
                if(config.undoLastFunction)undoLast = config.undoLastFunction;

                var undoAll = function(){};
                if(config.undoAllFunction)undoAll = config.undoAllFunction;

                return status = new Statuses(navDiv, undoLast, undoAll);
            };
            if($("#nav").length===0){
                $(document).on("navigator.loaded", function(){
                    return loadStatus();
                });
            }else{
                return loadStatus();
            }
        },
        setState: function(state){
            //console.log("Setting state.");
            status.setState(state);
        },
        setUndoMode: function(mode){
            //console.log("Setting mode.");
            status.setUndoMode(mode);
        },
        setUndoLastFunction: function(callback){
            status.onUndoLast = callback;
        },
        setUndoAllFunction: function(callback){
            status.onUndoAll = callback;
        }
    };

    $.fn.status = function (method) {
        // Create some defaults, extending them with any options that were provided
        //var settings = $.extend({}, options);
        // Method calling logic
        if(!this.selector){
            $.error("Selector required!");
            return;
        }

        if (methods[method]) {
            if(method!=='init'&&!navigator){
                $.error('Navigator not initialized!');
                return;
            }
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            arguments[0].selector = this.selector;
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.navigator');
        }

        return this.each(function () {});
    };


    //////////////////////////
    //  Enums
    //////////////////////////
    var states = {
        idle: 0,
        busy: 1,
        error: 2
    };

    var undoMode = {
        none: 0,
        last: 1,
        all: 2
    };

    //Image paths
    var statusImages =
        [
            "../img/idleStatus.png", //State 0
            "../img/busyStatus.png", //State 1
            "../img/errorStatus.png" //State 2
        ];

    var INIT_STATUS_IMG = statusImages[states.idle];

    var createStatusMenu = function(status){
        var popupClass = $(document).popup("getPopupClass");
        var contents = [];
        var menu = {
            id: "navStatus",
            contents: contents,
            disableHeader: true
        };

        var undoLastMenu = {"name": "Undo Last", id: "undoLast"};
        var undoAllMenu = {"name": "Undo All", id: "undoAll"};

        if(status.currentUndoMode>=1){
            contents.push(undoLastMenu);
        }
        if(status.currentUndoMode>=2){
            contents.push(undoAllMenu);
        }
        return menu;
    };

    //////////////////////////
    //  Constructor
    //////////////////////////
    function Statuses(targetDiv, undoLast, undoAll){
        var thisStatus = this;
        this.targetDiv = targetDiv;
        var INIT_STATE = states.idle;
        var INIT_UNDO_MODE = undoMode.none;
        this.currentState = INIT_STATE;
        this.currentUndoMode = INIT_UNDO_MODE;
        this.statusPopup = null;
        this.lastStateChangeTime = 0;

        this.onUndoLast = undoLast;
        this.onUndoAll = undoAll;

        //Init
        //Add status to target.
        var statusDiv = '<div id="statusesContainer">' +
            '<div id="navStatus" class="navElement">' +
            '<a><img class="navIcon" src="'+ INIT_STATUS_IMG +'"></img></a>' +
            '</div>' +
            '</div>';
        $(targetDiv).append(statusDiv);

        //Init Popup.
        var menu = createStatusMenu(thisStatus);
        thisStatus.statusPopup = $("#navStatus").optionsPopup(menu);

        this.setState(INIT_STATE);
        this.setUndoMode(INIT_UNDO_MODE);

        $(document).on("click", "#undoLast", function(){
            $(document).trigger("status.undoLast");
            thisStatus.onUndoLast();
        });

        $(document).on("click", "#undoAll", function(){
            $(document).trigger("status.undoAll");
            thisStatus.onUndoAll();
        });
    }

    //////////////////////////
    //  Functions
    //////////////////////////
    Statuses.prototype.setState = function(state){
        //Minimum time busy icon is visible.
        var MIN_TIME_VISIBLE = 800;

        var timeNow = new Date().getTime();
        var timeSince = (timeNow-this.lastStateChangeTime);
        //console.log("Time: "+ timeSince);
        this.lastStateChangeTime = timeNow;
        var previousState = this.currentState;
        this.currentState = state;

        //If the last state was the busy state, and less than min time has passed; keep image as busy until delay fn.
        //Otherwise, just switch to the state passed.
        if( previousState === states.busy && (timeSince < MIN_TIME_VISIBLE) ){
            $("#navStatus .navIcon").attr("src", statusImages[states.busy]);
            _.delay(function(){
                $("#navStatus .navIcon").attr("src", statusImages[state]);
                $(document).trigger("status.stateChange");
            }, (MIN_TIME_VISIBLE-timeSince));
        }else{
            $("#navStatus .navIcon").attr("src", statusImages[state]);
            $(document).trigger("status.stateChange");
        }

    };

    Statuses.prototype.setUndoMode = function(mode){
        var previousMode = this.currentUndoMode;
        this.currentUndoMode = mode;
        var popupClass = this.statusPopup.superConstructor;
        var menu = popupClass.getMenu("navStatus");
        var newMenu = null;

        /*if(previousMode === mode){
            return;
        }*/

        popupClass.closePopup();

        if(this.currentUndoMode === undoMode.none){
            this.statusPopup.disablePopup();
        }else{
            this.statusPopup.enablePopup();
        }

        newMenu = createStatusMenu(this, mode);
        //console.log("currentUndoMode: "+mode);

        //Replace menu in popup
        this.statusPopup.replaceMenu(menu, newMenu);

        $(document).trigger("status.undoModeChange");
    };
}(window.jQuery);
