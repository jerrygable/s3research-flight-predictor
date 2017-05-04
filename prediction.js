//
// Copyright (c)2014 Jerry Gable (www.s3research.com)
// Except where otherwise noted, this work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.
// http://creativecommons.org/licenses/by-nc/4.0/
//





// Prep for the prediction
function predictionClicked() {
    dbg(1, "Prediction calculation starting"); 
    // gather the info for the prediction
    
    // hide any previous results
    $('#predData').hide();
    $('#saveButton').hide();
    $('#genOverlayDIV').hide();

    // get the forecast cycle and convert it to a date
    var FCS = $("#forecastCycle").val().toString() + "00";
    var forecastCycleTime = new Date();
    forecastCycleTime = Date.parseString(FCS, "yyyyMMddHHmm");

    // put together the launch time
    var launchTime = new Date($('#PILaunchDate').jqxDateTimeInput('getDate'));
    var timepart = new Date(Date.parseString($("#PILaunchTime").val(), "H:m"));
	launchTime.clearTime(); // remove the time part
    launchTime.add('h',timepart.getHours());
    launchTime.add('m',timepart.getMinutes());
    
var tmpD1 = launchTime.format("yyyy MM dd HH:mm"); 
    
    // Put the prediction details in an object and convert to feet to meters
    // currentPrediction is declared at the top level (Global variable)
    currentPrediction = {
        type: 'Prediction',
        launchLat : Number($('#PILat').val()),
        launchLng : Number($('#PILong').val()),
        launchAlt : 250, /* default Alt meters*/
        burstAlt : Number($('#PIBurst').val()) * 0.3048, /* meters */
        ascentRate : Number($('#PIAscent').val()) * 0.3048 / 60, /* m/s */
        descentRate : Number($('#PIDescent').val()) * 0.3048 / 60, /* m/s */
        name : $('#PIFlightName').val(),
        callsign : $('#PICallsign').val(),
        launchTime : launchTime,
		launchTimeString : launchTime.format("yyyy MM dd HH:mm"),
        forecastCycleTime : forecastCycleTime,
		forecastCycleTimeString : forecastCycleTime.format("yyyy MM dd HH:mm")
    };
    
    if (currentPrediction.forecastCycleTime > currentPrediction.launchTime  || (currentPrediction.launchTime - currentPrediction.forecastCycleTime) > (195 * 60 * 60 * 1000)) {
        dbg(1, "Flight time is out of the prediction window"); 
        alert( "Flight time is out of the prediction window");
        return;
    }
    // put in the optional Launch & TD alts  as well as the float time
    if ($('#PIAutoLnch').is(':checked')) {
        // we are going to use the Auto Launch Altitude
        currentPrediction.launchAlt = 0;
    } else {
        var tmp1 = $('#PILnchAlt').val();
        if (!isNaN(parseFloat(tmp1)) && isFinite(tmp1)) {
            currentPrediction.launchAlt = Number(tmp1)  * 0.3048;  // to meters
        } else {
            currentPrediction.launchAlt = 0;
            $('#PILnchAlt').val(0);
        }
    }
    if ($('#PIAutoTD').is(':checked')) {
        // we are going to use the Auto Launch Altitude
        currentPrediction.TDTargetAlt = 0;
    } else {
        var tmp1 = $('#PITDAlt').val();
        if (!isNaN(parseFloat(tmp1)) && isFinite(tmp1)) {
            currentPrediction.TDTargetAlt = Number(tmp1)  * 0.3048;  // to meters
        } else {
            currentPrediction.TDTargetAlt = 0;
            $('#PITDAlt').val(0);
        }
    }
    if ($('#PIFloatChk').is(':checked')) {
        var tmp1 = $('#PIFloatTime').val();
        if (!isNaN(parseFloat(tmp1)) && isFinite(tmp1)) {
            currentPrediction.floatTime = Number(tmp1)  * 60;  // to seconds
        } else {
            currentPrediction.floatTime = 0;
            $('#PIFloatTime').val(0);
        }
    } else {
        currentPrediction.floatTime = 0;
    }
    
    if (currentPrediction.launchAlt == 0) {
        // If 0 get the alt from Google
        // get the launch site altitude
        // Create an ElevationService
        elevator = new google.maps.ElevationService();
        // Create a LocationElevationRequest object using the array's one value
        var launchLoc = [];
        launchLoc.push(new google.maps.LatLng(currentPrediction.launchLat, currentPrediction.launchLng));
        var positionalRequest = {
            'locations': launchLoc
        }
        // Initiate the location request with callback when returned
        elevator.getElevationForLocations(positionalRequest, function(results, status) {
            if (status == google.maps.ElevationStatus.OK) {
                // Retrieve the first result
                if (results[0]) {
                    currentPrediction.launchAlt = results[0].elevation;
                    // run the prediction calculations
                    var tmpObj = new Object(); 
                    tmpObj.currentPrediction = currentPrediction;
                    tmpObj.debugLevel = debugLevel;
                    tmpObj.status = 0;
                    worker.postMessage(tmpObj);
                } else {
                    dbg(0, "No altitude found for launch location");
                    alert("No altitude found for launch location");
                }
            } else {
                dbg(0, "Elevation request failed for launch location due to: " + status);
                alert("Elevation request failed for launch location due to: " + status);
            }
        });
    } else {
        // use the provided launch alt
        // run the prediction calculations
        var tmpObj = new Object(); 
        tmpObj.currentPrediction = currentPrediction;                  
        tmpObj.debugLevel = debugLevel;
        tmpObj.status = 0;
        worker.postMessage(tmpObj);
    }
}

