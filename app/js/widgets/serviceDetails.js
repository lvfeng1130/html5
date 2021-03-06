'use strict';
define(["db/services", "db/session", "db/models", "tools/parameters", "tools/kendoTools", "tools/generalTools", "widgets/selectBox"],
    function (dbServices, session, models, parameters, kendoTools, generalTools) {

        var kendo = window.kendo,
            ui = kendo.ui,
            Widget = ui.Widget,
            DATABINDING = "dataBinding",
            DATABOUND = "dataBound",
            inputTemplate = "<input />",
            multiLineTextTemplate = "<textarea class='textarea' style='padding: 5px 0 5px 0;'></textarea>";

        var ServiceDetails = Widget.extend({
            init: function (element, options) {
                var that = this;

                Widget.fn.init.call(that, element, options);
                that.render();
            },

            events: [
                DATABINDING,
                DATABOUND
            ],

            items: function () {
                return this.element.children();
            },

            //region Field Factories

            _fieldFactories: {
                "TextBoxField": function (field, fieldIndex, listView) {
                    var fieldElement;
                    if (field.IsMultiLine) {
                        fieldElement = $(multiLineTextTemplate);
                        fieldElement.appendTo(listView).wrap("<li class='textarea'>" + field.Name + "</li>");
                    } else {
                        fieldElement = $(inputTemplate).attr("type", "text");
                        fieldElement.appendTo(listView).wrap("<li>" + field.Name + "</li>");
                    }

                    return fieldElement;
                },
                "NumericField": function (field, fieldIndex, listView) {
                    var fieldElement = $(inputTemplate).attr("type", "number");

                    var step = 1 / Math.pow(10, field.DecimalPlaces);
                    fieldElement.appendTo(listView).wrap("<li>" + field.Name + "</li>");

                    var format = "#";

                    var min = field.Minimum;
                    var max = field.Maximum;

                    var initialValue = field.Value;

                    if (field.Mask === "c") {
                        format = "c";
                    } else if (field.Mask === "p") {
                        //percentage
                        format = "# \\%";
                        step = step * 100;
                        min = min * 100;
                        max = max * 100;
                        initialValue = initialValue * 100;
                    }

                    fieldElement.kendoNumericTextBox({
                        step: step,
                        min: min,
                        max: max,
                        format: format,
                        value: initialValue,
                        spinners: false,
                        change: function (e) {
                            var newValue = e.sender.value();
                            var field = this.fieldParent;

                            if (field.Mask === "p") {
                                field.set("Value", newValue / 100);
                            } else {
                                field.set("Value", newValue);
                            }
                        }
                    });

                    //store a reference to the field for access by the change function
                    fieldElement.data("kendoNumericTextBox").fieldParent = field;

                    return fieldElement;
                },
                "OptionsField": function (field, fieldIndex, elementToAppendTo) {
                    var fieldElement;
                    if (field.TypeInt === 0 || field.TypeInt === undefined) {
                        //Select Dropdown
                        fieldElement = $('<div class="styled-select"></div>')
                        fieldElement.appendTo(elementToAppendTo).wrap("<li>" + field.Name + "<br/></li>");
                        var selectBox = fieldElement.selectBox({
                            data: field.Options,
                            dataTextField: "Name",
                            dataSelectedField: "IsChecked",
                            onSelect: function (selectedOption, index) {
                                //Clear previous selections.
                                for (var i = 0; i < field.Options.length; i++) {
                                    field.Options[i].IsChecked = false;
                                }
                                field.set('Options[' + index + '].IsChecked', true);
                            }
                        }).data("selectBox");
                        var selected = field.Options[i];
                        for (var i = 0; i < field.Options.length; i++) {
                            if (field.Options[i].IsChecked) {
                                selected = field.Options[i];
                            }
                        }
                        selectBox.select(selected);
                    } else {
                        //Checkbox (1) or checklist (2)
                        fieldElement = $('<ul data-role="listview" data-style="inset">' + field.Name + '</ul>').appendTo(elementToAppendTo);

                        for (var optionIndex = 0; optionIndex < field.Options.length; optionIndex++) {
                            var optionElement = $(inputTemplate).attr("type", "checkbox");

                            var option = field.Options[optionIndex];

                            //store a reference to the option for access by the change function
                            optionElement[0].optionParent = option;

                            //manually bind to avoid issues
                            if (option.IsChecked) {
                                optionElement.attr("checked", "checked");
                            }
                            optionElement.change(function () {
                                var checked = $(this).is(':checked');
                                $(this)[0].optionParent.set("IsChecked", checked);
                            });

                            optionElement.appendTo(fieldElement).wrap("<li><label>" + option.Name + "</label></li>");
                        }
                    }

                    return fieldElement;
                },
                "SignatureField": function (field, fieldIndex, elementToAppendTo, options) {
                    var fieldElement = $('<div class="fieldLabel" style="margin-left:0"><span>' + field.Name + '</span></div>' +
                        '<ul data-role="listview" data-style="inset">' +
                        '<li id="sigPadOpener">' +
                        '<img id="sigDisplay"/>' +
                        '</li>' +
                        '</ul>').appendTo(elementToAppendTo);

                    if (!options.signatureIsReadOnly) {
                        var query, goToSigPad = function () {
                            //TODO Set signatureId with centralized access to loaded entities in new datamanager
                            query = parameters.get();
                            query.signatureId = field.get("Id");
                            parameters.set({params: query, section: {name: "signature"}});
                        };
                        $("#sigPadOpener").on('click', document.getElementById("sigPadOpener"), function () {
                            if (field.Value) {
                                var r = confirm("Are you sure you would like to overwrite the signature for the current service?");
                                if (r) {
                                    goToSigPad();
                                }
                            } else {
                                goToSigPad();
                            }
                        });
                    }

                    //update the svg by creating a temp
                    //jsignature to convert the data to an svg
                    var signatureData = field.get("Value");
                    if (signatureData) {
                        var tempSig = $("<div></div>");
                        tempSig.appendTo(elementToAppendTo);
                        tempSig.jSignature();
                        tempSig.jSignature("setData", "data:image/jsignature;base30," + signatureData);
                        var svgString = tempSig.jSignature("getData", "svgbase64").join(",");
                        fieldElement[1].firstChild.firstChild.setAttribute("src", "data:" + svgString);
                        tempSig.remove();
                    }

                    return fieldElement;
                }
            },

            //endregion

            render: function (service) {
                var that = this;

                that.trigger(DATABINDING);

                that.element.empty();

                if (!service) {
                    return;
                }

                //Add all the fields
                $('<h1 class="serviceFields">Service Fields</h1>').appendTo(that.element);
                var fieldsListView = $('<ul id="fields"></ul>').appendTo(that.element);
                var checkLists = $('<ul id="checkLists"></ul>').appendTo(that.element);
                var sigListView = $('<ul id="sigListView"></ul>').appendTo(that.element);

                var fieldIndex;
                for (fieldIndex = 0; fieldIndex < service.Fields.length; fieldIndex++) {
                    var field = service.Fields[fieldIndex];

                    //Location Destination is manually handled for now
                    if (field.Type === "LocationField") {
                        continue;
                    }

                    //Checkbox (1) or checklist (2)
                    var checkField = field.Type === "OptionsField" && (field.TypeInt === 1 || field.TypeInt === 2);

                    var elementToAppendTo;
                    if (checkField) {
                        elementToAppendTo = checkLists;
                    } else if (field.Type === "SignatureField") {
                        elementToAppendTo = sigListView;
                    } else {
                        elementToAppendTo = fieldsListView;
                    }

                    var factory = that._fieldFactories[field.Type];

                    if (!factory) {
                        continue;
                    }

                    var fieldElement = factory(field, fieldIndex, elementToAppendTo, that.options);

                    //setup the tooltip
                    if (field.ToolTip) {
                        fieldElement.attr("title", field.ToolTip);
                        //use jquery tooltip plugin http://docs.jquery.com/Plugins/Tooltip
                        //this removes the title attribute and adds a custom tooltip
                        //important because having a title messes up the validation messages
                        fieldElement.tooltip({
                            left: -65
                        });
                    }

                    //add "required" to the element if it's required
                    if (field.Required) {
                        fieldElement.attr("required", "required");
                    }

                    if (field.Name) {
                        var name = field.Name.replace(/\s/g, "");
                        name.toLowerCase();
                        fieldElement.attr("name", name);
                    }

                    //setup the value binding for TextBoxField
                    //the others are handled manually
                    if (field.Type === "TextBoxField") {
                        var dataBindAttr = "value: Fields[" + fieldIndex + "].Value";
                        fieldElement.attr("data-bind", dataBindAttr);
                    }
                }

                kendo.bind(fieldsListView, service, kendo.mobile.ui);
                kendo.bind(checkLists, service, kendo.mobile.ui);

                that.trigger(DATABOUND);

                //wait until data is bound
                //then setup autosize to keep textarea the right size
                _.delay(function () {
                    fieldsListView.find('textarea').autosize();
                }, 200);
            },
            options: new kendo.data.ObservableObject({
                name: "ServiceDetails",
                clientIsReadOnly: false,
                signatureIsReadOnly: false
            })
        });

        ui.plugin(ServiceDetails);

        kendo.data.binders.service = kendo.data.Binder.extend(({
            init: function (element, bindings, options) {
                kendo.data.Binder.fn.init.call(this, element, bindings, options);
            },

            refresh: function (e) {
                var service = this.bindings.service.get();
                var serviceDetails = $(this.element).data("kendoServiceDetails");
                if (serviceDetails) {
                    serviceDetails.render(service);
                }
            }
        }));
    });