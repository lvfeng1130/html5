// Copyright 2012 FoundOPS LLC. All Rights Reserved.

'use strict';

define(['tools'], function (tools) {
    var models = {};
    /**
     * Enum for device platforms.
     * @enum {string}
     */
    models.DevicePlatform = {
        ANDROID: "Android",
        BLACKBERRY: "BlackBerry",
        IPHONE: "iPhone",
        WEBOS: "webOS",
        WINCE: "WinCE",
        UNKNOWN: "Unknown"
    };

    /**
     * Enum for info types.
     * @enum {string}
     */
    models.InfoType = {
        PHONE: "Phone Number",
        EMAIL: "Email Address",
        FAX: "Fax Number",
        WEBSITE: "Website",
        OTHER: "Other"
    };

    /**
     * Creates a TrackPoint to send to the API server.
     * @param {Date} date
     * @param {} accuracy
     * @param heading
     * @param latitude
     * @param longitude
     * @param routeId
     * @param source
     * @param speed
     * @constructor
     */
    models.TrackPoint = function TrackPoint (accuracy, date, heading, latitude, longitude, routeId, source, speed) {
        this.Accuracy = accuracy;
        this.CollectedTimeStamp = tools.formatDate(date);
        this.Heading = heading;
        this.Latitude = latitude;
        this.Longitude = longitude;
        this.RouteId = routeId;
        this.Source = source;
        this.Speed = speed;
    };

    return models;
});



