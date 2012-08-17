//region Copyright 2012 FoundOPS LLC. All Rights Reserved.

/**
 * @fileoverview Class to hold data services.
 */

'use strict';

define(["db/developer", "tools", "db/saveHistory"], function (developer, tools, saveHistory) {
    var services = {};

    $.support.cors = true;
    $.ajaxSetup({
        xhrFields: {
            withCredentials: true
        }
    });

    /**
     * Enum for loading statuses.
     * @enum {number}
     */
    services.Status = {
        LOADING: 0,
        LOADED: 1
    };

    var apiUrl;
    //setup the api url depending on the mode
    var mode = developer.CURRENT_DATA_SOURCE;
    if (mode === developer.DataSource.BROWSER_LOCALAPI) {
        apiUrl = 'http://localhost:9711/api/';
    } else if (mode === developer.DataSource.ANDROID_LOCALAPI) {
        apiUrl = 'http://10.0.2.2:9711/api/';
    } else if (mode === developer.DataSource.LIVE) {
        apiUrl = 'http://api.foundops.com/api/';
    } else if (mode === developer.DataSource.TESTAPI) {
        apiUrl = 'http://testapi.foundops.com/api/';
    }

    /**
     * The url for the API.
     * @type {string}
     * @const
     */
    services.API_URL = apiUrl;

    services.ROOT_API_URL = apiUrl.replace("api/", "");

    //functions to queue until after the role id is initially set
    var roleIdFunctionQueue = [];
    /**
     * Set the current RoleId.
     * @param {string} The roleId.
     */
    services.setRoleId = function (roleId) {
        services.RoleId = roleId;

        //invoke any function in the queue
        for (var i in roleIdFunctionQueue) {
            roleIdFunctionQueue[i]();
        }
        roleIdFunctionQueue.length = 0;
    };

    /**
     * Returns a standard http get.
     * @param {String} queryString The query string to use. Ex. "routes/GetDepots"
     * @param {Object.<string|Object>=}  opt_params The parameters to use (optional).
     * @param {boolean=} opt_excludeRoleId Do not include the roleId in the params (optional).
     * @param {?function(Object):Object} The converter function for a loaded item (optional).
     * @return {function(!function(Object))} A function to perform the get and invoke the callback.
     * @private
     */
    services._getHttp = function (queryString, opt_params, opt_excludeRoleId, opt_convertItem) {
        /**
         * A function to perform the get operation on the api (defined by the parameters above)
         * and invoke the callback with the loaded data.
         * @param {?function(Object)} callback A callback to pass the loaded data to.
         */
        var getThenInvokeCallback = function (callback) {
            var params = opt_params || {};

            var invokeAjax = function (params) {
                var url = services.API_URL + queryString;

                $.ajax({
                    //must use JSONP because the javascript may be hosted on a different url than the api
                    type: "GET",
                    dataType: 'JSONP',
                    url: url,
                    data: params
                }).success(function (response) {
                        var convertedData = response;

                        //if there is a converter, convert the data
                        if (opt_convertItem) {
                            convertedData = tools.convertArray(response, opt_convertItem);
                        }

                        //perform the callback function by passing the response data
                        if (callback !== null) {
                            callback(convertedData);
                        }
                    });
            };

            //if opt_excludeRoleId was not set add it as a parameter
            if (!opt_excludeRoleId) {
                //if the roleId is not loaded yet, add it to the roleId function queue
                if (!services.RoleId) {
                    roleIdFunctionQueue.push(function () {
                        params.roleId = services.RoleId.toString();
                        invokeAjax(params);
                    });
                    return;
                }

                params.roleId = services.RoleId.toString();
            }

            invokeAjax(params);
        };

        return getThenInvokeCallback;
    };

    //region Depots, Routes, TrackPoints

    /**
     * Get the service provider's depots.
     * @param {!function(Array.<Object>)} callback A callback to pass the loaded depots.
     */
    services.getDepots = services._getHttp('routes/GetDepots', {}, false);

    /**
     * Get resources (Employees/Vehicles) and their last recorded location.
     * @param {!function(Array.<Object>)} callback The callback to pass the resources with latest points after they are loaded.
     */
    services.getResourcesWithLatestPoints = services._getHttp('trackpoint/GetResourcesWithLatestPoints', {}, false);

    /**
     * Get the current service provider's Routes.
     * @param {string} serviceDateUtc The service date to get routes for (in Utc).
     * @param {!function(Array.<Object>)} callback A callback to pass the loaded routes to.
     */
    services.getRoutes = function (serviceDateUtc, callback) {
        return services._getHttp('routes/GetRoutes', {serviceDateUtc: serviceDateUtc}, false)(callback);
    };

    /**
     * Get the service provider's TrackPoints.
     * @param {string} serviceDate The service date to retrieve TrackPoints for (in Utc).
     * @param {string} routeId The Id of the route to retrieve TrackPoints for.
     * @param {!function(Array.<Object>)} callback The callback to pass the TrackPoints to after they are loaded.
     */
    services.getTrackPoints = function (serviceDateUtc, routeId, callback) {
        return services._getHttp('trackPoint/GetTrackPoints',
            {routeId: routeId, serviceDateUtc: serviceDateUtc}, false)(callback);
    };

    /**
     * Send trackPoint array to server and return success or failure to the callback
     * @param {Array.<models.TrackPoint>} trackPoints
     * @param routeId
     * @param callback
     */
    services.postTrackPoints = function (trackPoints, callback) {
        $.ajax({
            url: services.API_URL + "trackpoint/PostEmployeeTrackPoint",
            type: "POST",
            dataType: "json",
            contentType: 'application/json',
            data: JSON.stringify(trackPoints)
        }).success(function (response) {
                callback(response);
            });
    };

    //endregion

    //region

    services.getClientLocations = function (clientId, callback) {
        return services._getHttp("Locations/Get", {clientId: clientId})(callback);
    };

    //endregion

    //region Services

    /**
     * Get the list of services
     * @param roleId The role to get the services for
     */
    services.getServiceTypes = services._getHttp('service/GetServiceTypes', {}, false);

    /**
     * Get the service and its fields.
     * Need to pass the serviceId or the occurDate and the recurringServiceId.
     * @param {?string} serviceId
     * @param {?Date} serviceDate
     * @param {?string} recurringServiceId
     * @param {!function(Object)} callback The callback to pass the Service it is loaded.
     */
    services.getServiceDetails = function (serviceId, serviceDate, recurringServiceId, callback) {
        return services._getHttp('service/GetServiceDetails',
            {serviceId: serviceId, serviceDate: tools.formatDate(serviceDate), recurringServiceId: recurringServiceId}, false)(function (data) {
            //It will only have one item
            var service = data[0];
            services.convertServiceDates(service);
            callback(service);
        });
    };

    /**
     * Converts the service's Field's DateTime values to dates
     * @param service
     */
    services.convertServiceDates = function (service) {
        service.Date = new Date(service.Date);
        for (var i = 0; i < service.Fields.length; i++) {
            var field = service.Fields[i];
            if (field.Type === "DateTimeField") {
                field.Earliest = new Date(field.Earliest);
                field.Latest = new Date(field.Latest);
                field.Value = new Date(field.Value);
            }
        }
    };

    services.updateService = function (service) {
        return saveHistory.linkNotification(
            $.ajax({
                url: services.API_URL + "service/UpdateService",
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify(service)
            }));
    };

    services.deleteService = function (service) {
        $.ajax({
            url: services.API_URL + "service/DeleteService",
            type: "POST",
            dataType: "json",
            contentType: 'application/json',
            data: JSON.stringify(service)
        });
    };

    /**
     * Get the column config
     * @param roleId The role to get the columns for
     */
    services.getColumnConfigurations = services._getHttp('session/GetColumnConfigurations', {}, false);

    /**
     * Updates the column configurations for the current role (for the current user)
     * @param columnConfigurations
     */
    services.updateColumnConfigurations = function (columnConfigurations) {
        $.ajax({
            url: services.API_URL + "session/UpdateColumnConfigurations?roleId=" + services.RoleId,
            type: "POST",
            dataType: "json",
            contentType: 'application/json',
            data: JSON.stringify(columnConfigurations)
        });
    };

    //endregion

    //region Settings

    /**
     * Creates personal password(for initial login).
     * @param {string} newPass.
     * @param {string} confirmPass.
     */
    services.createPassword = function (newPass, confirmPass) {
        return saveHistory.linkNotification(
            $.ajax({
                url: services.API_URL + "settings/CreatePassword?newPass=" + newPass + "&confirmPass=" + confirmPass,
                type: "POST"
            })
        );
    };

    // Get Employees.
    services.getAllEmployeesForBusiness = services._getHttp('settings/GetAllEmployeesForBusiness', {}, false);

    /**
     * Get business settings
     * @param roleId The role to get the business settings for
     */
    services.getBusinessSettings = services._getHttp('settings/GetBusinessSettings', {}, false);

    /**
     * Get personal user settings.
     * @param {!function(Array.<Object>)} callback A callback to pass the loaded settings.
     */
    services.getPersonalSettings = services._getHttp('settings/GetPersonalSettings', {}, false);

    /**
     * Updates personal password.
     * @param {string} oldPass.
     * @param {string} newPass.
     * @param {string} confirmPass.
     */
    services.updatePassword = function (oldPass, newPass, confirmPass) {
        return saveHistory.linkNotification(
            $.ajax({
                url: services.API_URL + "settings/UpdatePassword?oldPass=" + oldPass + "&newPass=" + newPass + "&confirmPass=" + confirmPass,
                type: "POST"
            })
        );
    };

    /**
     * Get business settings
     * @param roleId The role to get the business settings for
     */
    services.getBusinessSettings = services._getHttp('settings/GetBusinessSettings', {}, false);

    /**
     * Updates businesssettings.
     * @param {(Array.<Object>)} settings The updated settings.
     */
    services.updateBusinessSettings = function (settings) {
        return saveHistory.linkNotification(
            $.ajax({
                url: services.API_URL + "settings/UpdateBusinessSettings?roleId=" + services.RoleId,
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify(settings)
            }));
    };

    /**
     * Updates personal user settings.
     * @param {!function(Array.<Object>)} settings The loaded settings.
     */
    services.updatePersonalSettings = function (settings) {
        return saveHistory.linkNotification(
            $.ajax({
                url: services.API_URL + "settings/UpdatePersonalSettings?roleId=" + services.RoleId,
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify(settings)
            }));
    };

    services.getTimeZones = services._getHttp('settings/GetTimeZones', {}, false);

    //endregion

    //region Tasks

    /**
     * Get the statuses assigned to a route's task.
     * @param callback
     */
    services.getTaskStatuses = services._getHttp("TaskStatuses/GetStatuses");

    services.updateRouteTask = function (task) {
        return saveHistory.linkNotification(
            $.ajax({
                url: services.API_URL + "routes/UpdateRouteTask",
                type: "POST",
                dataType: "json",
                contentType: 'application/json',
                data: JSON.stringify(task)
            })
        );
    };

    //endregion

    //region User

    /**
     * Authenticate the user.
     * @param {!string} email
     * @param {!string} password
     * @param {!function(boolean)} callback The callback to pass true (success) or false (failed) to after attempting to authenticate the credentials.
     */
    services.authenticate = function (email, password, callback) {
        return services._getHttp('session/Login', {email: email, pass: password}, true, null)(callback);
    };

    /**
     * Get the current session for the user
     */
    services.getSession = services._getHttp('session/Get', {}, true);

    services.logout = function (callback) {
        return services._getHttp('session/LogOut')(callback);
    };

    //endregion

    services.trackError = function (error, business, section) {
        $.ajax({
            url: services.API_URL + "Error/Track?business=" + business + "&section=" + section,
            type: "POST",
            dataType: "json",
            contentType: 'application/json',
            data: error
        }).success(function (response) {
                callback(response);
            });
    };

    /**
     * Hookup to DataSources Create, Update, Delete complete functions:
     * 1) provide notifications for failure and success
     * 2) reload the data
     * @param dataSource
     */
    services.hookupDefaultComplete = function (dataSource) {
        var onComplete = function (jqXHR, textStatus) {
            if (textStatus === "success") {
                saveHistory.success();
            } else {
                dataSource.cancelChanges();
                saveHistory.error(jqXHR.statusText);
            }
        };

        dataSource.transport.options.create.complete = onComplete;
        dataSource.transport.options.update.complete = onComplete;
        dataSource.transport.options.destroy.complete = onComplete;
    };

    return services;
});