// Copyright 2012 FoundOPS LLC. All Rights Reserved.

/**
 * @fileoverview Class to hold personal settings logic.
 */

"use strict";

define(["db/services", "db/saveHistory", "tools/dateTools", "widgets/imageUpload"], function (dbServices, saveHistory, dateTools) {
    var personalSettings = {}, imageUpload, vm = kendo.observable();

    personalSettings.vm = vm;

    personalSettings.undo = function (state) {
        vm.set("userAccount", state);
        personalSettings.save();
    };

    personalSettings.save = function () {
        if (personalSettings.validator.validate() && personalSettings.validator2.validate()) {
            //need to exclude the roleId to update the current user account
            dbServices.userAccounts.update({excludeRoleId: true, body: vm.get("userAccount")});
        }
    };

    personalSettings.initialize = function () {
        //need to reset every time for when the role is changed, and the view is reloaded
        initializeTimeZones = true;

        personalSettings.validator = $("#personalForm").kendoValidator().data("kendoValidator");
        personalSettings.validator2 = $("#timeZoneForm").kendoValidator().data("kendoValidator");

        //setup menu
        var menu = $("#personal .settingsMenu");
        kendo.bind(menu);
        menu.kendoSettingsMenu({selectedItem: "Personal"});

        saveHistory.saveInputChanges("#personal");

        //setup image upload
        imageUpload = $("#personalImageUpload").kendoImageUpload({
            uploadUrl: dbServices.API_URL + "userAccount/UpdateUserImage",
            imageWidth: 200,
            containerWidth: 500
        }).data("kendoImageUpload");
    };

    var initializeTimeZones = true;

    personalSettings.show = function () {
        saveHistory.setCurrentSection({
            page: "Personal Settings",
            save: personalSettings.save,
            undo: personalSettings.undo,
            state: function () {
                return vm.get("userAccount");
            }
        });

        //retrieve the settings and bind them to the form
        dbServices.userAccounts.read({excludeRoleId: true}).done(function (userAccounts) {
            if (!userAccounts || !userAccounts[0])
                return;

            var currentUserAccount = userAccounts[0];

            vm.set("userAccount", currentUserAccount);
            kendo.bind($("#personal"), vm);

            //set the image url after it was initially loaded
            imageUpload.setImageUrl(vm.get("userAccount.ImageUrl"));

            saveHistory.resetHistory();
        });

        if (initializeTimeZones) {
            //get the list of timezones
            dbServices.timeZones.read().done(function (timeZones) {
                initializeTimeZones = false;

                $("#TimeZone").kendoDropDownList({
                    dataSource: timeZones,
                    dataTextField: "DisplayName",
                    dataValueField: "Id"
                });

                if (!vm.get("userAccount.TimeZone")) {
                    var timezone = dateTools.getLocalTimeZone();

                    var dropDownList = $("#TimeZone").data("kendoDropDownList");
                    dropDownList.select(function (dataItem) {
                        return dataItem.DisplayName === timezone.DisplayName;
                    });
                }
            });
        }
    };

    //set personalSettings to a global function, so the functions are accessible from the HTML element
    window.personalSettings = personalSettings;
});