// we need to make sure the prediction is done before continuing
var waitcount = 0;
function waitForPredictionDone () {
    // we are done when we have a touchdown entry
    if (typeof currentPrediction != "undefined" &&
            typeof currentPrediction.keypoints != "undefined" &&
            typeof currentPrediction.keypoints.touchdown != "undefined") {
        dbg(1, "Waited " + waitcount + "00 milliseconds for prediction calculations.");
        // The prediction is done, display the data
        // show the prediction details div
        var tmpTable = '<table border="0" style="margin-left:auto; margin-right:auto;">';
        tmpTable += "<tr><th>Key Point</th><th>Waypoint<br>Number</th><th>Time<br>(Minutes)</th><th>Latitude</th><th>Longitude</th><th>Altitude<br>(Feet)</th></tr>";
        tmpTable += insertPredRow ("Launch", currentPrediction.keypoints.launch);
        if ("floatStart" in currentPrediction.keypoints) {
            tmpTable += insertPredRow ("Float", currentPrediction.keypoints.floatStart);
        }
        tmpTable += insertPredRow ("Burst", currentPrediction.keypoints.burst);
        tmpTable += insertPredRow ("Touchdown", currentPrediction.keypoints.touchdown);
        tmpTable += "</table>";
        $('#predData').show();
        $('#predData').html(tmpTable);
        $('#saveButton').show();
        $('#genOverlayDIV').show();
        $('#windFileLoading').hide(); // hide the loading message
        $('#PIGeneratePred').jqxButton({disabled: false });
        $('#currentState').text('...');
        clearInterval(windloadTimeout); // stop the wind load progress bar
        windloadTimeoutValue = 0;
        $("#windLoadProgressBar").val(0);
        // insert the results into the map and table
        insertPredictionResults(currentPrediction);    
    } else {
        // prediction not done do this again after 100ms
        waitcount++;
        if (waitcount > 100) {
            dbg(0, "ERROR: flight prediction calculations did not complete in 10 seconds.");
            alert("ERROR: flight prediction calculations did not complete in 10 seconds.");
            return;
        }
        window.setTimeout(waitForPredictionDone, 100);
    }
}

function insertPredRow (label, data) {
    // data is an object with the following items:
    //    'id' 'timestamp' 'lat' 'lng' 'alt'
    var tmp ="<tr>";
    var td = '<td style="text-align: right; padding-right: 20px;">';
    tmp += td + label + "</td>";
    tmp += td + data.id + "</td>";
    tmp += td + (data.timestamp/60).toFixed(1) + "</td>";
    tmp += td + data.lat.toFixed(5) + "</td>";
    tmp += td + data.lng.toFixed(5) + "</td>";
    tmp += td + (data.alt * 3.28084).toFixed(0) + "</td>";
    tmp +="</tr>"
    return tmp;
    }

// handler to save the flight prediction
function savePredictionHandler (handler) {
    var retObj = new Object();
    retObj.filename = "flightPred.pred";
    retObj.data = JSON.stringify(currentPrediction, null, "    ");
    return retObj;
}    

// this function processes the data returned from the worker (process prediction)
function processWorkerReturn (data) {
    switch (data.status) {
        case 0:
        
            break;
        case 1:
            $('#windFileLoading').show(); // show the loading message
            $('#PIGeneratePred').jqxButton({disabled: true });
            $('#currentState').text('calculating prediction...');
            // create a timer with a GLOBAL variable
            windloadTimeout = setInterval(function(){windloadTimer()},500);
            windloadTimeoutValue = 0;
            dbg(1, "Calculating prediction...");

            break;
        case 2:
            var reqInfo = data.info.lat.toFixed(1) + ", " + data.info.lng.toFixed(1) + ", " + data.info.forecastCycle + "+" + data.info.forecastHour;
            $('#currentState').html('downloading wind data...<br>Requesting: ' + reqInfo);
            dbg(1, "Downloading wind data...");
            break;
        case 3:
            $('#currentState').text('parsing wind data...');
            dbg(1, "Parsing wind data...");
            break;
        case 4:
            dbg(1, "Parser finished.");
            break;
        case 5:
            dbg(1, "Prediction finished");
            finishPrediction (data);
            break;
        case 99:
            // print a debug message from the worker
            console.log(data.dbgMsg);
            break;
        default:
    }
}

