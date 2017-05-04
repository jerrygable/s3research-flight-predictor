//
// Copyright (c)2014 Jerry Gable (www.s3research.com)
// Except where otherwise noted, this work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.
// http://creativecommons.org/licenses/by-nc/4.0/
//

// this function inserts the prediction in the table and draws it on the map
function insertPredictionResults (predData) {
    var tmpID = nextPredictionID;
    nextPredictionID++;  // increment before in case one of the below fails. We don't want to repeat.
    dbg(1, "Starting Table Insertion");
    insertPredictionInTable(tmpID, predData);
    // only show the first 12 altitude profiles.  Beyond that the refresh rate gets slow.
    if (tmpID <= 10) {
        dbg(1, "Starting Altitude Graph");
        insertPredictiononGraph(tmpID, predData);
    } else if (tmpID == 11) {
        alert("Only the first 10 predictions have altitude graphed");
    }
    dbg(1, "Starting Map Insertion");
    insertPredictionOnMap(tmpID, predData);
    dbg(1, "Done inserting Prediction Results");

}

// add the data to the altitude graph
function insertPredictiononGraph (predNum, predData) {
    for (var i=0; i < predData.waypoints.length; i++) {
        var tmpAlt = new Object();
        tmpAlt.timestamp = (predData.waypoints[i].timestamp/60).toFixed(1);
        tmpAlt['ID'+predNum] = (predData.waypoints[i].alt * 3.28084).toFixed(0);
        altChartData.push(tmpAlt); 
    }
    var newUnitInterval = Number((tmpAlt.timestamp/30).toFixed(0));
    if (newUnitInterval > altChartSettings.categoryAxis.unitInterval) {
        altChartSettings.categoryAxis.unitInterval = newUnitInterval;
        altChartSettings.categoryAxis.tickMarksInterval = newUnitInterval;
        altChartSettings.categoryAxis.gridLinesInterval = newUnitInterval*2;
    }
    altChartSettings.seriesGroups[0].series.push({dataField: 'ID'+predNum, displayText: 'ID-'+predNum, lineColor: '#'+markerColorArray[predNum % 10], fillColor: '#'+markerColorArray[predNum % 10]});
    $('#altGraphArea').jqxChart('refresh');

}



