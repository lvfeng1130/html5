// Copyright 2012 FoundOPS LLC. All Rights Reserved.

/**
 * @fileoverview Class to hold developer specific settings.
 */

"use strict";

define(function () {
    var developer = {};
    /**
     * Enum for the data source.
     * LOCAL: load data from JSON files in the application's directory. Works for both Android & Browser Debugging. TODO: Implement this mode.
     * LOCALAPI: load data from the local api server.
     * ANDROIDLA: debug in Android Emulator using the local api server.
     * LIVE: load from the main server. TODO: Implement this mode.
     * @enum {number}
     */
    developer.DataSource = {
        LOCAL: 0,
        LOCALAPI: 1,
        ANDROIDLA: 2,
        LIVE: 3
    };

    /**
     * Enum for the map's frame.
     * SILVERLIGHT: The map is loaded inside the silverlight app.
     * BROWSER: The map is loaded directly from a browser.
     * @enum {number}
     */
    developer.Frame = {
        SILVERLIGHT: 0,
        BROWSER: 1
    };

    /**
     * The current web service source.
     * @type {developer.DataSource}
     */
    developer.CURRENT_DATA_SOURCE = developer.DataSource.LOCALAPI;

    /**
     * The current web service source.
     * @type {developer.Frame}
     */
    developer.CURRENT_FRAME = developer.Frame.SILVERLIGHT;

    /**
     * The local server's RoleId for GotGrease.
     * @type {string}
     */
    developer.GOTGREASE_ROLE_ID = '3959D9BF-66EA-41FD-90F2-7AD58A18DF2A';

    return developer;
});