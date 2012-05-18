// Copyright 2012 FoundOPS LLC. All Rights Reserved.

/**
 * @fileoverview Class to hold developer specific code.
 */

goog.provide('ops.developer');

goog.require('ops.Guid');

/**
 * Enum for the service mode.
 * LOCAL: load data from JSON files in the application's directory. Works for both Android & Browser Debugging. TODO: Implement this mode.
 * LOCALAPI: load data from the local api server.
 * ANDROIDLA: debug in Android Emulator using the local api server.
 * LIVE: load from the main server. TODO: Implement this mode.
 * @type {String}
 * @enum {number}
 */
ops.developer.Mode = {
    LOCAL:0,
    LOCALAPI:1,
    ANDROIDLA:2,
    LIVE:3
};

/*
 * The current development mode.
 * @const
 * @type {ops.developer.Mode}
 */
ops.developer.CURRENT_MODE = ops.developer.Mode.LOCALAPI;

/**
 * The local server's RoleId for GotGrease
 * @const
 * @type {ops.Guid}
 */
ops.developer.GOTGREASE_ROLE_ID = new ops.Guid('46FE8E80-F9A4-45D6-A4DE-592F1A06E0CC');