// This function extracts the data from the predData array and plots it on the map
function insertPredictionOnMap  (predNum, predData) {
    var markerdata = new Array();
    var linedata = new Array();
    // do all of the waypoint markers
    for (var i=0; i < predData.waypoints.length; i++) {
        if (predData.waypoints[i].phase == 'ascent') {
            var iconUrl = "mapMarkers/grnBox.png";
        } else if (predData.waypoints[i].phase == 'float') {   
            var iconUrl = "mapMarkers/orgBox.png";
        } else {
            var iconUrl = "mapMarkers/redBox.png";
        }
        if (predData.waypoints[i].timestamp > 10800) {
            var tempTS = (predData.waypoints[i].timestamp/(3600)).toFixed(1) + ' Hrs.';
        } else {
            var tempTS = (predData.waypoints[i].timestamp/60).toFixed(1) + ' Min.'
        }
        var tmpMkr = {latLng:[predData.waypoints[i].lat, predData.waypoints[i].lng],
            data:'<div style="width:145px;height:120px"><b>Waypoint: '+predData.waypoints[i].id+'</b><br>' +
                    'Prediction: ID-' + predNum + '<br>' +
                    'Timestamp: '+tempTS + '<br>' +
                    'Latitude: '+predData.waypoints[i].lat.toFixed(5) + '<br>' +
                    'Longitude: '+predData.waypoints[i].lng.toFixed(5) + '<br>' +
                    'Altitude: '+(predData.waypoints[i].alt * 3.28084).toFixed(0)+ ' Ft.<br>' +
                    'Phase: '+predData.waypoints[i].phase + '<br>' +
                    '</div>',
            tag: "wpMarker_"+predNum,
            options:{
                icon: {
                    url : iconUrl,
                    origin : new google.maps.Point(3, 3),
                    anchor : new google.maps.Point( 3, 3 )
                },
                visible: false,
                zIndex: 0
            }
        }
        markerdata.push(tmpMkr);
        linedata.push([predData.waypoints[i].lat, predData.waypoints[i].lng]);
    }
    // now for the launch, burst, & touchdown markers
    // pick out a marker color
    var mkrColor = markerColorArray[predNum % 10];
    var lineColor = lineColorArray[predNum % 10];
    var tmpMkr = {latLng:[predData.keypoints.launch.lat, predData.keypoints.launch.lng],
        data:'<div style="width:135px;height:140px"><b>Launch</b><br>' +
                predData.name + '<br>' +
                'Prediction: ID-' + predNum + '<br>' +
                'Timestamp: 00.0 Min.<br>' +
                'Latitude: '+predData.keypoints.launch.lat.toFixed(5) + '<br>' +
                'Longitude: '+predData.keypoints.launch.lng.toFixed(5) + '<br>' +
                'Altitude: '+(predData.keypoints.launch.alt * 3.28084).toFixed(0)+ ' Ft.<br>' +
                '</div>',
        tag: "launchMarker_"+predNum,
        options:{
            icon: { 
                url: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter_withshadow&chld=L|'+mkrColor+'|000000',
                anchor: new google.maps.Point( 10, 35 )
            },
            zIndex: predNum
        }
    }
    markerdata.push(tmpMkr);
    // if there is a float marker put it on the map
    if ("floatStart" in predData.keypoints) {
        if (predData.keypoints.floatStart.timestamp > 10800) {
            var tempTS = (predData.keypoints.floatStart.timestamp/(3600)).toFixed(1) + ' Hrs.';
        } else {
            var tempTS = (predData.keypoints.floatStart.timestamp/60).toFixed(1) + ' Min.'
        }
        var tmpMkr = {latLng:[predData.keypoints.floatStart.lat, predData.keypoints.floatStart.lng],
            data:'<div style="width:145px;height:140px"><b>Float</b><br>' +
                    predData.name + '<br>' +
                    'Prediction: ID-' + predNum + '<br>' +
                    'Timestamp: '+ tempTS + '<br>' +
                    'Latitude: '+predData.keypoints.floatStart.lat.toFixed(5) + '<br>' +
                    'Longitude: '+predData.keypoints.floatStart.lng.toFixed(5) + '<br>' +
                    'Altitude: '+(predData.keypoints.floatStart.alt * 3.28084).toFixed(0)+ ' Ft.<br>' +
                    '</div>',
            tag: "floatMarker_"+predNum,
            options:{
                icon: { 
                    url: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter_withshadow&chld=F|'+mkrColor+'|000000',
                    anchor: new google.maps.Point( 10, 35 )
                },
                zIndex: predNum
            }
        }
        markerdata.push(tmpMkr);
    }
    if (predData.keypoints.burst.timestamp > 10800) {
        var tempTS = (predData.keypoints.burst.timestamp/(3600)).toFixed(1) + ' Hrs.';
    } else {
        var tempTS = (predData.keypoints.burst.timestamp/60).toFixed(1) + ' Min.'
    }
    var tmpMkr = {latLng:[predData.keypoints.burst.lat, predData.keypoints.burst.lng],
        data:'<div style="width:145px;height:140px"><b>Burst</b><br>' +
                predData.name + '<br>' +
                'Prediction: ID-' + predNum + '<br>' +
                'Timestamp: '+ tempTS + '<br>' +
                'Latitude: '+predData.keypoints.burst.lat.toFixed(5) + '<br>' +
                'Longitude: '+predData.keypoints.burst.lng.toFixed(5) + '<br>' +
                'Altitude: '+(predData.keypoints.burst.alt * 3.28084).toFixed(0)+ ' Ft.<br>' +
                '</div>',
        tag: "burstMarker_"+predNum,
        options:{
            icon: { 
                url: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter_withshadow&chld=B|'+mkrColor+'|000000',
                anchor: new google.maps.Point( 10, 35 )
            },
            zIndex: predNum
        }
    }
    markerdata.push(tmpMkr);
    if (predData.keypoints.touchdown.timestamp > 10800) {
        var tempTS = (predData.keypoints.touchdown.timestamp/(3600)).toFixed(1) + ' Hrs.';
    } else {
        var tempTS = (predData.keypoints.touchdown.timestamp/60).toFixed(1) + ' Min.'
    }
    // no weather cycle for non prediction entries
    if (predData.type == 'Prediction') { 
        var wCycle = 'Forecast: '+predData.forecastCycleTime.format("yyyyMMddHH");
    } else {
        var wCycle = "";
    }
    var tmpMkr = {latLng:[predData.keypoints.touchdown.lat, predData.keypoints.touchdown.lng],
        data:'<div style="width:145px;height:220px"><b>Touchdown</b><br>' +
                predData.name + '<br>' +
                'Prediction: ID-' + predNum + '<br>' +
                'Callsign: ' + predData.callsign + '<br>' +
                'Timestamp: '+ tempTS + '<br>' +
                'Latitude: '+predData.keypoints.touchdown.lat.toFixed(5) + '<br>' +
                'Longitude: '+predData.keypoints.touchdown.lng.toFixed(5) + '<br>' +
                'Altitude: '+(predData.keypoints.touchdown.alt * 3.28084).toFixed(0)+ ' Ft.<br>' +
                'Ascent: '+(predData.ascentRate * 3.28084 * 60).toFixed(0)+ ' Ft/Min.<br>' +
                'Descent: '+(predData.descentRate * 3.28084 * 60).toFixed(0)+ ' Ft/Min.<br>' +
                wCycle + '<br>' +
                '</div>',
        tag: "touchdownMarker_" + predNum,
        options:{
            icon: { 
                url: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter_withshadow&chld='+predNum+'|'+mkrColor+'|000000',
                anchor: new google.maps.Point( 10, 35 )
            },
            zIndex: predNum
        }
    }
    markerdata.push(tmpMkr);
    drawPrediction(markerdata, linedata, "flightLine_" + predNum, lineColor);

}