function finishPrediction (data) {
    currentPrediction = data.currentPrediction;
    windBoxes = data.windBoxes;
    var tmpWaypoints = data.tmpWaypoints;
    var TDLocs = data.TDLocs;
    
    // if we have any TDLocs we need to get the ground level from google
    if (TDLocs.length > 0) {
        // get the altitude of all of the decent locations
        dbg(1, "Starting google altitude request for touchdown altitude");
        var altService = new google.maps.ElevationService();
        var TDRequest = {
            'locations': TDLocs
        }
        // Initiate the location request with callback when returned
        altService.getElevationForLocations(TDRequest, function(results, status) {
            if (status == google.maps.ElevationStatus.OK) {
                // At this point we have the altitude of the ground at all the decent points
                // Figure out where the ground is
                for (var idx=0; idx < tmpWaypoints.length; idx++) {
                    if (results[idx].elevation > 0) {
                        var currentGndAlt = results[idx].elevation;
                    } else {
                        // if over the ocean we can be negative alt
                        var currentGndAlt = 0;
                    }
                    dbg(2, "    Checking tmpWaypoint " + idx + "  ID: "+ tmpWaypoints[idx].id + "  tmpAlt: " + tmpWaypoints[idx].alt + "  ground alt: " + currentGndAlt);
                    if (tmpWaypoints[idx].alt < currentGndAlt || tmpWaypoints[idx].alt==0) {
                        // we are below the ground level or sea level
                        break;
                    }
                    // still above the ground, just move to the currentPrediction.waypoints
                    currentPrediction.waypoints.push({
                        'id' : tmpWaypoints[idx].id, 
                        'timestamp' : tmpWaypoints[idx].timestamp, 
                        'lat' : tmpWaypoints[idx].lat,
                        'lng' : tmpWaypoints[idx].lng,
                        'alt' : tmpWaypoints[idx].alt,
                        'phase' : tmpWaypoints[idx].phase,
                        'rate' : tmpWaypoints[idx].rate
                    });
                }    
                // we are below ground level, recalculate this last section
                var zoneSeconds = (tmpWaypoints[idx-1].alt - currentGndAlt) /tmpWaypoints[idx].rate;
                var currentPoint = new google.maps.LatLng(tmpWaypoints[idx-1].lat, tmpWaypoints[idx-1].lng);
                var distance = zoneSeconds * tmpWaypoints[idx].windSpeed;
                var newLoc = google.maps.geometry.spherical.computeOffset(currentPoint, distance, tmpWaypoints[idx].windDir);
                currentPrediction.waypoints.push({
                    'id' : tmpWaypoints[idx].id, 
                    'timestamp' : tmpWaypoints[idx-1].timestamp + zoneSeconds, 
                    'lat' : newLoc.lat(),
                    'lng' : newLoc.lng(),
                    'alt' : currentGndAlt,
                    'phase' : tmpWaypoints[idx].phase,
                    'rate' : tmpWaypoints[idx].rate
                });    

                // we are at touchdown point.  add it to keypoints
                currentPrediction.keypoints.touchdown = {
                    'id' : tmpWaypoints[idx].id, 
                    'timestamp' : tmpWaypoints[idx].timestamp + zoneSeconds, 
                    'lat' : newLoc.lat(),
                    'lng' : newLoc.lng(),
                    'alt' : currentGndAlt
                }; 
                dbg(1, "  Touchdown Info: " + JSON.stringify(currentPrediction.keypoints.touchdown));
            } else {
                dbg(0, "Elevation request failed for touchdown location due to: " + status);
                alert("Elevation request failed for touchdown location due to: " + status);
            }
        });
    } else {
        // we don't have any temp waypoints
        // Put in the touchdown keypoint
        var lastWaypointIdx = currentPrediction.waypoints.length-1
        currentPrediction.keypoints.touchdown = {
            'id' : currentPrediction.waypoints[lastWaypointIdx].id, 
            'timestamp' : currentPrediction.waypoints[lastWaypointIdx].timestamp, 
            'lat' : currentPrediction.waypoints[lastWaypointIdx].lat,
            'lng' : currentPrediction.waypoints[lastWaypointIdx].lng,
            'alt' : currentPrediction.waypoints[lastWaypointIdx].alt
        }; 
        dbg(1, "  Touchdown Info: " + JSON.stringify(currentPrediction.keypoints.touchdown));
    }
    waitcount = 0; // clear the waitcount in case this is the second run
    waitForPredictionDone();  // because of google maps callbacks we may get here before the prediction is done
    
}


