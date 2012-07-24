// Copyright 2012 FoundOPS LLC. All Rights Reserved.

/**
 * @fileoverview Class to hold business settings logic.
 */

"use strict";

define(["db/services", "developer", "ui/notifications", "session", "widgets/settingsMenu", "lib/jquery-ui-1.8.21.core.min",
    "lib/jquery.FileReader", "lib/swfobject"], function (dbServices, developer, notifications, session) {
    var businessSettings = {};

    //keep track of if a new image has been selected
    var newImage = false;

    businessSettings.viewModel = kendo.observable({
        saveChanges: function () {
            if (businessSettings.validator.validate()) {
                dbServices.updateBusinessSettings(this.get("settings"))
//                    .success(function (data, textStatus, jqXHR) {
//                        notifications.success(jqXHR);
//                    }).error(function (data, textStatus, jqXHR) {
//                        notifications.error(jqXHR);
//                    });
            }
            //check if image has been changed
            if (newImage) {
                $("#businessImageUploadForm").submit();
            }
        },
        cancelChanges: function (e) {
            this.set("settings", businessSettings.settings);
            businessSettings.resize();
            if (!e.data.settings.ImageUrl){
                $("#businessCropbox").css("visibility", "hidden").css("width", "0px").css("height", "0px")
                    .css("margin-left", "0px");
            }
        }
    });

    //make sure the image fits into desired area
    businessSettings.resize = function () {
        var cropbox = $("#businessCropbox");
        //get the original dimensions of the image
        var width = cropbox[0].width;
        var height = cropbox[0].height;
        //get the ratio for each dimension
        var w = 200 / width;
        var h = 200 / height;
        //find the lowest ratio(will be the shortest dimension)
        var ratio = Math.min(w, h);
        //use the ratio to set the new dimensions
        var newW = ratio * width;
        var newH = ratio * height;

        //set the largest dimension of the image to be the desired size
        if (width > height) {
            cropbox.attr("width", newW);
        } else {
            cropbox.attr("height", newH);
        }
        //center the image
        var margin = (500 - newW) / 2;
        cropbox.css("marginLeft", margin + "px");
    };

    businessSettings.initialize = function () {
        businessSettings.validator = $("#businessForm").kendoValidator().data("kendoValidator");

        //setup menu
        var menu = $("#business .settingsMenu");
        kendo.bind(menu);
        menu.kendoSettingsMenu({selectedItem: "Business"});

        var fileLoaded = function (evt) {
            var imageData = evt.target.result;

            if (imageData == null)
                return;

            var cropbox = $("#businessCropbox");
            //set the source of the image element to be the newly uploaded image
            cropbox.attr("src", imageData);

            //set a hidden form to the file image's data (because we stole it with FileReader)
            $('#business #imageData').val(imageData);

            //show the image
            $("#businessCropbox").css("visibility", "visible").css("width", "auto").css("height", "auto");

            //set so that the save changes event will also save the image
            newImage = true;
            businessSettings.resize();
        };

        //setup the FileReader on the imageUpload button
        //this will enable the flash FileReader polyfill from https://github.com/Jahdrien/FileReader
        $("#businessImageUploadButton").fileReader();

        $("#businessImageUploadButton").on('change', function (evt) {
            var reader = new FileReader();
            reader.onload = fileLoaded;

            var file = evt.target.files[0];
            //check that the file is an image
            if (!file.name.match(/(.*\.png$)/) && !file.name.match(/(.*\.jpg$)/) && !file.name.match(/(.*\.JPG$)/) && !file.name.match(/(.*\.gif$)/)) {
                notifications.error("File Type");
                return;
            }
            //check that the image is no larger than 10MB
            if (file.size > 5000000) {
                notifications.error("File Size");
                return;
            }

            //Read the file to trigger onLoad
            reader.readAsDataURL(file);
            //set the form value
            $('#business #imageFileName').val(file.name);
        });

        var setupDataSourceUrls = function () {
            var roleId = session.get("role.id");
            if (!roleId) {
                return;
            }
            //setup the form
            $('#businessImageUploadForm').ajaxForm({
                //from http://stackoverflow.com/questions/8151138/ie-jquery-form-multipart-json-response-ie-tries-to-download-response
                dataType: "text",
                contentType: "multipart/form-data",
                url: dbServices.API_URL + "settings/UpdateBusinessImage?roleId=" + roleId,
                success: function (response) {
                    var url = response.replace(/['"]/g,'');
                    businessSettings.viewModel.get("settings").set("ImageUrl", url);
                }});
        };
        session.bind("change", function (e) {
            if (e.field == "role") {
                setupDataSourceUrls();
            }
        });

        //retrieve the settings and bind them to the form
        dbServices.getBusinessSettings(function (settings) {
            //set this so cancelChanges has a reference to the original settings
            businessSettings.settings = settings;
            businessSettings.viewModel.set("settings", settings);
            kendo.bind($("#business"), businessSettings.viewModel);
            if (!settings.ImageUrl){
                $("#businessCropbox").css("visibility", "hidden").css("width", "0px").css("height", "0px");
            }
        });
    };

    //set businessSettings to a global function, so the functions are accessible from the HTML element
    window.businessSettings = businessSettings;
});