// This actually does the plotting on the map
function drawPrediction(markerdata, linedata, lineTag, lineColor) {
    dbg(1, "Drawing on Map.");
    dbg(2, "  Marker Count: " + markerdata.length);
    dbg(2, "  Line Data: " + JSON.stringify(linedata));
    $('#gmapArea').gmap3({
        marker:{
            values: markerdata,
            options:{
                draggable: false
            },
            events:{
                click: function(marker, event, context){
                    var map = $(this).gmap3("get"),
                      infowindow = $(this).gmap3({get:{name:"infowindow"}});
                    if (infowindow){
                      infowindow.open(map, marker);
                      infowindow.setContent(context.data);
                    } else {
                      $(this).gmap3({
                        infowindow:{
                          anchor:marker,
                          options:{content: context.data}
                        }
                      });
                    }
                }
            }
        },
        polyline:{
            options:{
                strokeColor: "#" + lineColor,
                strokeOpacity: 1.0,
                strokeWeight: 2,
                path: linedata
            },
            tag: lineTag
        },         
    });
}

// insert a prediction in the prediction table
function insertPredictionInTable(predNum, predData) {
    // do the calculations first
    var launchPoint = new google.maps.LatLng(predData.keypoints.launch.lat, predData.keypoints.launch.lng);
    if ("floatStart" in predData.keypoints) {
        if (predData.keypoints.floatStart.timestamp > 10800) {
            var fsTime = (predData.keypoints.floatStart.timestamp/(3600)).toFixed(1) + ' Hrs';
        } else {
            var fsTime = (predData.keypoints.floatStart.timestamp/60).toFixed(1) + ' Min'
        }
        var fsAlt = (predData.keypoints.floatStart.alt * 3.28084).toFixed(0);
        var fsPoint = new google.maps.LatLng(predData.keypoints.floatStart.lat, predData.keypoints.floatStart.lng);
        var fsDist = ((google.maps.geometry.spherical.computeDistanceBetween(launchPoint, fsPoint)) * 0.000621371).toFixed(1) + ' Mi';
        var fsLat = predData.keypoints.floatStart.lat;
        var fsLng = predData.keypoints.floatStart.lng;
    } else {
        var fsTime = "";
        var fsAlt = "";
        var fsDist = "";
        var fsLat = "";
        var fsLng = "";
    }
    var burstPoint = new google.maps.LatLng(predData.keypoints.burst.lat, predData.keypoints.burst.lng);
    var burstDist = ((google.maps.geometry.spherical.computeDistanceBetween(launchPoint, burstPoint)) * 0.000621371).toFixed(1) + ' Mi';
    var tdPoint = new google.maps.LatLng(predData.keypoints.touchdown.lat, predData.keypoints.touchdown.lng);
    var tdDist = ((google.maps.geometry.spherical.computeDistanceBetween(launchPoint, tdPoint)) * 0.000621371).toFixed(1) + ' Mi';
    if (predData.keypoints.burst.timestamp > 10800) {
        var brstTime = (predData.keypoints.burst.timestamp/(3600)).toFixed(1) + ' Hrs';
    } else {
        var brstTime = (predData.keypoints.burst.timestamp/60).toFixed(1) + ' Min'
    }
    if (predData.keypoints.touchdown.timestamp > 10800) {
        var tdTime = (predData.keypoints.touchdown.timestamp/(3600)).toFixed(1) + ' Hrs';
    } else {
        var tdTime = (predData.keypoints.touchdown.timestamp/60).toFixed(1) + ' Min'
    }
    
    
    var tmpPred = {
        'id'        : predNum,
        'type'      : predData.type,
        'name'      : predData.name,
        'callsign'  : predData.callsign,
        'lnchTime'  : "0.0 Min",
        'lnchAlt'   : (predData.keypoints.launch.alt * 3.28084).toFixed(0),
        'lnchDist'  : "0.0 Mi",
        'floatTime' : fsTime,
        'floatAlt'  : fsAlt,
        'floatDist' : fsDist,
        'brstTime'  : brstTime,
        'brstAlt'   : (predData.keypoints.burst.alt * 3.28084).toFixed(0),
        'brstDist'  : burstDist,
        'tdTime'    : tdTime,
        'tdAlt'     : (predData.keypoints.touchdown.alt * 3.28084).toFixed(0),
        'tdDist'    : tdDist,
        'showWP'    : false,
        'showL'     : true,
        'showF'     : true,        
        'showB'     : true,
        'showTD'    : true,
        'showLine'  : true,
        'lnchLat'   : predData.keypoints.launch.lat,
        'lnchLng'   : predData.keypoints.launch.lng,
        'fsLat'     : fsLat,
        'fsLng'     : fsLng,
        'brstLat'   : predData.keypoints.burst.lat,
        'brstLng'   : predData.keypoints.burst.lng,
        'tdLat'     : predData.keypoints.touchdown.lat,
        'tdLng'     : predData.keypoints.touchdown.lng
    };                
    // insert into the table
    $("#predTable").jqxGrid('addrow', null, tmpPred);

}


