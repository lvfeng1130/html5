// Copyright 2012 FoundOPS LLC. All Rights Reserved.

/**
 * @fileoverview Class to hold general tools. This will be split up as it grows and the divisions become obvious.
 */

"use strict";

define(['jquery', "developer", "tools/dateTools", 'moment'], function ($, developer, dateTools) {
    var generalTools = {};

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

    generalTools.deepClone = function(obj){
        return JSON.parse(JSON.stringify(obj));
    };

    //disable the save and cancel buttons
    generalTools.disableButtons = function (page) {
        $(page + " .cancelBtn").attr("disabled", "disabled");
        $(page + " .saveBtn").attr("disabled", "disabled");
    };

    //enable the save and cancel buttons
    generalTools.enableButtons = function (page) {
        $(page + " .cancelBtn").removeAttr("disabled");
        $(page + " .saveBtn").removeAttr("disabled");
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
        if (!contactInfo[0]) {
            return "";
        }

        var contactData = "";
        if (contactInfo[0].Data) {
            contactData = contactInfo[0].Data.replace("http://", "");
            contactData = contactData.replace("https://", "");
            contactData += " ";
        }

        var contactLabel = "";
        if (contactInfo[0].Label) {
            contactLabel = "(" + contactInfo[0].Label + ")";
        }

        var contactString = contactData + contactLabel;

        //add text to the end to show haow many more sets of contact info there are (ex. "+ 3 more")
        if (contactInfo.length > 1) {
            contactString = contactString.concat(" +", contactInfo.length - 1, " more");
        }
        return contactString;
    };

    //create a display string from a location object
    generalTools.getLocationDisplayString = function (location) {
        if (!location) {
            return "";
        }
        var lineOne = location.AddressLineOne ? location.AddressLineOne + " " : "";
        var lineTwo = location.AddressLineTwo ? location.AddressLineTwo + ", " : "";
        var adminDistrictTwo = location.AdminDistrictTwo ? location.AdminDistrictTwo + ", " : "";
        var adminDistrictOne = location.AdminDistrictOne ? location.AdminDistrictOne + " " : "";
        var postalCode = location.PostalCode ? location.PostalCode : "";
        //display any parts of the location that exist
        return lineOne + lineTwo + adminDistrictTwo + adminDistrictOne + postalCode;
    };

    //create a display string from a repeat object
    generalTools.getRepeatString = function (repeat) {
        if (!repeat) {
            return "";
        }
        //use the frequency int to get the frequency name(ex. 2 -> "Day")
        var frequencyName = generalTools.repeatFrequencies[repeat.Frequency];

        if (repeat.Frequency >= 2 && repeat.RepeatEveryTimes === 1) {
            //ex. "weekly"
            if (repeat.Frequency === 2) {
                frequencyName = "Daily";
            } else {
                frequencyName = frequencyName + "ly";
            }
        //if frequency is not daily
        } else if (repeat.Frequency > 1 && repeat.RepeatEveryTimes > 1) {
            //ex. "Every 3 months"
            frequencyName = "Every " + repeat.RepeatEveryTimes.toString() + " " + frequencyName.charAt(0).toLowerCase() + frequencyName.slice(1) + "s ";
        } else {
            return "";
        }

        //TODO: make monthly frequency detail separate function

        var frequencyDetail = "";
        var weeklyDetail = repeat.FrequencyDetailAsWeeklyFrequencyDetail;
        var startDate = dateTools.parseDate(repeat.StartDate);

        //if monthly
        if (repeat.FrequencyDetailAsMonthlyFrequencyDetail) {
            frequencyDetail = generalTools.getFrequencyDetailString(repeat.FrequencyDetailInt, startDate, false);
        } else if (weeklyDetail[0]) {
            for (var d in weeklyDetail) {
                frequencyDetail = frequencyDetail += dateTools.days[weeklyDetail[d]].substring(0, 3) + ", ";
            }
            var stringToRemove = /,\s$/;
            frequencyDetail = "on " + frequencyDetail.replace(stringToRemove, "");
        }

        return frequencyName + " " + frequencyDetail;
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
        if (!startDate.getDate) {
            date = dateTools.parseDate(startDate);
        }
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

    generalTools.goToExternalUrl = function(url) {
        var androidDevice = developer.CURRENT_FRAME === developer.Frame.MOBILE_APP && kendo.support.detectOS(navigator.userAgent).device === "android";
        if (url.substr(0, 7) !== "http://" && url.substr(0, 8) !== "https://") {
            url = "http://" + url;
        }
        if (androidDevice) {
            window.plugins.childBrowser.showWebPage(url);
        } else {
            window.open(url, "_blank");
        }
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

    generalTools.repeatFrequencies = [
        "",
        "",
        "Day",
        "Week",
        "Month",
        "Year"
    ];

    /**
     * Resize an image using the proper ratio to have no dimension larger than maxSize
     * Then center the image based on the parent container's width
     * @param element The jQuery element selector
     * @param {number} maxSize
     * @param {number} containerWidth
     */
    generalTools.resizeImage = function (element, maxSize, containerWidth) {
        //get the original dimensions of the image
        var width = element[0].width;
        var height = element[0].height;
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
        //center the image
        var margin = (containerWidth - newW) / 2;
        element.css("marginLeft", margin + "px");
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

    /**
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

    return generalTools;
});