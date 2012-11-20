'use strict';

define(["jquery", "sections/importerUpload", "db/services", "underscore", "tools/generalTools"], function ($, importerUpload, dbServices, _, generalTools) {
    var importerSelect = {}, previousSelectedFields, originalFieldGroups, currentFieldGroups,
        trackerTypes = {
            Phone: "Phone",
            Email: "Email",
            Website: "Website",
            Other: "Other"
        },
    //tracks the selected indexes of contact info types
        selectionTrackers = [
            [
                [false, false, trackerTypes.Phone]
            ],
            [
                [false, false, trackerTypes.Email]
            ],
            [
                [false, false, trackerTypes.Website]
            ],
            [
                [false, false, trackerTypes.Other]
            ]
        ];

    var formatDataForValidation = function (data) {
        var selectPage = $("#importerSelect");
        var headersIncluded = selectPage.find(".switch .on").hasClass("active");
        var selectedFields = [];
        //create an array of the fields to be used(based on the dropdowns)
        selectPage.find(".select2-container").each(function () {
            var value = $(this).select2("val"), name;
            //change to the names needed for the API
            if (value === "Address Line 1") {
                name = "Address Line One";
            } else if (value === "Address Line 2") {
                name = "Address Line Two";
            } else if (value === "City") {
                name = "AdminDistrictTwo";
            } else if (value === "State") {
                name = "AdminDistrictOne";
            } else if (value === "Zipcode") {
                name = "PostalCode";
            } else {
                name = value;
            }
            if (value !== "Do not Import") {
                selectedFields.push({name: name, selected: true});
            } else {
                selectedFields.push(false);
            }
        });

        var dataToValidate = [], row;
        //iterate through each row of the data
        for (var r in data) {
            row = data[r];
            var newArray = [];
            //iterate through each column of the current row
            for (var c in row) {
                //if the field is to be imported(if "Do not Import" wasn't selected for this row)
                if (selectedFields[c]) {
                    //use the header from the dropdown instead of their header
                    if (r == 0 && headersIncluded) {
                        newArray.push(selectedFields[c].name);
                    } else {
                        newArray.push(row[c]);
                    }
                }
            }

            dataToValidate.push(newArray);
        }

        //if headers are not included, add an extra row for the headers
        if (!headersIncluded) {
            var length = selectedFields.length, headerRow = [];
            for (var i = 0; i < length; i++) {
                if (selectedFields[i]) {
                    headerRow.push(selectedFields[i].name);
                }
            }
            dataToValidate.unshift(headerRow);
        }

        return dataToValidate;
    };

    /**
     * Checks if the passed field is a contact info field
     * @param {string} field
     */
    var isContactInfoField = function (field) {
        return (field.indexOf("Value") != -1 || field.indexOf("Label") != -1) &&
            (field.indexOf("Phone") != -1 || field.indexOf("Email") != -1 || field.indexOf("Website") != -1 || field.indexOf("Other") != -1);
    };

    /**
     * Return the tracked contact info
     * @param {string} type Ex. Phone
     * @return {Array.<Array.<boolean>>} selectedTracker
     */
    var getContactInfoTracker = function (type) {
        var selectionTracker;
        if (type === trackerTypes.Phone) {
            selectionTracker = selectionTrackers[0];
        } else if (type === trackerTypes.Email) {
            selectionTracker = selectionTrackers[1];
        } else if (type === trackerTypes.Website) {
            selectionTracker = selectionTrackers[2];
        } else {
            selectionTracker = selectionTrackers[3];
        }
        return selectionTracker;
    };

    /**
     * This information is used to keep the contact info in order (Phone Label 1, Phone Label 2, etc)
     * @param {string} field
     */
    var updateContactInfoTracking = function (field) {
        var tracker, trackerRow;
        //get the number from the field(ex. if field is "Phone Label 1", oldNum is 1)
        var oldNum = parseInt(field.match(/\s([0-9]*)$/)[1]);
        //get the type(ex. "Phone")
        var type = field.match(/^(.*?)\s/)[1];

        //get the correct array to use
        tracker = getContactInfoTracker(type);

        //get the appropriate row
        //TODO: doesn't work after Rule #2 has been invoked
        trackerRow = tracker[oldNum - 1];

        var indexToUpdate;

        //check if the field is a label or a value
        if (field.indexOf("Label") != -1) {
            indexToUpdate = 0;
        } else {
            indexToUpdate = 1;
        }

        //update the associated tracker row
        trackerRow[indexToUpdate] = !trackerRow[indexToUpdate];
    };

    //Update the available fields every time a field is selected
    var updateSelectedFields = function () {
        var currentSelectedFields = [], dropdowns = $("#importerSelect").find(".select2-container");

        //create a list of the already selected fields
        dropdowns.each(function () {
            currentSelectedFields.push($(this).select2("val"));
        });

        //find the changed field
        var fieldIndex = -1;
        var newField = _.find(currentSelectedFields, function (field) {
            fieldIndex++;
            return field !== previousSelectedFields[fieldIndex];
        });

        //if a field changed, update the available fields
        if (newField) {
            var lastField = previousSelectedFields[fieldIndex];
            //add back option that was unselected (except when "Do not import" and on initial load)
            if (lastField !== "Do not Import" && lastField !== "") {
                var lastIndex = -1, lastGroupName = "";
                //find the group that lastField belongs to
                var lastGroup = _.find(originalFieldGroups, function (group) {
                    //keep track of the index to use in order to get the entire field object
                    lastIndex = -1;
                    return _.find(group, function (el) {
                        lastIndex++;
                        //get the group name
                        lastGroupName = el.group;
                        return el.id === lastField;
                    });
                });

                var indexToInsert;
                //determine the index in which to insert the field
                for (var i in currentFieldGroups[lastGroupName]) {
                    var field = currentFieldGroups[lastGroupName][i];
                    //find the first field in the current group whos order is above lastIndex
                    if (field.order >= lastIndex) {
                        indexToInsert = i;
                        break;
                    }
                }
                //insert last field to its original position
                currentFieldGroups[lastGroupName].splice(indexToInsert, 0, lastGroup[lastIndex]);
            }

            //remove the new field from groups
            _.each(currentFieldGroups, function (group, key) {
                currentFieldGroups[key] = _.reject(group, function (el) {
                    return el.id === newField && newField !== "Do not Import";
                });
            });

            //region update the contact info options

            //if the label was or is a contact info
            if (isContactInfoField(lastField) || isContactInfoField(newField)) {
                //update the trackers
                if (isContactInfoField(lastField)) {
                    updateContactInfoTracking(lastField);

                    //Rule 2: Remove any contact info without a label or value (except the last row)
                    //code: any double falses in the tracker other than the bottom row, remove it and decrement all greater indexes

                    //check for empty rows([false, false])
                    for (var s in selectionTrackers) {
                        var group = selectionTrackers[s];
                        var row;
                        for (var g in group) {
                            row = group[g];
                            //if both values are false and this isn't the last row
                            if (!row[0] && !row[1] && g != group.length - 1) {
                                var infoType = row[2];
                                var num = parseInt(g) + 1;

                                var decrementStartIndex = -1;
                                var typeToDecrement = "";
                                //remove the unused set from currentFieldGroups.contactInfo
                                for (var c in currentFieldGroups.contactInfo) {
                                    //find the occurrences(2) that match the num and infoType
                                    if (currentFieldGroups.contactInfo[c].id.indexOf(infoType) !== -1 && currentFieldGroups.contactInfo[c].id.match(/\s([0-9]*)$/)[1] === num.toString()) {
                                        //remove them from the list
                                        currentFieldGroups.contactInfo.splice(c, 2);
                                        decrementStartIndex = c;
                                        //get the type(ex. "Phone")
                                        typeToDecrement = currentFieldGroups.contactInfo[c].id.match(/^(.*?)\s/)[1];
                                        break;
                                    }
                                }
                                for (var ci in currentFieldGroups.contactInfo) {
                                    var fieldName = currentFieldGroups.contactInfo[ci].id;
                                    //if the current index is at or above decrementStartIndex and this is the correct contactInfo type
                                    if (ci >= decrementStartIndex && fieldName.match(/^(.*?)\s/)[1] === typeToDecrement) {
                                        //decrement higher numbered fields in the contactInfo list
                                        //get the number from the field(ex. if fieldName is "Phone Label 1", oldIndex is 1)
                                        var oldIndex = fieldName.match(/\s([0-9]*)$/)[1];
                                        //decrement the number
                                        var newIndex = parseInt(oldIndex) - 1;
                                        //replace the old name with the new name
                                        currentFieldGroups.contactInfo[ci].id = fieldName.replace(oldIndex, newIndex.toString());

                                        //decrement already selected dropdown values that match the field

                                    }
                                }
                                //remove the corresponding row from the tracker
                                group.splice(g, 1);
                            }
                        }
                    }
                }

                if (isContactInfoField(newField)) {
                    updateContactInfoTracking(newField);
                }

                //Rule 1: There must always be an available contact info
                //so the last row of the tracker array must be [false, false]

                //skip if changed to "Do not Import"
                if (newField !== "Do not Import") {
                    //get the type that was selected(regex gets "Phone" from "Phone Label 1")
                    var type = newField.match(/^(.*?)\s/)[1];
                    var tracker = getContactInfoTracker(type);

                    //check the last row is available [false, false], if not add a new option
                    //ex. if "Phone Label 1" was selected, add "Phone Label 2" and "Phone Value 2"
                    var lastSelection = tracker[tracker.length - 1];
                    if (lastSelection[0] || lastSelection[1]) {
                        tracker.push([false, false, type]);
                        currentFieldGroups.contactInfo.push(
                            {id: type + " Label " + tracker.length, order: currentFieldGroups.contactInfo, group: "contactInfo"},
                            {id: type + " Value " + tracker.length, order: currentFieldGroups.contactInfo + 1, group: "contactInfo"}
                        );
                    }
                }
            }
            //endregion
        }

        importerSelect.currentFields = [
            {text: "", children: currentFieldGroups.main},
            {text: "Location", children: currentFieldGroups.location},
            {text: "Contact Info", children: currentFieldGroups.contactInfo},
            {text: "Service", children: currentFieldGroups.service},
            {text: "Fields", children: currentFieldGroups.fields}
        ];

        //update the list of the currently selected fields
        previousSelectedFields = [];
        dropdowns.each(function () {
            previousSelectedFields.push($(this).select2("val"));
        });
    };

    importerSelect.initialize = function () {
        //make sure there is a selected service type
        if (!importerUpload.selectedService) {
            window.viewImporterUpload();
        }

        $("#importerSelect").find(".saveBtn").on("click", function () {
            var dataToValidate = formatDataForValidation(importerUpload.uploadedData);

            dbServices.suggestions.update({body: {rowsWithHeaders: dataToValidate}}).done(function (suggestions) {
                importerSelect.gridData = suggestions;
                window.viewImporterReview();
            });
        });
    };

    importerSelect.show = function () {
        //setup the default fields
        var defaultFields = [
            {text: "", children: [
                {id: "Do not Import", order: 0, group: "main"},
                {id: 'Client Name', order: 1, group: "main"}
            ]},
            {text: "Location", children: [
                {id: 'Address Line 1', order: 0, group: "location"},
                {id: 'Address Line 2', order: 1, group: "location"},
                {id: 'City', order: 2, group: "location"},
                {id: 'State', order: 3, group: "location"},
                {id: 'Zipcode', order: 4, group: "location"},
                {id: 'Region Name', order: 5, group: "location"}
            ]},
            {text: "Contact Info", children: [
                {id: 'Phone Label 1', order: 0, group: "contactInfo"},
                {id: 'Phone Value 1', order: 1, group: "contactInfo"},
                {id: 'Email Label 1', order: 2, group: "contactInfo"},
                {id: 'Email Value 1', order: 3, group: "contactInfo"},
                {id: 'Website Label 1', order: 4, group: "contactInfo"},
                {id: 'Website Value 1', order: 5, group: "contactInfo"},
                {id: 'Other Label 1', order: 6, group: "contactInfo"},
                {id: 'Other Value 1', order: 7, group: "contactInfo"}
            ]},
            {text: "Service", children: [
                {id: 'Frequency', order: 0, group: "service"},
                {id: 'Frequency Detail', order: 1, group: "service"},
                {id: 'Repeat Every', order: 2, group: "service"},
                {id: 'Start Date', order: 3, group: "service"},
                {id: 'End Date', order: 4, group: "service"}
            ]}
        ];

        $("#listView").kendoListView({
            //setup the template to only include the header and the first row of data
            template: "<li><div class='header'>#=data[0]#</div><div class='value'>#=data[1]#</div><div class='styled-select'></div></li>",
            dataSource: importerUpload.data
        });

        //setup toggle switch states
        var selectPage = $("#importerSelect");
        var on = selectPage.find(".switch .on");
        var off = selectPage.find(".switch .off");
        on.on("click", function () {
            off.removeClass("active");
            on.addClass("active");
            $("#importerSelect").find("#dynamicHeader span")[0].innerText = "Row 1";
        });
        off.on("click", function () {
            on.removeClass("active");
            off.addClass("active");
            $("#importerSelect").find("#dynamicHeader span")[0].innerText = "Row 2";
        });

        //get the list of fields for the selected service(for the dropdowns)
        if (importerUpload.selectedService) {
            dbServices.services.read({params: {serviceTemplateId: importerUpload.selectedService.Id}}).done(function (service) {
                var serviceFields = [], name, page = $("#importerSelect");
                var fields = service[0].Fields;
                //iterate throught the list of fields
                for (var i in fields) {
                    name = fields[i].Name;
                    //don't add if type is guid or if name is ClientName or OccurDate
                    if (name !== "ClientName" && name !== "OccurDate") {
                        //add field to list
                        serviceFields.push({id: name.replace(/_/g, ' '), order: i, group: "fields"}); //replace "_" with " "
                    }
                }

                //reset the fields list
                importerSelect.allFields = importerSelect.currentFields = defaultFields.concat({text: "Fields", children: serviceFields});

                //function to format the option names of the frequency and end Date dropdowns
                var formatItemName = function (item) {
                    if (item.text) {
                        return item.text;
                    }

                    return item.id;
                };

                page.find(".styled-select").select2({
                    placeholder: "",
                    minimumResultsForSearch: 200,
                    query: function (query) {
                        if (!importerSelect.currentFields) {
                            importerSelect.currentFields = [];
                        }
                        var data = {results: importerSelect.currentFields};
                        query.callback(data);
                    },
                    formatSelection: formatItemName,
                    formatResult: formatItemName,
                    dropdownCssClass: "bigdrop"
                }).on("open",function () {
                        //force rerender
                        setTimeout(function () {
                            $(".select2-drop-active").find(".select2-results")[0].style.overflowY = "scroll";
                            setTimeout(function () {
                                $(".select2-drop-active").find(".select2-results")[0].style.overflowY = "auto";
                            }, 100);
                        }, 100);
                    }).on("change", function () {
                        updateSelectedFields();
                    });

//                //reset the current groups
                currentFieldGroups = {
                    main: importerSelect.allFields[0].children,
                    location: importerSelect.allFields[1].children,
                    contactInfo: importerSelect.allFields[2].children,
                    service: importerSelect.allFields[3].children,
                    fields: importerSelect.allFields[4].children
                };

                originalFieldGroups = generalTools.deepClone(currentFieldGroups);

                /**
                 * checks if the field exists in the groups of fields
                 * @param {string} field
                 * @return {boolean}
                 */
                var findMatch = function (field) {
                    return _.any(currentFieldGroups, function (group) {
                        return _.any(group, function (el) {
                            return el.id === field;
                        });
                    });
                };

                //automatically select fields if there is a matching header
                var dropdown, headers = importerUpload.uploadedData[0];
                previousSelectedFields = [];
                for (var h in headers) {
                    dropdown = page.find(".select2-container:eq(" + h + ")");
                    //select if text matches corresponding header
                    if (findMatch(headers[h])) {
                        dropdown.select2("data", {id: headers[h]});
                        previousSelectedFields.push(headers[h]);
                    } else {
                        dropdown.select2("data", {id: "Do not Import"});
                        previousSelectedFields.push("Do not Import");
                    }

                    updateSelectedFields();
                }
            });
        }
    };

    window.importerSelect = importerSelect;

    return importerSelect;
});