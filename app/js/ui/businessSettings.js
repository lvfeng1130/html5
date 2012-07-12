// Copyright 2012 FoundOPS LLC. All Rights Reserved.

/**
 * @fileoverview Class to hold personal settings logic.
 */

"use strict";

define(['db/services', 'developer', 'ui/personalSettings'], function (services, developer, personalSettings) {
    var businessSettings = {};
    //keep track of if a new image has been selected
    businessSettings.newImage = false;

    businessSettings.viewModel = kendo.observable({
        saveChanges: function () {
            if(personalSettings.validator.validate()){
                services.updateBusinessSettings(this.get("settings"));
            }
            //check if image has been changed
            if(businessSettings.newImage){
                $("#imageUploadForm").submit();
            }
        }
    });

    businessSettings.initialize = function () {
        businessSettings.validator = $("#businessForm").kendoValidator().data("kendoValidator");

        var fileLoaded = function (evt) {
            var imageData = evt.target.result;

            if (imageData == null)
                return;

            var cropbox = $("#cropbox");
            //set the source of the image element to be the newly uploaded image
            cropbox.attr("src", imageData);
            //make sure the image fits into desired area
            personalSettings.resize();

            //if the Flash FileAPIProxy is being used, move the swf on top the moved input button
            if (window.FileAPIProxy !== null) {
                var input = $("#imageUpload");
                window.FileAPIProxy.container
                    .height(input.outerHeight())
                    .width(input.outerWidth())
                    .position({of: input});
            }

            //set a hidden form to the file image's data (because we stole it with FileReader)
            $('#imageData').val(imageData);

            //set so that the save changes event will also save the image
            businessSettings.newImage = true;
        };

        //setup the FileReader on the imageUpload button
        //this will enable the flash FileReader polyfill from https://github.com/Jahdrien/FileReader
        $("#imageUpload").fileReader({
            id: "fileReaderSWFObject",
            filereader: "../../lib/filereader.swf",
            debugMode: false,
            multiple: false
        });

        $("#imageUpload").on('change', function (evt) {
            var reader = new FileReader();
            reader.onload = fileLoaded;

            var file = evt.target.files[0];
            //check that the file is an image
            if (!file.name.match(/(.*\.png$)/) && !file.name.match(/(.*\.jpg$)/) && !file.name.match(/(.*\.JPG$)/) && !file.name.match(/(.*\.gif$)/)) {
                alert("Only .jpg, .png, and .gif files types allowed!");
                return;
            }
            //check that the image is no larger than 10MB
            if (file.size > 5000000) {
                alert("File is too large! Maximum allowed is 5MB.");
                return;
            }

            //Read the file to trigger onLoad
            reader.readAsDataURL(file);
            //set the form value
            $('#imageFileName').val(file.name);
        });

        //set the form action to the update image url
        $('#imageUploadForm').attr("action", services.API_URL + "settings/UpdateBusinessImage?roleId=" + developer.GOTGREASE_ROLE_ID);

        //retrieve the settings and bind them to the form
        services.getBusinessSettings(function (settings) {
            businessSettings.viewModel.set("settings", settings);
            kendo.bind($("#business"), businessSettings.viewModel);
        });
    };

    window.businessSettings = businessSettings;
});