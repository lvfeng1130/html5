// Copyright 2012 FoundOPS LLC. All Rights Reserved.

"use strict";

define(["db/services", "db/session", "db/saveHistory", "tools/parameters", "db/models", "tools/dateTools", "widgets/settingsMenu"], function (dbServices, session, saveHistory, parameters, models, dateTools) {
    var usersSettings = {}, usersDataSource, grid;

    usersSettings.setupSaveHistory = function () {
        saveHistory.setCurrentSection({
            page: "Users Settings",
            section: usersSettings
        });
    };

    var setupDataSource = function () {
        var fields = {
            Id: {
                type: "hidden",
                defaultValue: ""
            },
            FirstName: {
                type: "string",
                validation: { required: true },
                defaultValue: ""
            },
            LastName: {
                type: "string",
                validation: { required: true },
                defaultValue: ""
            },
            EmailAddress: {
                type: "string",
                validation: { required: true },
                defaultValue: ""
            },
            Role: {
                type: "string",
                validation: { required: true },
                defaultValue: "Administrator"
            },
            EmployeeId: {
                //for new entities, default to creating a new employee
                defaultValue: models.newId
            }
//            TimeZone: {
//                defaultValue: ""
//            }
        };

        var getBaseUrl = function () {
            return dbServices.API_URL + "userAccounts?roleId=" + parameters.get().roleId;
        };
        usersDataSource = new kendo.data.DataSource({
            transport: {
                read: {
                    type: "GET",
                    dataType: "json",
                    contentType: "application/json; charset=utf-8",
                    //TODO: set a timeout and notify if it is reached('complete' doesn't register a timeout error)
                    complete: function (jqXHR, textStatus) {
                        if (textStatus == "error") {
                            saveHistory.error("Connection Error");
                        }
                    },
                    url: getBaseUrl
                },
                create: {
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    url: getBaseUrl
                },
                update: {
                    type: "PUT",
                    contentType: "application/json; charset=utf-8",
                    url: getBaseUrl
                },
                destroy: {
                    type: "DELETE",
                    data: function () {
                        return {};
                    },
                    url: function (userAccount) {
                        return getBaseUrl() + "&id=" + userAccount.Id;
                    }
                },
                parameterMap: dbServices.parameterMap()
            },
            schema: {
                model: {
                    // Necessary for inline editing to work
                    id: "Id",
                    fields: fields
                }
            }
        });

        dbServices.hookupDefaultComplete(usersDataSource, {
            //after insert or update, reload employees and user accounts
            //delay to let popup close
            create: {
                done: function () {
                    _.delay(load, 200);
                }
            },
            update: {
                done: function () {
                    _.delay(load, 200);
                }
            }
        });
    };

    var hideButtons = function () {
        var users = $("#users");
        users.find(".k-grid-delete").attr("style", "display:none");
        users.find(".k-grid-edit").attr("style", "display:none");
    };

    var setupUsersGrid = function () {
        //add a grid to the #usersGrid div element
        grid = $("#usersGrid").kendoGrid({
            autoBind: false,
            change: function () {
                //show the delete button only if a row is selected
                var users = $("#users");
                if (users.find("tr.k-state-selected")[0]) {
                    users.find(".k-grid-delete").attr("style", "display:inline-block");
                    users.find(".k-grid-edit").attr("style", "display:inline-block");
                } else {
                    hideButtons();
                }
            },
            dataSource: usersDataSource,
            dataBound: function () {
                //after the data is loaded, add tooltips to the edit and delete buttons
                $(".k-grid-edit").each(function () {
                    $(this).attr("title", "Edit");
                });
                $(".k-grid-delete").each(function () {
                    $(this).attr("title", "Delete");
                });
                //set the editor type
                $('.k-grid-edit').on('click', function () {
                    usersSettings.editorType = 'edit';
                });
            },
            editable: {
                mode: "popup",
                template: $("#userPopupTemplate").html(),
                confirmation: "Are you sure you want to delete this user?"
            },
            edit: function () {
                var win = $('.k-window');
                //hide the buttons any time the edit or add windiw closes
                if (usersSettings.editorType === 'add') {
                    win.find('.k-window-title').html("Add New User");
                    //change update to Send Invite Email
                    win.find('.k-grid-update').html("Send Invite Email").attr("style", "margin-left:91px");
                }
                else {
                    win.find('.k-window-title').html("Edit User");
                }

                //
                $(".k-grid-cancel").on("click", function () {
                    //check if the Send Invite button is disabled
                    if ($(".k-window-content .k-grid-update").attr("disabled") == "disabled") {
                        //prevent cancel
                        return false;
                    }
                    hideButtons();
                });

                //hide the buttons any time the edit or add windiw closes
                $(".k-grid-update, .k-window-action").on("click", function () {
                    hideButtons();
                });
            },
            resizable: true,
            save: function (e) {
                //check if the Send Invite button is disabled
                if ($(".k-window-content .k-grid-update").attr("disabled") == "disabled") {
                    //if so, don't save again
                    e.preventDefault();
                }
                //disable the save and cancel buttons, and hide the exit button
                if (e.container[0].innerText.match(/Invite/) || e.container[0].innerText.match(/Update/)) {
                    $(".k-window-content .k-grid-update, .k-window-content .k-grid-cancel").attr("disabled", "true");
                    $(".k-window-action").attr("style", "visibility: hidden");
                }
            },
            scrollable: true,
            sortable: true,
            selectable: true,
            columns: [
                {
                    field: "FirstName",
                    title: "First Name",
                    width: "100px"
                },
                {
                    field: "LastName",
                    title: "Last Name",
                    width: "100px"
                },
                {
                    field: "EmailAddress",
                    title: "Email",
                    width: "150px"
                },
                {
                    field: "Role",
                    width: "100px"
                },
                //TODO: V2 add an employee records link
                {
                    field: "EmployeeId",
                    title: "Employee Record",
                    template: "# if (EmployeeId) {#" +
                        "#= usersSettings.getEmployeeName(EmployeeId) #" +
                        "# } #",
                    width: "130px"
                }
            ]
        }).data("kendoGrid");
    };

    //resize the grid based on the current window's height
    var resizeGrid = function () {
        var extraMargin = 272;
        var windowHeight = $(window).height();
        var contentHeight = windowHeight - extraMargin;
        $("#usersGrid").find(".k-grid-content").css("maxHeight", contentHeight + 'px');
    };

    usersSettings.initialize = function () {
        $(window).resize(function () {
            resizeGrid();
        });

        //setup menu
        var users = $("#users");
        var menu = users.find(".settingsMenu");
        kendo.bind(menu);
        menu.kendoSettingsMenu({selectedItem: "Users"});

        setupDataSource();
        setupUsersGrid();
        //setup add button
        users.find("#addUser").on("click", function () {
            //workaround for lacking add/edit templates
            usersSettings.editorType = 'add';

            //open add new user popup
            grid.addRow();
        });

        users.find(".k-grid-edit").on("click", function () {
            grid.editRow(grid.select());
        });

        users.find(".k-grid").delegate("tbody>tr", "dblclick", function () {
            usersSettings.editorType = 'edit';
            grid.editRow(grid.select());
        });

        users.find(".k-grid-delete").on("click", function () {
            grid.removeRow(grid.select());
        });
    };

    var load = function () {
        dbServices.employees.read().done(function (data) {
            var employees = data;

            //add a create new option
            var createNew = {Id: models.newId, DisplayName: "Create New", FirstName: "", LastName: "", LinkedUserAccountId: ""};
            employees.splice(0, 0, createNew);

            //add a none option above create new
            var none = {Id: models.emptyId, DisplayName: "None", FirstName: "", LastName: "", LinkedUserAccountId: ""};
            employees.splice(0, 0, none);

            usersSettings.availableEmployees = employees;
            usersDataSource.read();
            hideButtons();
            resizeGrid();
        });
    };

    usersSettings.show = function () {
        usersSettings.setupSaveHistory();
        //ensures role id gets set
        _.delay(load, 250);
    };

    usersSettings.getEmployeeName = function (employeeId) {
        var employee = _.find(usersSettings.availableEmployees, function (e) {
            return e.Id === employeeId;
        });

        if (employee) {
            return employee.DisplayName;
        }

        return "";
    };

    window.usersSettings = usersSettings;
});