"use strict";

define(["jquery", "ui/popup", "lib/jquery.mousewheel", "lib/jquery.jScrollPane", "lib/kendo.all"], function ($, Popup) {
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
    var config = null;

    function Navigator(conf) {
        config = conf;
        var thisNavigator = this;
        initTopNav(config);
        initSideBar(config);
        this.popup = initPopup(config);
        this.closePopup = this.popup.closePopup;
    }

    /** Initializes top navigation **/
    var initTopNav = function (config) {
        var topNav = $(document.createElement('div'));
        topNav.attr('id', 'nav');

        var navTemplateHtml = $("#navTemplate").html();
        var navTemplate = kendo.template(navTemplateHtml);

        var businessLogoEnabled = true;
        var businessLogoUrl = config.roles[0].businessLogoUrl;

        //TODO: Just call changeBusinessLogo after template init to simplify redundant code?
        if (typeof(businessLogoUrl) === 'undefined') {
            businessLogoEnabled = false;
            businessLogoUrl = "";
        }

        var params = [config.avatarUrl, businessLogoUrl];
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

        Navigator.prototype.hideSearch = function () {
            $("#navSearch").hide();
        };

        Navigator.prototype.showSearch = function () {
            $("#navSearch").show();
        };
    };

    /** Initializes scrollbar for sidebar navigation **/
    var initSideBarScrollBar = function () {
        var sideBarWrapperDiv = $("#sideBarWrapper");
        sideBarWrapperDiv.jScrollPane({
            horizontalGutter: 0,
            verticalGutter: 0,
            verticalDragMinHeight: 25,
            'showArrows': false
        });

        var sideBarScrollBar = sideBarWrapperDiv.data('jsp');
        //From jScrollPane examples: http://jscrollpane.kelvinluck.com/dynamic_height.html
        var throttleTimeout;
        $(window).bind('resize', function () {
                if ($.browser.msie) {
                    if (!throttleTimeout) {
                        throttleTimeout = setTimeout(
                            function () {
                                sideBarScrollBar.reinitialise();
                                throttleTimeout = null;
                            }, 50
                        );
                    }
                } else {
                    sideBarScrollBar.reinitialise();
                }
            }
        );
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
        //initialize the sections on the sidebar
        //TODO: Take a look at this again.
        for (section in availableSections) {
            //console.log(availableSections[section]);
            var currentSection = getSection(config.sections, availableSections[section]);//config.sections[section];
            var href = "";
            if (typeof(currentSection.url) !== 'undefined') {
                href = "href='" + currentSection.url + "'";
            }
            var name = currentSection.name;
            var color = currentSection.color;
            var iconUrl = currentSection.iconUrl;
            var hoverIconUrl = currentSection.hoverIconUrl;
            //TODO: Implement sprite selection.
            $('<img/>').src = hoverIconUrl;//toHoverImage(iconUrl);
            //Default values unless sprite.
            var bgX = 'center';
            var bgY = 'center';

            var sideBarElementTemplateHtml = $("#sideBarElementTemplate").html();
            var sideBarElementTemplate = kendo.template(sideBarElementTemplateHtml);
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
            "touchend mouseleave mouseup": function () {
                $(this).stop(true, true).removeClass($(this).attr('data-color'));
                var image = $(this).attr("data-iconUrl");//getSection(config.sections, $(this).find(".sectionName").html()).iconUrl;//$(this).find(".icon:first").css('background-image').replace(/^url|[\(\)]/g, '');
                //image = image.replace('Color.', '.');
                $(this).find(".icon").css('background-image', 'url(' + image + ')');
            },
            "click": function () {
                var name = $(this).find(".sectionName:first").html();
                var section = getSection(config.sections, name);
                $(this).trigger("sectionSelected", section);
            }
        });
    };

    /** Initializes sidebar navigation **/
    var initSideBar = function (config) {
        //TODO: Error checking?
        var slideMenuTimeout = null;
        var sections = config.sections;

        //setup the sidebar wrapper (for the scrollbar)
        var sBarWrapper = $(document.createElement('div'));
        sBarWrapper.attr('id', 'sideBarWrapper');

        //setup the sidebar (the place for buttons)
        var sBar = $(document.createElement('div'));
        sBar.attr('id', 'sideBar');

        //extract the template from the html
        var expandTemplateHtml = $("#expandTemplate").html();
        var expandTemplate = kendo.template(expandTemplateHtml);
        sBar.html(expandTemplate);
        sBar.append("<div id='sideBarSections'></div>");
        sBarWrapper.append(sBar);
        $('#nav').after(sBarWrapper);

        setSideBarSections(config, config.roles[0].sections);

        //Add showMenuSpan to topNav.
        var showMenuTemplateHtml = $("#showMenuTemplate").html();
        var showMenuTemplate = kendo.template(showMenuTemplateHtml);
        $('#navContainer').after(showMenuTemplate);

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
            if (sideBarLen === 0 && showMenuLen === 0 && !$("#sideBar").hasClass("hidden") && $(document).width() <= 800) {
                toggleMenu();
            }

            var sideBarWrapperLen = clicked.parents("#sideBarWrapper").length + clicked.is("#sideBarWrapper") ? 1 : 0;
            //Detects clicks outside of the sideBar when expanded.
            var slideMenuLen = clicked.parents("#slideMenu").length + clicked.is("#slideMenu") ? 1 : 0;
            if (sideBarWrapperLen === 0 && slideMenuLen === 0 && $("#sideBar").hasClass("expand") && $(document).width() > 800) {
                slideMenuClosed();
            }
        });

        //Listener for window resize to reset sideBar styles.
        $(window).resize(function () {
            if ($(window).width() <= 800) {
                sideBarDiv.css("width", "");
                sideBarDiv.removeClass("hover");
                if (sideBarDiv.hasClass("expand")) {
                    sideBarDiv.removeClass("expand");
                    sideBarDiv.attr("style", "");
                    $("#sideBarWrapper").attr("style", "");
                }
                if (!sideBarDiv.hasClass("hidden")) {
                    $(".iconShow").addClass('rotateIcon');
                }
            } else if ($(window).width() > 800) {
                if (sideBarDiv.hasClass("hidden")) {
                    sideBarDiv.removeClass("hidden");
                    sideBarDiv.attr("style", "");
                    $("#sideBarWrapper").attr("style", "");
                    //$(".iconShow").removeClass('rotateIcon');
                }
                if (sideBarDiv.hasClass("hover")) {
                    slideMenuClosed();
                    sideBarDiv.removeClass("hover");
                }
            }
        });

        var slideMenuOpen = function () {
            $("#sideBar, #sideBarWrapper, #sideBarWrapper .jspContainer")
                .stop(true, false)
                .animate({width: '159px'}, 'fast');
            $(".iconExpand").addClass("flip");
        };

        var slideMenuClosed = function () {
            //clearTimeout(slideMenuTimeout);
            $("#sideBar, #sideBarWrapper, #sideBarWrapper .jspContainer")
                .stop(true, false)
                .animate({width: '55px'}, 'fast');
            $(".iconExpand").removeClass("flip");
        };

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
                } else {
                    sideBarDiv.addClass("expand");
                    //clearTimeout(slideMenuTimeout);
                    slideMenuOpen();
                }
            }
        );

        //Hover listener that expands/contracts sideBar.
        $("#sideBarWrapper").hover(
            //Hover In
            function () {
                if ($(document).width() > 800 && !sideBarDiv.hasClass("expand")) {
                    //slideMenuTimeout = setTimeout(function(){
                    sideBarDiv.addClass("hover");
                    slideMenuOpen();
                    //}, 2000);
                }
            },
            //Hover Out
            function () {
                if ($(document).width() <= 800)return;
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
            var offset = -1 * (sideBarDiv.offset().top + sideBarDiv.outerHeight());
            if (sideBarDiv.hasClass("hidden")) {
                sideBarWrapperDiv.css('display', 'inline-block');
                sideBarDiv.stop(false, true).animate(
                    {
                        top: 0
                    },
                    'fast'
                );
                $("#sideBarWrapper").data('jsp').reinitialise();
            } else {
                sideBarDiv.stop(false, true).animate(
                    {
                        top: offset
                    },
                    'fast',
                    function () {
                        $("#sideBarWrapper").css('display', 'none');
                    }
                );
            }
            sideBarDiv.toggleClass("hidden");
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
            if (roles[role].name === name)return roles[role];
        }
        return null;
    };

    var changeBusiness = function (clicked, config) {
        //var businessId = clicked.attr("id");
        var name = clicked.html();
        var business = getBusiness(name, config);
        if (business === null) {
            console.log("Business not found!");
            return;
        }
        changeBusinessLogo(business);
        setSideBarSections(config, business.sections);
        $("#sideBarWrapper").data('jsp').reinitialise();
    };

    var changeBusinessLogo = function (business) {
        var businessLogoUrl = business.businessLogoUrl;
        var businessLogoEnabled = true;

        if (typeof(businessLogoUrl) === 'undefined') {
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
        console.log("Logo: " + businessLogoUrl);
    };

    var initPopup = function (config) {
        var popup = new Popup(config, ".navElement");
        $(document).on("popupEvent", function (e, data) {
            //console.log(data);
            if (($(data).attr("id") === "navClient") && config.roles.length <= 1) {
                $("#changeBusiness").css("display", "none");
            }
            var name = $(data).html();
            var role = getRole(config.roles, name);
            if (role !== null) {
                $(e.target).trigger("roleSelected", role);
            }

            if (popup.getAction() === "changeBusiness") {
                changeBusiness($(e.target), config);
            }
        });

        return popup;
    };


    return Navigator;
});