// Copyright 2012 FoundOPS LLC. All Rights Reserved.

/**
 * @fileoverview Class to change password.
 */

"use strict";

define(["db/services"], function (services) {
    var changePassword = {};

    changePassword.save = function (){
        var oldPass = $("#old")[0].value;
        var newPass = $("#new")[0].value;
        var confirmPass = $("#confirm")[0].value;
        if(changePassword.validator.validate){
            services.updatePassword(oldPass, newPass, confirmPass);
        }
    };

    changePassword.initialize = function () {
        changePassword.validator = $("#passForm").kendoValidator({
            rules: {
                custom: function(input){
                    return (input.is("[name=confirm]") && input.val() === $("#new")[0].value) || !(input.is("[name=confirm]"))
                }
            },
            messages: {
                custom: "The passwords do not match."
            }
        }).data("kendoValidator");
    };

    window.changePassword = changePassword;
});