﻿angular.module("foundOPS").controller('colorController', function($scope) {
    var colors = [
        "#0099ff", //light blue
        "#FF9900", //orange
        "#00ff00", //lime green
        "#990000", //dark red
        "#FFEE00", //yellow
        "#660099", //purple
        "#ff0000", //red
        "#663300", //brown
        "#FF00CC", //pink
        "#006600"  //dark green
    ];
    var colorIndex = 0;
    var routeColors = [];
    var minOpacity = .3;
    var maxOpacity = .8;

    var getOpacity = function(index) {
    };

    $scope.getRouteColor = function(routeId) {
        //check if routeId is in RouteColors
        for (var obj in routeColors) {
            if (obj.Id == routeId)
                return obj.color;
        }
        routeColors.push(new routeColor(routeId, colors[colorIndex]));
        var color = colors[colorIndex];

        colorIndex++;
        if (colorIndex > 9)
            colorIndex = 0;

        return color;
    };

    var routeColor = function(routeId, color) {
        this.color = color;
        this.routeId = routeId;
    };
});