// show or hide the item selected
function showHide (id, datafield, value) {
    switch(datafield) {
        case 'showWP':
            var typeName = 'marker';
            var tagName = 'wpMarker_' + id;
            break;
        case 'showL':
            var typeName = 'marker';
            var tagName = 'launchMarker_' + id;
            break;
        case 'showB':
            var typeName = 'marker';
            var tagName = 'burstMarker_' + id;
            break;
        case 'showTD':
            var typeName = 'marker';
            var tagName = 'touchdownMarker_' + id;
            break;
        case 'showLine':
            var typeName = 'polyline';
            var tagName = 'flightLine_' + id;
            break;
        case 'showF':
            var typeName = 'marker';
            var tagName = 'floatMarker_' + id;
            break;
    } 
    // get the items that match the tag
    var items = $("#gmapArea").gmap3({
      get: {
        name: typeName,
        tag: tagName,
        all: true
      }
    });
    // change the visibility for all in the list
    $.each(items, function(i, marker){
      marker.setVisible(value);
    });
}

// zoom in to show all visible Launch, burst, & touchdown markers
// NOTE: This was done because the autofit in gmap3 appears to have a bug in it.
function autoZoomMap () {

    var rows = $('#predTable').jqxGrid('getrows');
    var minlat = 90;
    var maxlat = -90;
    var minlng = 180;
    var maxlng = -180;
    for(var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.showL == true) {
            if (row.lnchLat < minlat) {minlat=row.lnchLat;}
            if (row.lnchLat > maxlat) {maxlat=row.lnchLat;}
            if (row.lnchLng < minlng) {minlng=row.lnchLng;}
            if (row.lnchLng > maxlng) {maxlng=row.lnchLng;}
        }
        if (row.showB == true) {
            if (row.brstLat < minlat) {minlat=row.brstLat;}
            if (row.brstLat > maxlat) {maxlat=row.brstLat;}
            if (row.brstLng < minlng) {minlng=row.brstLng;}
            if (row.brstLng > maxlng) {maxlng=row.brstLng;}
        }
        if (row.showTD == true) {
            if (row.tdLat < minlat) {minlat=row.tdLat;}
            if (row.tdLat > maxlat) {maxlat=row.tdLat;}
            if (row.tdLng < minlng) {minlng=row.tdLng;}
            if (row.tdLng > maxlng) {maxlng=row.tdLng;}
        }
        if (row.showF == true && row.fsLat !="") {
            if (row.fsLat < minlat) {minlat=row.fsLat;}
            if (row.fsLat > maxlat) {maxlat=row.fsLat;}
            if (row.fsLng < minlng) {minlng=row.fsLng;}
            if (row.fsLng > maxlng) {maxlng=row.fsLng;}
        }
        
    }
    // only do this if we have some points showing
    if ( minlat != 90 &&
                maxlat != -90 &&
                minlng != 180 &&
                maxlng != -180) {
        //  Pick the min and max numbers to form a box around the markers
        var LatLngList = new Array (new google.maps.LatLng (minlat, minlng), new google.maps.LatLng (maxlat, maxlng));
        //  Create a new viewpoint bound
        var bounds = new google.maps.LatLngBounds ();
        //  Go through each...
        for (var i = 0, LtLgLen = LatLngList.length; i < LtLgLen; i++) {
          //  And increase the bounds to take this point
          bounds.extend (LatLngList[i]);
        }
        //  Fit these bounds to the map
        var map=$('#gmapArea').gmap3({'get' : 'map'});
        map.fitBounds(bounds);
    }
}

