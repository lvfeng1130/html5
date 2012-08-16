// Copyright 2012 FoundOPS LLC. All Rights Reserved.

'use strict';

require(["jquery", "db/services", "tools", "db/saveHistory", "widgets/serviceDetails", "lib/jquery.form"], function ($, dbServices, tools, saveHistory) {
    var services = {}, serviceHoldersDataSource, grid, handleChange, serviceTypesComboBox, selectedServiceHolder, vm;

    //region Public
    services.vm = vm = kendo.observable({
        selectedServiceType: function () {
            return serviceTypesComboBox.dataItem();
        }
    });

    services.undo = function (state) {
        //fixes a problem when the state is stored bc it is converted to json and back
        dbServices.convertServiceDates(state);
        vm.set("selectedService", state);
        services.save();
    };

    services.save = function () {
        dbServices.updateService(vm.get("selectedService")).success(function (e) {
            //Now that the service has been updated, change the current row's ServiceId
            //to match the Id in case this was a newly inserted service

            //store the selected row, to reselect it
            var selectedRowId = grid.select().attr("data-uid");

            var selectedService = vm.get("selectedService");
            if (!selectedServiceHolder || !grid) {
                return;
            }

            //update the service id, client name, TODO: and location (address line 1 + 2)
            selectedServiceHolder.set("ServiceId", selectedService.Id);
            selectedServiceHolder.set("ClientName", selectedService.get("Client.Name"));

            //update all the field columns
            var fields = selectedService.Fields;

            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                var val = field.get("Value");
                if (field.Type === "OptionsField") {
                    val = "";
                    var options = field.get("Options");
                    for (var o = 0; o < options.length; o++) {
                        var option = field.get("Options[" + o + "]");
                        if (option.get("IsChecked")) {
                            val += option.get("Name") + ", ";
                        }
                    }
                    //remove the trailing comma and space
                    val = val.substr(0, val.length - 2);
                }
                if (field.Type === "LocationField" && field.Value) {
                    val = field.Value.AddressLineOne + " " + field.Value.AddressLineTwo;
                }
                //replace spaces with _
                var columnName = field.Name.split(' ').join('_');
                selectedServiceHolder.set(columnName, val);
            }

            //reselect the row, and prevent change from reloading the service
            handleChange = true;
            grid.select(grid.table.find('tr[data-uid="' + selectedRowId + '"]'));
        });
    };

    services.exportToCSV = function () {
        var content = tools.toCSV(serviceHoldersDataSource.view(), "Services", true, ['RecurringServiceId', 'ServiceId']);
        var form = $("#csvForm");
        form.find("input[name=content]").val(content);
        form.find("input[name=fileName]").val("services.csv");
        form[0].action = dbServices.ROOT_API_URL + "Helper/Download";
        form.submit();
    };
    //endregion

    //region DataSource

    /**
     * Converts the types returned in the first row of the data returned from
     * GetServicesHoldersWithFields to DataSource fields
     * @param data
     */
    var getFields = function (data) {
        var types = _.first(data);

        var fieldTypes = {
            "System.Decimal": {type: "number"},
            "System.DateTime": {type: "date", detail: "datetime"},
            "Time": {type: "date", detail: "time"},
            "Date": {type: "date", detail: "date"},
            "System.String": {type: "string"},
            "System.Guid": {type: "string"}
        };

        //Setup the data source fields info
        var fields = {};
        _.each(types, function (type, name) {
            var fieldInfo = fieldTypes[type];
            if (type === "System.Guid") {
                fieldInfo.hidden = true;
            }

            //Add the type to fields
            //Example ShipCity: { type: "string" }
            fields[name] = fieldInfo;
        });

        return fields;
    };

    /**
     * Formats the data returned by GetServicesHoldersWithFields
     * to a readable type for kendo's datasource
     * @param data
     */
    var formatData = function (data) {
        var fields = getFields(data);

        //format the data
        var formattedData = [];
        //exclude the type data in the first row
        _.each(_.rest(data), function (row) {
            var formattedRow = {};
            //go through each field type, and convert the data to the proper type
            _.each(fields, function (value, key) {
                var originalValue = row[key];
                var convertedValue;
                if (originalValue === null) {
                    convertedValue = "";
                } else if (value.type === "number") {
                    convertedValue = parseFloat(originalValue);
                } else if (value.type === "date") {
                    convertedValue = new Date(originalValue);
                } else if (value.type === "string") {
                    convertedValue = originalValue.toString();
                } else {
                    return;
                }

                formattedRow[key] = convertedValue;
            });

            formattedData.push(formattedRow);
        });

        return formattedData;
    };

    /*
     * Create a data source and grid.
     * This is called whenever the service is changed because the data schema is dynamic
     * and kendo datasource does not allow you to change the schema.
     */
    var createDataSourceAndGrid = function () {
        var serviceType = vm.selectedServiceType().Name;

        var readAction = "service/GetServicesHoldersWithFields";
        var params = {
            startDate: tools.formatDate(vm.get("startDate")),
            endDate: tools.formatDate(vm.get("endDate")),
            serviceType: serviceType
        };

        //load the fields types
        //then create the datasource
        //then create the grid
        dbServices._getHttp(readAction + "?take=1", params)(function (data) {
            var fields = getFields(data);
            serviceHoldersDataSource = new kendo.data.DataSource({
                schema: {
                    model: {
                        id: "ServiceId",
                        fields: fields
                    }
                },
                transport: {
                    read: {
                        url: dbServices.API_URL + readAction,
                        data: params
                    }
                },
                change: function (e) {
                    var filterSet = serviceHoldersDataSource.filter();
                    if (filterSet) {
                        filterSet = filterSet.filters;
                    }

                    var startDateFilter = _.find(filterSet, function (f) {
                        return f.field === "OccurDate" && f.operator === "gte";
                    });
                    var endDateFilter = _.find(filterSet, function (f) {
                        return f.field === "OccurDate" && f.operator === "lte";
                    });

                    var vmStartDate = vm.get("startDate");
                    var vmEndDate = vm.get("endDate");
                    var missingFilter = !startDateFilter || !endDateFilter;
                    //correct any missing filters
                    if (!startDateFilter && !endDateFilter) {
                        //if there are neither start date or end date filters, set them to the vm's startDate and endDate
                        startDateFilter = {field: "OccurDate", operator: "gte", value: vmStartDate};
                        endDateFilter = {field: "OccurDate", operator: "lte", value: vmEndDate};
                    } else if (!endDateFilter) {
                        //if there is a startDateFilter but not a endDateFilter
                        //set it to 2 weeks later
                        endDateFilter = {field: "OccurDate", operator: "lte",
                            value: moment(startDateFilter.value).add('weeks', 2).toDate()};
                    } else if (!startDateFilter) {
                        //if there is a endDateFilter but not a startDateFilter
                        //set it to 2 weeks prior
                        startDateFilter = {field: "OccurDate", operator: "gte",
                            value: moment(endDateFilter.value).subtract('weeks', 2).toDate()};
                    }

                    //if the start and endDate changed
                    //update the vm's startDate and endDate
                    //then reload the dataSource
                    if (vmStartDate.toDateString() !== startDateFilter.value.toDateString() ||
                        vmEndDate.toDateString() !== endDateFilter.value.toDateString()) {
                        vm.set("startDate", startDateFilter.value);
                        vm.set("endDate", endDateFilter.value);

                        //reload the services
                        serviceHoldersDataSource.options.transport.read.data.startDate = tools.formatDate(vm.get("startDate"));
                        serviceHoldersDataSource.options.transport.read.data.endDate = tools.formatDate(vm.get("endDate"));
                        serviceHoldersDataSource.read();

                        return;
                    }
                    //if there was a missing filter, refilter
                    else if (missingFilter) {
                        var otherFilters = _.filter(filterSet, function (f) {
                            return f.field !== "OccurDate";
                        });
                        otherFilters.push(startDateFilter);
                        otherFilters.push(endDateFilter);

                        _.delay(function () {
                            serviceHoldersDataSource.filter(otherFilters);
                        }, 200);
                    }
                },
                parse: function (response) {
                    var formatted = formatData(response);
                    return formatted;
                }
            });
            serviceHoldersDataSource.sort({ field: "OccurDate", dir: "asc" });

            //Create the grid
            setupGrid(fields);
        });
    };

    //endregion

    //region Grid

    //resize the grid based on the current window's height
    var resizeGrid = function (initialLoad) {
        var extraMargin;
        if (initialLoad) {
            extraMargin = 50;
        } else {
            extraMargin = 85;
        }
        var windowHeight = $(window).height();
        var topHeight = $('#top').outerHeight(true);
        var contentHeight = windowHeight - topHeight - extraMargin;
        $('#grid').css("height", contentHeight + 'px');
        $('#grid .k-grid-content').css("height", contentHeight + 'px');
        $("#serviceDetails").css("height", contentHeight + 15 + 'px');
    };

    //save the column configuration
    var saveGridConfig = function () {
        _.delay(function () {
            var columns = grid.columns;
            var serviceColumns = [];
            for (var c in columns) {
                var column = {};
                column.Name = columns[c].field;
                column.Width = columns[c].width;
                column.Order = c;
                if (columns[c].hidden) {
                    column.Hidden = true;
                } else {
                    column.Hidden = false;
                }
                serviceColumns.push(column);
            }

            var id = vm.selectedServiceType().Id;
            dbServices.updateServiceColumns(id, serviceColumns);
            services.serviceColumns[id] = serviceColumns;
        }, 200);
    };

    var setupGrid = function (fields) {
        var storedColumns = services.serviceColumns[vm.selectedServiceType().Id];

        //Setup the columns based on the fields
        var columns = [];
        _.each(fields, function (value, key) {
            if (value.hidden) {
                return;
            }

            var column = {};

            //replace _ with spaces, and insert a space before each capital letter
            column.title = key.split('_').join(' ').replace(/([A-Z])/g, ' $1');

            column.field = key;
            column.type = value.type;
            if (column.type === "number") {
                column.template = "#= (" + key + "== null) ? ' ' : " + key + " #";
            } else if (column.type === "date") {
                if (value.detail === "datetime") {
                    column.template = "#= (" + key + "== null) ? ' ' : moment(" + key + ").format('LLL') #";
                } else if (value.detail === "time") {
                    column.template = "#= (" + key + "== null) ? ' ' : moment(" + key + ").format('LT') #";
                } else if (value.detail === "date") {
                    column.template = "#= (" + key + "== null) ? ' ' : moment(" + key + ").format('LL') #";
                }
            }

            //calculate the width based on number off characters
            var titleLength = column.title.length * 7.5 + 35;
            column.width = titleLength + "px";

            var configColumn = _.find(storedColumns, function (col) {
                return col.Name === column.field;
            });

            //if there is a matching column in configColumns, use it's values
            if (configColumn) {
                //check if "px" is missing. If so, put it back
                //check if "px" is missing. If so, put it back
                if (configColumn.Width.indexOf("px") === -1) {
                    configColumn.Width += "px";
                }
                column.width = configColumn.Width;
                column.hidden = configColumn.Hidden;
                column.order = configColumn.Order;
            }

            columns.push(column);
        });

        //check if there is any difference in the columns in config
        //if so, save the current config
        var storedCols = _.pluck(storedColumns, 'Name');
        var gridCols = _.pluck(columns, 'field');
        if (_.difference(storedCols, gridCols).length > 0 || _.difference(gridCols, storedCols).length > 0) {
            saveGridConfig();
        }

        //reorder the columns
        columns = _.sortBy(columns, function (column) {
            return parseInt(column.order);
        });

        grid = $("#grid").data("kendoGrid");
        if (grid) {
            grid.destroy();
        }
        $("#grid").empty();

        grid = $("#grid").kendoGrid({
            autoBind: true,
            change: function () {
                //whenever a field is changed, the grid needs to be reselected. handleChange is set to prevent triggering a reload
                if (handleChange) {
                    handleChange = false;
                    return;
                }
                //enable delete button
                $('#services .k-grid-delete').removeAttr("disabled");

                selectedServiceHolder = this.dataItem(this.select());
                if (!selectedServiceHolder) {
                    return;
                }
                //Load the service details, and update the view model
                dbServices.getServiceDetails(selectedServiceHolder.get("ServiceId"), selectedServiceHolder.get("OccurDate"), selectedServiceHolder.get("RecurringServiceId"), function (service) {
                    services.vm.set("selectedService", service);

                    saveHistory.close();
                    saveHistory.resetHistory();
                });
                $("#serviceDetails").attr("style", "display:block");
            },
            columns: columns,
            columnMenu: true,
            columnReorder: function () {
                saveGridConfig();
            },
            columnResize: function () {
                saveGridConfig();
            },
            columnShow: function () {
                saveGridConfig();
            },
            columnHide: function () {
                saveGridConfig();
            },
            dataSource: serviceHoldersDataSource,
            filterable: true,
            resizable: true,
            reorderable: true,
            scrollable: true,
            sortable: {
                mode: "multiple"
            },
            selectable: true
        }).data("kendoGrid");

        grid.refresh();
    };
    //endregion

    services.initialize = function () {
        //save changes whenever the selected service has a change
        vm.bind("change", function (e) {
            if (e.field.indexOf("selectedService.") > -1) {
                saveHistory.save();
            }
        });

        //load the current business account's service types
        //choose the first type and then load the saved column configuration
        //then load the initial services
        dbServices.getServiceTypes(function (serviceTypes) {
            services.serviceTypes = serviceTypes;

            serviceTypesComboBox = $("#serviceTypes").kendoDropDownList({
                dataTextField: "Name",
                dataValueField: "Id",
                dataSource: services.serviceTypes,
                change: function () {
                    //disable the delete button
                    $('#services .k-grid-delete').attr("disabled", "disabled");
                    $("#serviceDetails").attr("style", "display:none");

                    //reload the services whenever the service type changes
                    createDataSourceAndGrid();
                }
            }).data("kendoDropDownList");

            //load the saved column configuration
            dbServices.getServiceColumns(function (columns) {
                services.serviceColumns = columns;

                //load the services initially
                createDataSourceAndGrid();
            });
        });

        //set the initial start date to today and end date in two weeks
        vm.set("startDate", moment().sod().toDate());
        vm.set("endDate", moment().sod().add('weeks', 2).toDate());

        $("#serviceDetails").kendoServiceDetails();

        $("#services .k-grid-delete").on("click", function () {
            var answer = confirm("Are you sure you want to delete the selected service?");
            if (answer) {
                grid.dataSource.remove(selectedServiceHolder);
                dbServices.deleteService(vm.get("selectedService"));
            }
        });

        $(window).resize(function () {
            resizeGrid(false);
        });
        resizeGrid(true);
    };

    services.show = function () {
        saveHistory.setCurrentSection({
            page: "Services",
            save: services.save,
            undo: services.undo,
            state: function () {
                return vm.get("selectedService");
            }
        });
    };

    //set services to a global function, so the functions are accessible from the HTML element
    window.services = services;
});