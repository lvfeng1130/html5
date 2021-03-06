// Copyright 2012 FoundOPS LLC. All Rights Reserved.

/**
 * @fileoverview Class to hold general tools. This will be split up as it grows and the divisions become obvious.
 */

"use strict";

define(["developer", 'tools/dateTools'], function (developer, dateTools) {
    var generalTools = {};
    window.generalTools = generalTools;

    $.fn.delayKeyup = function (callback, ms) {
        var timer = 0;
        var el = $(this);
        $(this).keyup(function () {
            clearTimeout(timer);
            timer = setTimeout(function () {
                callback(el);
            }, ms);
        });
        return $(this);
    };

    generalTools.deepClone = function (obj) {
        return JSON.parse(JSON.stringify(obj));
    };

    //disable the save and cancel buttons
    generalTools.disableButtons = function (page) {
        $(page + " .saveBtn").attr("disabled", "disabled");
    };

    //enable the save and cancel buttons
    generalTools.enableButtons = function (page) {
        $(page + " .saveBtn").removeAttr("disabled");
    };

    /**
     * Finds the index based on a filter function
     * @param collection
     * @param filter {Function([element], [index], [collection]}
     * @return {Number} The index
     */
    generalTools.findIndex = function (collection, filter) {
        for (var i = 0; i < filter.length; i++) {
            if (filter(collection[i], i, collection)) {
                return i;
            }
        }
        return -1;
    };

    generalTools.frequencyDetail = {
        OnDayInMonth: 8, //Ex. The 3rd of the month. Cannot be greater than 28 days
        LastOfMonth: 10, //Example Febuary 28th
        FirstOfDayOfWeekInMonth: 11, //Ex. First Monday
        SecondOfDayOfWeekInMonth: 12, //Ex. Second Monday
        ThirdOfDayOfWeekInMonth: 13, //Ex. Third Monday
        LastOfDayOfWeekInMonth: 14 //Ex. Last Monday
    };

    generalTools.getContactInfoDisplayString = function (contactInfo) {
        //check if there's no contact info
        if (!contactInfo[0]) {
            return "";
        }

        var contactData = "";
        //add the data string if it exists
        if (contactInfo[0].Data) {
            //remove the "http://" or "https://" from the beginning if it's a link
            contactData = contactInfo[0].Data.replace("http://", "");
            contactData = contactData.replace("https://", "");
            contactData += " ";
        }

        var contactLabel = "";
        //add the label if it exists
        if (contactInfo[0].Label) {
            contactLabel = "(" + contactInfo[0].Label + ")";
        }

        var contactString = contactData + contactLabel;

        //add text to the end to show how many more sets of contact info there are (ex. "+ 3 more")
        if (contactInfo.length > 1) {
            contactString = contactString.concat(" +", contactInfo.length - 1, " more");
        }
        return contactString;
    };

    //create a display string from a location object
    generalTools.getLocationDisplayString = function (location, includeName) {
        if (!location) {
            return "";
        }
        var lineOne = location.AddressLineOne ? location.AddressLineOne : "";
        var lineTwo = location.AddressLineTwo ? location.AddressLineTwo : "";

        var adminDistrictTwo = location.AdminDistrictTwo ? location.AdminDistrictTwo + ", " : "";
        var adminDistrictOne = location.AdminDistrictOne && location.AdminDistrictOne !== "Select a State" ? location.AdminDistrictOne : "";
        var postalCode = location.PostalCode ? location.PostalCode : "";
        //display any parts of the location that exist
        var displayString = "";

        if (includeName) {
            //put the name on a separate line above the address
            displayString = location.Name ? location.Name + "<br/>\n" : "";
        }

        displayString += lineOne;

        if (lineOne != "" && lineTwo != "") {
            displayString += ", ";
        }

        displayString += lineTwo;

        if (displayString !== "") {
            //if name should be included, but there is no name(i.e. there are 2 lines available), put the second half of the address on the next line
            if (includeName && (location.Name == null || location.Name == "")) {
                displayString += "<br/>\n";
            } else {
                displayString += ", ";
            }
        }

        displayString += adminDistrictTwo + adminDistrictOne;

        //if location is not in US, show country code
        if (location.CountryCode !== "US") {
            //add a comma if neccesary
            if (displayString !== "") {
                displayString += ", ";
            }
            displayString += location.CountryCode + " ";
        } else {
            displayString += " ";
        }

        displayString += postalCode;

        if (displayString !== "") {
            return displayString;
        } else if (displayString === "Manually Place Pin") {
            return "";
        } else {
            return location.Latitude + ", " + location.Longitude;
        }
    };

    /**
     * Creates the string for monthly frequency detail
     * @param {number} detailInt
     * @param startDate
     * @param {boolean} beginWithCapital If the first character "O" should be capitalized
     * @return {String}
     */
    generalTools.getFrequencyDetailString = function (detailInt, startDate, beginWithCapital) {
        var frequencyDetail = "", date = startDate;
        //if date is a string, change it to a date object
        if (!startDate.getDate) {
            date = dateTools.parseDate(startDate);
        }
        //create a string based on the frequencyDetail (ex. "on the 2nd Wednesday")
        if (detailInt === generalTools.frequencyDetail.OnDayInMonth || detailInt === generalTools.frequencyDetail.LastOfMonth) {
            frequencyDetail = "on the " + dateTools.getDateWithSuffix(date);
        } else if (detailInt === generalTools.frequencyDetail.FirstOfDayOfWeekInMonth) {
            frequencyDetail = "on the 1st " + dateTools.days[date.getDay()];
        } else if (detailInt === generalTools.frequencyDetail.SecondOfDayOfWeekInMonth) {
            frequencyDetail = "on the 2nd " + dateTools.days[date.getDay()];
        } else if (detailInt === generalTools.frequencyDetail.ThirdOfDayOfWeekInMonth) {
            frequencyDetail = "on the 3rd " + dateTools.days[date.getDay()];
        } else if (detailInt === generalTools.frequencyDetail.LastOfDayOfWeekInMonth) {
            frequencyDetail = "on the last " + dateTools.days[date.getDay()];
        }
        //optionally capitalize the "O" in "on"
        if (beginWithCapital) {
            frequencyDetail = frequencyDetail.charAt(0).toUpperCase() + frequencyDetail.slice(1);
        }
        return frequencyDetail;
    };

    /**
     * Generates a compass direction from rotation degrees.
     * Example: NW, or NNW.
     *
     * @param {number} deg The degree.
     * @return {string} The direction.
     */
    generalTools.getDirection = function (deg) {
        if (deg == "") {
            return "";
        }

        // account for negative degrees, make the deg absolute
        deg = Math.abs(deg);

        // account for values above 360
        deg = deg % 360;

        var dir;
        if ((deg >= 0 && deg <= 11.25) || (deg > 348.75 && deg <= 360)) {
            dir = "N";
        } else if (deg > 11.25 && deg <= 33.75) {
            dir = "NNE";
        } else if (deg > 33.75 && deg <= 56.25) {
            dir = "NE";
        } else if (deg > 56.25 && deg <= 78.75) {
            dir = "ENE";
        } else if (deg > 78.75 && deg <= 101.25) {
            dir = "E";
        } else if (deg > 101.25 && deg <= 123.75) {
            dir = "ESE";
        } else if (deg > 123.75 && deg <= 146.25) {
            dir = "SE";
        } else if (deg > 146.25 && deg <= 168.75) {
            dir = "SSE";
        } else if (deg > 168.75 && deg <= 191.25) {
            dir = "S";
        } else if (deg > 191.25 && deg <= 213.75) {
            dir = "SSW";
        } else if (deg > 213.75 && deg <= 236.25) {
            dir = "SW";
        } else if (deg > 236.25 && deg <= 258.75) {
            dir = "WSW";
        } else if (deg > 258.75 && deg <= 281.25) {
            dir = "W";
        } else if (deg > 281.25 && deg <= 303.75) {
            dir = "WNW";
        } else if (deg > 303.75 && deg <= 326.25) {
            dir = "NW";
        } else { //deg > 326.25 && deg <= 348.75
            dir = "NNW";
        }
        return dir;
    };

    /**
     * Create a new unique Guid.
     * @return {string}
     */
    generalTools.newGuid = function () {
        var newGuidString = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        return newGuidString;
    };

    /**
     * This associates keys with an array of values.
     * It stores the associations/will always return the same value for a key.
     * The values are associated when they are retrieved in order of the next item in the values array.
     * @param {Array.<Object>} values The values to associate with keys.
     * @constructor
     */
    generalTools.ValueSelector = function ValueSelector(values) {
        /**
         * The values to retrieve for keys.
         * @private
         */
        this.values = values;

        this.keysCache = [];
    };

    //frequency names to be used in repeat string generation(first two blank because null and "Once" are not used)
    generalTools.repeatFrequencies = [
        "",
        "",
        "Day",
        "Week",
        "Month",
        "Year"
    ];

    /*
     * Gets the value for a key.
     * @param {Object} key The key to retrieve.
     * @return {Object} The value for a value.
     */
    generalTools.ValueSelector.prototype.getValue = function (key) {
        //find the index of the key
        var index = _.indexOf(this.keysCache, key);

        //if the key was not found, add it to keysCache
        if (index === -1) {
            this.keysCache.push(key);
            index = this.keysCache.length - 1;
        }

        //the index of the value will be the index of the key % values.count()
        var valueIndex = index % this.values.length;
        return this.values[valueIndex];
    };

    /**
     * Resize an image using the proper ratio to have no dimension larger than maxSize
     * Then center the image based on the parent container's width
     * @param element The jQuery element selector
     * @param {number} maxSize
     */
    generalTools.resizeImage = function (element, maxSize) {
        //get the original dimensions of the image
        var width = element[0].naturalWidth;
        var height = element[0].naturalHeight;
        //get the ratio for each dimension
        var w = maxSize / width;
        var h = maxSize / height;
        //find the lowest ratio(will be the shortest dimension)
        var ratio = Math.min(w, h);
        //use the ratio to set the new dimensions
        var newW = ratio * width;
        var newH = ratio * height;

        //set the final sizes
        element.css("width", newW + "px");
        element.css("height", newH + "px");
    };

    generalTools.hexToRGB = function (Hex) {
        var Long = parseInt(Hex.replace(/^#/, ""), 16);
        return {
            R: (Long >>> 16) & 0xff,
            G: (Long >>> 8) & 0xff,
            B: Long & 0xff
        };
    };

    $.fn.delayKeyup = function (callback, ms) {
        var timer = 0;
        var el = $(this);
        $(this).keyup(function () {
            clearTimeout(timer);
            timer = setTimeout(function () {
                callback(el);
            }, ms);
        });
        return $(this);
    };

    /**
     * watches all input elements in the given div for value change
     * @param {string} element the selector to observe ex: "#personalSettings input" or "#contactInfo #value"
     * @param callback
     * @param [delay] Defaults to 1000 milliseconds
     */
    generalTools.observeInput = function (element, callback, delay) {
        if (!delay) {
            delay = 1000;
        }

        element.each(function () {
            // Save current value of element
            $(this).data('oldVal', $(this).val());
            // Look for changes in the value
            $(this).delayKeyup(function (e) {
                // If value has changed...
                if (e.data('oldVal') !== e.val()) {
                    // Updated stored value
                    e.data('oldVal', e.val());
                    //call the callback function
                    if (callback)
                        callback(e.val());
                }
            }, delay);
        });
    };

    generalTools.checkPlatform = {
        isAndroid: function () {
            return platform.os.family === "Android";
        },
        isiOS: function () {
            return platform.product === "iPhone" || platform.product === "iPod" || platform.product === "iPad";
        },
        isCordova: function () {
            return (window.cordova ? true : false);
        }
    }

    generalTools.getDirections = function (location) {
        var navigateQuery;

        //check if there is a usable address
        if (location.AddressLineOne && location.AdminDistrictOne && location.AdminDistrictTwo) {
            //replace spaces with "+" to format for search query
            var lineOneFormatted = location.AddressLineOne.replace(/\s/g, "+");
            var adminDistrictTwoFormatted = location.AdminDistrictTwo.replace(/\s/g, "+");
            var adminDistrictOneFormatted = location.AdminDistrictOne.replace(/\s/g, "+");
            navigateQuery = lineOneFormatted + ',+' + adminDistrictTwoFormatted + ',+' + adminDistrictOneFormatted + '&z=13&ll=' + location.Latitude + ',' + location.Longitude;
            //if not, use the latitude and longitude
        } else {
            navigateQuery = location.Latitude + ',+' + location.Longitude + '&z=13&ll=' + location.Latitude + ',' + location.Longitude;
        }

        //get the user's location
        navigator.geolocation.getCurrentPosition(function (position) {
            // If geolocation is successful get directions to the location from current position.
            generalTools.openUrl("http://maps.google.com/maps?saddr=" + position.coords.latitude + "," + position.coords.longitude + "&daddr=" + navigateQuery);
        }, function () {
            // If geolocation is NOT successful just show the location.
            generalTools.openUrl("http://maps.google.com/maps?q=" + navigateQuery);
        }, {timeout: 10000, enableHighAccuracy: true});
    };

    /**
     * Attempt to call
     * @param number
     */
    generalTools.call = function (number) {
        //strip only numbers
        number = number.match(/\d+/g).join("");

        window.location.href = "tel:" + number;

        //TODO in cordova use phone function? Maybe it will be better
    };

    /**
     * Opens an email link
     * @param address The email address
     */
    generalTools.email = function (address) {
        window.open("mailto:" + address, "_self");
    };

    /**
     * Opens a url in a new tab / window
     * @param url The url to open
     */
    generalTools.openUrl = function (url) {
        if (url.substr(0, 7) !== "http://" && url.substr(0, 8) !== "https://") {
            url = "http://" + url;
        }

        if (generalTools.checkPlatform.isAndroid() && generalTools.checkPlatform.isCordova()) {
            window.plugins.childBrowser.showWebPage(url);
        } else {
            window.open(url, "_blank");
        }
    };

    return generalTools;
});