// function to add a ruler to the map
// doesn't use gmap3 library, just calls google functions directly.
function addruler (checked) {
    var map=$('#gmapArea').gmap3({'get' : 'map'});
    if (checked == true) {
        // show the ruler
        ruler1 = new google.maps.Marker({
            position: map.getCenter() ,
            map: map,
            options:{icon: "mapMarkers/yellow-dot.png"},
            draggable: true,
            zIndex: 999
        });
     
        ruler2 = new google.maps.Marker({
            position: map.getCenter() ,
            map: map,
            options:{icon: "mapMarkers/yellow-dot.png"},
            draggable: true,
            zIndex: 999
        });
         
        rulerpoly = new google.maps.Polyline({
            path: [ruler1.position, ruler2.position] ,
            strokeColor: "#FFFF00",
            strokeOpacity: .7,
            strokeWeight: 4
        });
        rulerpoly.setMap(map);
     
     
        google.maps.event.addListener(ruler1, 'drag', function() {
            showRulerLen();
        });
     
        google.maps.event.addListener(ruler2, 'drag', function() {
            showRulerLen();
        });
    } else {
        // hide the ruler
        ruler1.setMap(null);
        ruler2.setMap(null);
        rulerpoly.setMap(null);
        $("#rulerLen").html("xxx.xx");
    }
}

function showRulerLen() {
    rulerpoly.setPath([ruler1.getPosition(), ruler2.getPosition()]);
    var rulerDist = google.maps.geometry.spherical.computeDistanceBetween(ruler1.getPosition(),ruler2.getPosition());
    if (rulerDist > 1609.34) {
        rulerDist = rulerDist / 1609.34;
        $("#rulerUnit").html("Miles");
    } else {
        rulerDist = rulerDist * 3.28084;
        $("#rulerUnit").html("Feet");
    }
    rulerDist = rulerDist.toFixed(2);
    $("#rulerLen").html(rulerDist);
}

