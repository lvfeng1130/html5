// Copyright 2012 FoundOPS LLC. All Rights Reserved.

/**
 * @fileoverview Class to hold date tools
 */

"use strict";

define(['moment'], function () {
    var dateTools = {};

    /**
     * Checks whether the date (without the time) are equal.
     * Ignores UTC.  this is useful for choosing the client's
     * @param {Date} a
     * @param {Date} b
     * @param {Boolean} ignoreUtc If true it will compare the straight date and ignore utc
     * @return {Boolean}
     */
    dateTools.dateEqual = function (a, b, ignoreUtc) {
        if (!a && !b) {
            return true;
        } else if ((!a && b) || (a && !b)) {
            return false;
        }

        if (ignoreUtc) {
            return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
        }

        return a.getUTCDate() === b.getUTCDate() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
    };

    /**
     * This will return the date without the time
     * in a format consumable for the web api.
     * @param {Date} The date to format.
     * @param {toUtc} (Optional) If true, convert to UTC. Defaults to false.
     * @return {string} The date formatted in "m-dd-yyyy".
     */
    dateTools.stripDate = function (date, toUtc) {
        if (typeof date === "string") {
            date = moment(date).toDate();
        }
        var month, day, year;
        if (toUtc) {
            month = date.getUTCMonth() + 1;
            day = date.getUTCDate();
            year = date.getUTCFullYear();
        }
        else {
            month = date.getMonth() + 1;
            day = date.getDate();
            year = date.getFullYear();
        }
        return month + "-" + day + "-" + year;
    };

    dateTools.getLocalTimeZone = function () {
        var today = new Date().toString();

        var timezone, id;
        if (today.match(/Eastern/)) {
            timezone = "(UTC-05:00) Eastern Time (US & Canada)";
            id = "Eastern Standard Time";
        } else if (today.match(/Central/)) {
            timezone = "(UTC-06:00) Central Time (US & Canada)";
            id = "Central Standard Time";
        } else if (today.match(/Mountain/)) {
            timezone = "(UTC-07:00) Mountain Time (US & Canada)";
            id = "Mountain Standard Time";
        } else if (today.match(/Pacific/)) {
            timezone = "(UTC-08:00) Pacific Time (US & Canada)";
            id = "Pacific Standard Time";
        } else if (today.match(/Alaska/)) {
            timezone = "(UTC-09:00) Alaska";
            id = "Alaskan Standard Time";
        } else if (today.match(/Hawaii/)) {
            timezone = "(UTC-10:00) Hawaii";
            id = "Hawaiian Standard Time";
        }

        return {DisplayName: timezone, TimeZoneId: id};
    };

    return dateTools;
});