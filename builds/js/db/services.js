//region Copyright 2012 FoundOPS LLC. All Rights Reserved.

define(["lib/kendo.all.min","developer","tools"],function(k,developer,tools){var services={};services.Status={LOADING:0,LOADED:1};var apiUrl,mode=developer.CURRENT_DATA_SOURCE;mode===developer.DataSource.LOCALAPI?apiUrl="http://localhost:9711/api/":mode===developer.DataSource.ANDROIDLA?apiUrl="http://10.0.2.2:9711/api/":mode===developer.DataSource.LIVE?apiUrl="http://api.foundops.com/api/":mode===developer.DataSource.TESTAPI&&(apiUrl="http://testapi.foundops.com/api/"),services.API_URL=apiUrl,services.setRoleId=function(roleId){services.RoleId=roleId},services._getHttp=function(queryString,opt_params,opt_excludeRoleId,opt_convertItem){var getThenInvokeCallback=function(callback){var params=opt_params||{};!opt_excludeRoleId&&services.RoleId&&(params.roleId=services.RoleId.toString());var url=services.API_URL+queryString;$.ajax({type:"GET",dataType:"JSONP",url:url,data:params}).success(function(response){var convertedData=response;opt_convertItem&&(convertedData=tools.convertArray(response,opt_convertItem)),callback(convertedData)})};return getThenInvokeCallback},services.getRoutes=function(serviceDateUtc,callback){return services._getHttp("routes/GetRoutes",{serviceDateUtc:serviceDateUtc},!1)(callback)},services.routesDataSource=new kendo.data.DataSource({transport:{read:{url:apiUrl+"routes/GetRoutes",type:"GET",dataType:"jsonp",contentType:"application/json; charset=utf-8"}}}),services.getDepots=services._getHttp("routes/GetDepots",{},!1),services.getResourcesWithLatestPoints=services._getHttp("trackpoint/GetResourcesWithLatestPoints",{},!1),services.getTrackPoints=function(serviceDateUtc,routeId,callback){return services._getHttp("trackPoint/GetTrackPoints",{routeId:routeId,serviceDateUtc:serviceDateUtc},!1)(callback)},services.authenticate=function(email,password,callback){return services._getHttp("auth/Login",{email:email,pass:password},!0,null)(callback)};var viewModel=kendo.observable({routesSource:services.routeDestinationsDataSource});return kendo.bind($("#route-listview"),viewModel),services})