// called when the delete Prediction clicked
function deletePrediction () {
    var rowindex = $('#predTable').jqxGrid('getselectedrowindex');
    var rowscount = $("#predTable").jqxGrid('getdatainformation').rowscount;
    if (rowindex >= 0 && rowindex < rowscount) {
        //Open the ok cancel window and go to DeleteRowConfirmClosed when it closes 
        $('#DeleteRowConfirm').jqxWindow('open');
    } else {
        alert("Select a row first.");
    }
}

// do the actual deletion when the dialog box closes and OK was selected
function DeleteRowConfirmClosed (event) {
    if (event.args.dialogResult.OK) {
        var rowindex = $('#predTable').jqxGrid('getselectedrowindex');
        // delete this id from the map
        var id = $('#predTable').jqxGrid('getcellvalue', rowindex, "id");
        $('#gmapArea').gmap3({
            clear: {
                tag: ['wpMarker_' + id, 'launchMarker_' + id, 'burstMarker_' + id, 'touchdownMarker_' + id, 'flightLine_' + id, 'floatMarker_' + id]
            }
        });
        // delete the line from the Altitude Graph
        var seriesArray = altChartSettings.seriesGroups[0].series;
        var newSeriesArray = [];
        // find the id we want
        for(var i = 0; i < seriesArray.length; i++) { 
            if (seriesArray[i].dataField != 'ID'+id) {
                // put in the ones we want to keep
                newSeriesArray.push(seriesArray[i]);
            }
        }
        altChartSettings.seriesGroups[0].series = newSeriesArray;
        $('#altGraphArea').jqxChart('refresh');

        // and delete the row out of the table
        var rowid = $("#predTable").jqxGrid('getrowid', rowindex);
        $('#predTable').jqxGrid('deleterow', rowid);
    }
}

function showWeatherOnMap () {
    // see if we have weather data
    if (windBoxes.length > 0) {
        var on = $('#showWeather').is(':checked');
        if (on == true) {
            for(var j = 0; j < windBoxes.length; j++) { 
                var leftLng = windBoxes[j].leftLng;
                var rightLng = windBoxes[j].rightLng;
                var topLat = windBoxes[j].topLat;
                var botLat = windBoxes[j].botLat;
                $('#gmapArea').gmap3({
                    rectangle:{
                        options:{
                            bounds: {n: topLat, e: rightLng, s: botLat, w: leftLng},
                            radius : 750,
                            fillOpacity: 0.1,
                            fillColor : "#000088",
                            strokeOpacity: 0.5,
                            strokeColor : "#0000FF"
                        },
                        tag: "weatherArea"
                    }
                });
                
                // draw the horizontal lines
                for(var i = botLat+.5; i < topLat; i+=.5) {  
                    $('#gmapArea').gmap3({
                        polyline:{
                            options:{
                                strokeColor: "#0000FF",
                                strokeOpacity: .5,
                                strokeWeight: 1,
                                path: [
                                    [i, rightLng],
                                    [i, leftLng]
                                  ]
                            },
                            tag: "weatherArea"
                        },         
                    });
                }
                for(var i = leftLng+.5; i < rightLng; i+=.5) {  
                    $('#gmapArea').gmap3({
                        polyline:{
                            options:{
                                strokeColor: "#0000FF",
                                strokeOpacity: .5,
                                strokeWeight: 1,
                                path: [
                                    [botLat, i],
                                    [topLat, i]
                                  ]
                            },
                            tag: "weatherArea"
                        },         
                    });
                }
            }
        } else {
            $('#gmapArea').gmap3({
                clear: {
                  tag: "weatherArea"
                }                    
            });
        }
    } else {
        // no weather data loaded
        $('#showWeather').prop('checked', false); // can't check the box
        alert("Weather Data not loaded");
    }
}

