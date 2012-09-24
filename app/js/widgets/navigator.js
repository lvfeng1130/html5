"use strict";

define(["jquery", "ui/popup", "doT", "jmousewheel", "jscrollpane"], function ($, Popup, doT) {
    (function ($) {
        var navigator = null;
        var methods = {
            init: function (conf, options) {
                navigator = new Navigator(conf);
            },
            coverWindow: function(){
                navigator.coverWindow();
            },
            closeCoverWindow: function(){
                navigator.closeCoverWindow();
            },
            changeBusiness: function(clicked, config){
                navigator.changeBusiness(clicked, config);
            },
            changeAvatar: function(imgLoc){
                navigator.changeAvatar(imgLoc);
            },
            changeBusinessLogo: function(businessLogoUrl){
                navigator.changeBusinessLogo(businessLogoUrl);
            },
            closePopup: function(){
                navigator.closePopup();
            },
            hideSearch: function(){
                navigator.hideSearch();
            },
            showSearch: function(){
                navigator.showSearch();
            }
        };

        $.fn.navigator = function (method) {
            // Create some defaults, extending them with any options that were provided
            //var settings = $.extend({}, options);
            // Method calling logic

            if (methods[method]) {
                if(method!=='init'&&navigator===null){
                    $.error('Navigator not initialized!');
                    return;
                }
                return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
            } else if (typeof method === 'object' || !method) {
                return methods.init.apply(this, arguments);
            } else {
                $.error('Method ' + method + ' does not exist on jQuery.navigator');
            }

            return this.each(function () {});
        };
    })(jQuery);

    var backButtonTemplate = doT.template('<div id="backButtonContainer"><a onclick="main.onBack()"><img id="backArrow" src="img/backArrow.png"/></a></div>');
    var navTemplate = doT.template('<div id="navContainer">' +
        '<div id="navSearch" class="navElement">' +
        ' <input name="search" type="text" placeholder="Search..."/>' +
        '<a><img src="img/Search.png"/></a></div>' +
        '<div id="navClient" class="navElement last">' +
        '<a><img class="navIcon profile" src="{{= it.profileImgUrl }}"/><img id="clientLogo" src="{{= it.clientLogoUrl }}"/></a></div>' +
        '</div>' +
        '<img id="logo" src="./img/Logo.png" alt="FoundOPS"/>');
    var expandTemplate = doT.template('<a id="expandMenuButton"><div id="slideMenu"><img class="iconExpand" src="img/Expand.png"/></div>');
    var showMenuTemplate = doT.template('<div id="showMenu"><a><img class="iconShow" src="img/Expand.png"/></a></div>');
    var sideBarElementTemplate = doT.template(
        '<a {{= it.href }} class="sideBarElement" data-color="{{= it.color }}" data-iconUrl="{{= it.iconUrl }}" data-hoverIconUrl="{{= it.hoverIconUrl }}">' +
        '   <span class="icon" style="background: url(\'{{= it.iconUrl }}\') {{= it.bgX }} {{= it.bgY }} no-repeat"></span>' +
        '   <span class="sectionName">{{= it.name }}</span></a>');

    /**
     * Initializes the navigator
     * @param config Example below
     * {
     * name: "Jordan Kelly",
     * avatarUrl: ".\img\jordan.jpg",
     * businessLogoUrl: ".\img\myBusiness.jpg",
     * roles: [{name: "FoundOPS", id:"23144-24242-242442"},
     *         {name: "GotGrease", id:"Afsafsaf-24242-242442"},
     *         {name: "AB Couriers", id:"Dagag-24242-242442"}],
     * sections: [{name: "Employees", url:"#Employees", iconUrl: ".\img\employees.jpg"},
     *            {name: "Logout", url:"#Logout", iconUrl: ".\img\logout.jpg"}
     *            {name: "Regions", url:"#Regions", iconUrl: ".\img\regions.jpg"},
     *            {name: "Vehicles", url:"#Vehicles", iconUrl: ".\img\vehicles.jpg"}];
     * };
     * @constructor
     */
    function Navigator(conf) {
        var config = conf;

        var sections = conf.sections;
        var roles = conf.roles;

        var thisNavigator = this;
        this.sideBarElementCount = 0;

        this.isCoverWindowButtonEnabled = false;
        //TODO: Add coverWindowEnabled option to conf object.

        this.isBackButtonEnabled = false;
        if(typeof(conf.enableBackButton)!=='undefined'){
            this.isBackButtonEnabled = conf.enableBackButton;
        }

        /** DEFAULT STATIC VARIABLES **/
        //Logic values
        var MOBILE_WIDTH = "800";
        //Animation values
        var SIDEBAR_WIDTH_EXPANDED = "200px";
        var SIDEBAR_WIDTH = "55px";
        var ANIMATION_SPEED = 'fast';
        //////////////////////////////////

        /** Initializes top navigation **/
        var initTopNav = function (config) {
            var topNav = $(document.createElement('div'));
            topNav.attr('id', 'nav');

            var businessLogoEnabled = true;
            var businessLogoUrl = config.roles[0].businessLogoUrl;

            //TODO: Check if avatarUrl is undefined.
            if (typeof (businessLogoUrl) === 'undefined') {
                businessLogoEnabled = false;
                businessLogoUrl = "";
            }

            var params = {
                profileImgUrl: config.avatarUrl,
                clientLogoUrl: businessLogoUrl
            };
            topNav.html(navTemplate(params));

            //Hide business logo if undefined.
            if (!businessLogoEnabled) {
                topNav.find("#navClient .navIcon").css("border", "0");
                topNav.find("#clientLogo").css("display", "none");
            }
            /////////

            $('body').prepend(topNav);

            //refresh the page when the user double clicks on the corner logo
            $('#logo').dblclick(function () {
                var url = window.location.href;
                //remove the hash
                var index = url.indexOf('#');
                if (index > 0) {
                    url = url.substring(0, index);
                }
                window.location.href = url;
            });
        };

        /** Initializes scrollbar for sidebar navigation **/
        //TODO: Rename.
        var initSideBarScrollBar = function () {
            var sideBarWrapperInnerDiv = $("#sideBarInnerWrapper");
            sideBarWrapperInnerDiv.jScrollPane({
                horizontalGutter: 0,
                verticalGutter: 0,
                verticalDragMinHeight: 25,
                'showArrows': false
            });

            var sideBarScrollBar = sideBarWrapperInnerDiv.data('jsp');
            //From jScrollPane examples: http://jscrollpane.kelvinluck.com/dynamic_height.html
            var throttleTimeout;
            $(window).bind('resize', function () {
                if ($.browser.msie) {
                    if (!throttleTimeout) {
                        throttleTimeout = setTimeout(function () {
                            sideBarScrollBar.reinitialise();
                            throttleTimeout = null;
                        }, 50);
                    }
                } else {
                    sideBarScrollBar.reinitialise();
                }
            });
            sideBarScrollBar.reinitialise();
        };

        /**
         * Converts an image url to its colored version, for the hover url
         * Ex. dispatcher.png -> dispatcherColor.png
         */
        //    function toHoverImage(imgLoc) {
        //        var extIndex = imgLoc.lastIndexOf('.');
        //        return imgLoc.substring(0, extIndex) + "Color" + imgLoc.substring(extIndex);
        //    }

        var getSection = function (sections, name) {
            var section;
            for (section in sections) {
                //console.log("Sections: " + sections[section]);
                if (sections[section].name === name) {
                    return sections[section];
                }
            }
            return null;
        };

        var getRole = function (roles, name) {
            var role;
            for (role in roles) {
                //console.log("Roles: " + roles[role].name);
                if (roles[role].name === name) {
                    return roles[role];
                }
            }
            return null;
        };

        var setSideBarSections = function (config, availableSections) {
            $(".sideBarElement").off();

            var section;
            var sBar = $("#sideBar");
            var sBarElement = "";

            thisNavigator.sideBarElementCount = 0;

            //initialize the sections on the sidebar
            //TODO: Take a look at this again.
            for (section in availableSections) {
                //console.log(availableSections[section]);
                var currentSection = getSection(config.sections, availableSections[section]), //config.sections[section];
                    href = "";
                if (typeof (currentSection.url) !== "undefined") {
                    href = "href='" + currentSection.url + "'";
                }
                var name = currentSection.name,
                    color = currentSection.color,
                    iconUrl = currentSection.iconUrl,
                    hoverIconUrl = currentSection.hoverIconUrl;
                //TODO: Implement sprite selection.
                $('<img/>').src = hoverIconUrl;//toHoverImage(iconUrl);
                //Default values unless sprite.
                var bgX = 'center';
                var bgY = 'center';

                var templateData = {
                    href: href,
                    color: color,
                    iconUrl: iconUrl,
                    hoverIconUrl: hoverIconUrl,
                    bgX: bgX,
                    bgY: bgY,
                    name: name
                };
                sBarElement += sideBarElementTemplate(templateData);
                thisNavigator.sideBarElementCount++;
            }
            $("#sideBarSections").html(sBarElement);

            //TODO: Reuse sideBarWrapperDiv object.

            $(".sideBarElement").on({
                "touchstart mouseenter": function () {
                    $(this).stop(true, true).addClass($(this).attr('data-color'));
                    //var image = $(this).find(".icon:first").css('background-image').replace(/^url|[\(\)]/g, '');
                    var hoverImg = $(this).attr("data-hoverIconUrl");//getSection(config.sections, $(this).find(".sectionName").html()).iconHoverUrl;//toHoverImage(image);
                    $(this).find(".icon").css('background-image', 'url(' + hoverImg + ')');
                },
                "mouseleave": function () {
                    if($(this).hasClass("clicked")) return;  //Does nothing if leaving an element that was just clicked.

                    $(this).stop(true, true).removeClass($(this).attr('data-color'));
                    var image = $(this).attr("data-iconUrl");//getSection(config.sections, $(this).find(".sectionName").html()).iconUrl;//$(this).find(".icon:first").css('background-image').replace(/^url|[\(\)]/g, '');
                    //image = image.replace('Color.', '.');
                    $(this).find(".icon").css('background-image', 'url(' + image + ')');
                },
                "touchend mouseup": function() {
                    //Reset hover
                    //$(".sideBarElement.clicked").removeClass($(this).attr('data-color'));

                    //Reset the last clicked element
                    var currentClicked = this;
                    $(".sideBarElement.clicked").each(function(index){
                        //Skip the current clicked element.
                        if(currentClicked===this){return true;}

                        $(this).removeClass($(this).attr('data-color'));
                        var image = $(this).attr("data-iconUrl");
                        $(this).find(".icon").css('background-image', 'url(' + image + ')');
                        $(this).removeClass("clicked");
                    });

                    //Add the clicked class so mouseleave doesn't reset highlight.
                    $(this).addClass("clicked");
                },
                "click": function () {
                    var name = $(this).find(".sectionName:first").text();
                    //TODO: Will this work every time?
                    var section = getSection(config.sections, name);
                    $(this).trigger("sectionSelected", section);
                    if ($("#sideBar").hasClass("cover")) {
                        thisNavigator.closeCoverWindow();
                    }
                }
            });
        };

        //TODO: Set max and min values at top of function.
        var slideMenuOpen = function () {
            $("#sideBarWrapper, #sideBarInnerWrapper, #sideBarWrapper .jspContainer, #sideBar")
                .stop(true, false)
                .animate({width: SIDEBAR_WIDTH_EXPANDED}, ANIMATION_SPEED);
            $(".iconExpand").addClass("flip");
        };

        var slideMenuClosed = function () {
            //clearTimeout(slideMenuTimeout);
            $("#sideBarWrapper, #sideBarInnerWrapper, #sideBarWrapper .jspContainer, #sideBar")
                .stop(true, false)
                .animate({width: SIDEBAR_WIDTH}, ANIMATION_SPEED);
            $(".iconExpand").removeClass("flip");

        };

        /** Initializes sidebar navigation **/
        var initSideBar = function (config) {
            //TODO: Error checking?
            var slideMenuTimeout = null;
            var sections = config.sections;

            //TODO: Remove duplicate naming.
            //setup the sidebar wrapper (for the scrollbar)
            var sBarWrapper = $(document.createElement('div'));
            sBarWrapper.attr('id', 'sideBarWrapper');

            var sBarInnerWrapper = $(document.createElement('div'));
            sBarInnerWrapper.attr('id', 'sideBarInnerWrapper');

            //setup the sidebar (the place for buttons)
            var sBar = $(document.createElement('div'));
            sBar.attr('id', 'sideBar');

            //extract the template from the html
            sBar.html(expandTemplate);
            sBar.append("<div id='sideBarSections'></div>");
            sBarInnerWrapper.append(sBar);
            sBarWrapper.append(sBarInnerWrapper);

            if (typeof (config.coverWindow) !== 'undefined' && config.coverWindow === true) {
                $(sBarInnerWrapper).after("<div id='coverWindowButton'>Cover Window</div>");
                thisNavigator.isCoverWindowButtonEnabled = true;
                console.log("It's enabled");
            }

            $('#nav').after(sBarWrapper);

            setSideBarSections(config, config.roles[0].sections);

            $(document).ready(function () {
                if ($(window).width() <= MOBILE_WIDTH) {
                    //TODO: Condense into another function?
                    sBar.addClass("hidden");
                    var offset = -1 * (sBar.offset().top + sBar.outerHeight());
                    sBar.css("top", offset);
                } /* else {
                    $(".iconShow").addClass("rotateIcon");
                } */
            });

            //Add showMenuSpan to topNav.
            $('#navContainer').after(showMenuTemplate);

            //Add backButton to topNav.
            if (thisNavigator.isBackButtonEnabled) {
                $('#navContainer').before(backButtonTemplate);
                $('#navContainer').addClass("mobileMode");
                $("#backButtonContainer").mousedown(function (e) {
                    $('#backButtonContainer').toggleClass("backButtonClicked");
                });
                $("#backButtonContainer").mouseup(function (e) {
                    $('#backButtonContainer').toggleClass("backButtonClicked");
                });
            }

            /** Initialize sidebar scrollbar **/
            initSideBarScrollBar();

            /** Sidebar event listeners **/
            var sideBarDiv = $("#sideBar");
            var sideBarWrapperDiv = $("#sideBarWrapper");
            //Listens for clicks outside of elements
            $(document).on('click touchend', function (e) {
                var clicked = $(e.target);
                //console.log("Clicked on: " + clicked.html());
                var sideBarLen = clicked.parents("#sideBar").length + clicked.is("#sideBar") ? 1 : 0;
                var showMenuLen = clicked.parents("#showMenu").length + clicked.is("#showMenu") ? 1 : 0;

                //Detects clicks outside of the sideBar when shown.
                if (sideBarLen === 0 && showMenuLen === 0 && !$("#sideBar").hasClass("hidden") && $(document).width() <= MOBILE_WIDTH) {
                    toggleMenu();
                }

                var sideBarWrapperLen = clicked.parents("#sideBarWrapper").length + clicked.is("#sideBarWrapper") ? 1 : 0;
                //Detects clicks outside of the sideBar when expanded.
                var slideMenuLen = clicked.parents("#slideMenu").length + clicked.is("#slideMenu") ? 1 : 0;
                if (sideBarWrapperLen === 0 && slideMenuLen === 0 && $("#sideBar").hasClass("expand") && $(document).width() > MOBILE_WIDTH) {
                    slideMenuClosed();
                }
            });

            //Listener for window resize to reset sideBar styles.
            $(window).resize(function () {
                if ($(window).width() <= MOBILE_WIDTH) {
                    sideBarDiv.css("width", "");
                    sideBarDiv.removeClass("hover");
                    $(".iconExpand").removeClass("flip");

                    if (sideBarDiv.hasClass("cover")) {
                        sideBarDiv.removeClass("cover");
                        sideBarDiv.attr("style", "");
                        $("#sideBarWrapper").attr("style", "");
                        $("#sideBarInnerWrapper").attr("style", "");
                    }

                    if (!sideBarDiv.hasClass("shown")) {
                        $("#sideBarWrapper").css("width", "");

                        //TODO: Condense.
                        sideBarDiv.addClass("hidden");
                        //console.log("sBar.offset().top: " + sBar.offset().top);
                        if (sBar.offset().top >= 0) {
                            var offset = -1 * (sBar.offset().top + sBar.outerHeight());
                            //console.log("Offset: "+ offset);
                            sBar.css("top", offset);
                        }

                        $("#sideBarWrapper").css('visibility', 'hidden');
                        $(".iconShow").removeClass('rotateIcon');
                    }

                    if (sideBarDiv.hasClass("expand")) {
                        sideBarDiv.removeClass("expand");
                        sideBarDiv.attr("style", "");
                        $("#sideBarInnerWrapper").attr("style", "");
                    }
                } else if ($(window).width() > MOBILE_WIDTH) {
                    if (sideBarDiv.hasClass("hidden") || sideBarDiv.hasClass("shown")) {
                        sideBarDiv.removeClass("hidden");
                        sideBarDiv.removeClass("shown");
                        sideBarDiv.attr("style", "");
                        $("#sideBarWrapper").attr("style", "");
                        $("#sideBarInnerWrapper").attr("style", "");
                        $(".iconShow").removeClass('rotateIcon');
                    }
                    if (sideBarDiv.hasClass("hover")) {
                        slideMenuClosed();
                        sideBarDiv.removeClass("hover");
                    }
                }
            });

            /* Explanation of hover/click states.
             onhoverin:
             addClass hover
             if no expand -> slideIn
             //if expand, slideIn has fired, so do nothing.

             onhoverout:
             if expand -> slideOut, removeClass expand
             else if hover -> slideOut, removeClass hover

             onClick:
             if hover -> slideOut, removeClass hover
             else if expand -> slideOut, removeClass expand
             */

            //Click listener in charge of expanding sideBar on slideMenu button click.
            $("#slideMenu").stop().click(
                function () {
                    if (sideBarDiv.hasClass("hover")) {
                        slideMenuClosed();
                        sideBarDiv.removeClass("hover");
                        sideBarDiv.removeClass("expand");
                    } else if (sideBarDiv.hasClass("expand")) {
                        slideMenuClosed();
                        sideBarDiv.removeClass("expand");
                    } else if (sideBarDiv.hasClass("cover")) {
                        slideMenuClosed();
                        sideBarDiv.removeClass("cover");
                    } else {
                        sideBarDiv.addClass("expand");
                        //clearTimeout(slideMenuTimeout);
                        slideMenuOpen();
                    }
                }
            );

            $("#coverWindowButton").stop().click(
                function () {
                    if (sideBarDiv.hasClass("cover")) {
                        thisNavigator.closeCoverWindow();
                    } else {
                        thisNavigator.coverWindow();
                    }
                }
            );

            //Hover listener that expands/contracts sideBar.
            $("#sideBarWrapper").hover(
                //Hover In
                function () {
                    if ($(document).width() > MOBILE_WIDTH && !sideBarDiv.hasClass("expand") && !sideBarDiv.hasClass("cover")) {
                        //slideMenuTimeout = setTimeout(function(){
                        sideBarDiv.addClass("hover");
                        slideMenuOpen();
                        //}, 2000);
                    }
                },
                //Hover Out
                function () {
                    if ($(document).width() <= MOBILE_WIDTH) { return; }
                    if (sideBarDiv.hasClass("expand")) {
                        slideMenuClosed();
                        sideBarDiv.removeClass("expand");
                    }
                    if (sideBarDiv.hasClass("hover")) {
                        //TODO: Fix redundancy
                        slideMenuClosed();
                        sideBarDiv.removeClass("hover");
                        //sideBarDiv.removeClass("expand");
                    }
                }
            );

            //General function that toggles menu up, out of view.
            //TODO: Get rotation to work on default android 2.3 browser http://jsfiddle.net/KrRsy/
            var toggleMenu = function () {
                $(".iconShow").toggleClass("rotateIcon");
                if (sideBarDiv.hasClass("hidden")) {
                    sideBarWrapperDiv.css('visibility', 'visible');
                    sideBarDiv.stop(false, true).animate(
                        {
                            top: 0
                        },
                        ANIMATION_SPEED
                    );
                    $("#sideBarInnerWrapper").data('jsp').reinitialise();
                    sideBarDiv.removeClass("hidden");
                    sideBarDiv.addClass("shown");
                } else {
                    var offset = -1 * (sideBarDiv.offset().top + sideBarDiv.outerHeight());
                    sideBarDiv.stop(false, true).animate(
                        {
                            top: offset
                        },
                        ANIMATION_SPEED,
                        function () {
                            $("#sideBarWrapper").css('visibility', 'hidden');
                        }
                    );
                    sideBarDiv.addClass("hidden");
                    sideBarDiv.removeClass("shown");
                }
            };

            //Click listener that toggles menu visibility.
            $("#showMenu").stop(true, false).click(
                function () {
                    toggleMenu();
                }
            );
        };

        var getBusiness = function (name, config) {
            //console.log("name: "+name);
            var roles = config.roles;
            var role;

            for (role in roles) {
                //console.log(roles[role]);
                if (roles[role].name === name) { return roles[role]; }
            }
            return null;
        };

        var initPopup = function (config) {
            //var popup = new Popup(config, ".navElement");

            $("#navClient").popup({
                id: "navClient",
                title: config.name,
                contents: [
                    {"name": "Settings", url: config.settingsUrl},
                    {"name": "Change Business", id: "changeBusiness"},
                    {"name": "Log Out", url: config.logOutUrl}
                ]
            });

            var changeBusinessMenu = {
                id: "changeBusiness",
                title: "Businesses",
                contents: config.roles
            };
            $("#navClient").popup('addMenu', changeBusinessMenu);

            /*$("#logo").popup({
             id: "logo",
             title: "Test Menu",
             contents: [
             {"name": "Testing long menu names..............", url: config.settingsUrl},
             {"name": "Test 1", id: "test1"},
             {"name": "Log Out", url: ""}
             ]
             });
             $("#logo").popup('addMenu',{
             id:"test1",
             title: "Testing 1",
             contents:
             [
             {"name": "Test a"},
             {"name": "Test b"},
             {"name": "Test c"}
             ]
             });*/

            $(document).on("popup.created", function () {
                $("#popupContentWrapper").jScrollPane({
                    horizontalGutter: 0,
                    verticalGutter: 0,
                    'showArrows': false
                });
            });

            $(document).on('popup.setContent popup.visible popup.resize', function (e) {
                $("#popupContentWrapper").data('jsp').reinitialise();
            });

            $(document).on("popupEvent", function (e, data) {
                //console.log(data);
                if (($(data).attr("id") === "navClient") && config.roles.length <= 1) {
                    $("#changeBusiness").css("display", "none");
                }
                var name = $(data).text();
                var role = getRole(config.roles, name);
                if (role !== null) {
                    $(e.target).trigger("roleSelected", role);
                }

                //TODO: Make a getAction method for popup which does the same thing?
                if ($("#popup").children("#currentPopupAction").text() === "changeBusiness") {
                    thisNavigator.changeBusiness($(e.target), config);
                }
            });
        };

        /* Public Functions */
        this.changeBusiness = function (clicked, config) {
            //var businessId = clicked.attr("id");
            var name = clicked.text();
            var business = getBusiness(name, config);
            if (business === null) {
                console.log("Business not found!");
                return;
            }
            thisNavigator.changeBusinessLogo(business.businessLogoUrl);
            setSideBarSections(config, business.sections);
            $("#sideBarInnerWrapper").data('jsp').reinitialise();
        };

        this.changeAvatar = function (imgLoc) {
            $(".profile").attr('src', imgLoc);
        };

        this.changeBusinessLogo = function (businessLogoUrl) {
            var businessLogoEnabled = true;

            if (typeof (businessLogoUrl) === 'undefined') {
                businessLogoEnabled = false;
                businessLogoUrl = "";
            }
            var clientLogoDiv = $("#clientLogo");
            clientLogoDiv.attr('src', businessLogoUrl);

            //Hide business logo if undefined.
            var navClientIconDiv = $("#navClient .navIcon");
            if (!businessLogoEnabled) {
                navClientIconDiv.css("border", "0");
                clientLogoDiv.css("display", "none");
            } else {
                navClientIconDiv.css("border", "");
                clientLogoDiv.css("display", "");
            }
            // console.log("Logo: " + businessLogoUrl);
        };

        this.closePopup = function () {
            $("#navClient").popup('closePopup');
        };

        this.hideSearch = function () {
            $("#navSearch").hide();
        };

        this.showSearch = function () {
            $("#navSearch").show();
        };

        this.coverWindow = function () {
            var sideBarDiv = $("#sideBar");
            sideBarDiv.removeClass("hover");
            sideBarDiv.removeClass("expand");
            $("#sideBarWrapper")
                .stop(false, true)
                .animate({width: '100%'}, ANIMATION_SPEED);
            $("#sideBarInnerWrapper, #sideBarWrapper .jspContainer, #sideBar")
                .stop(false, true)
                .animate({width: SIDEBAR_WIDTH_EXPANDED}, ANIMATION_SPEED);
            sideBarDiv.addClass("cover");
            $(".iconExpand").addClass("flip");
        };

        this.closeCoverWindow = function () {
            slideMenuClosed();
            $("#sideBar").removeClass("cover");
            $(".iconExpand").removeClass("flip");
        };

        /* Initialization */
        initTopNav(config);
        initSideBar(config);
        initPopup(config);
    }

    return Navigator;
});