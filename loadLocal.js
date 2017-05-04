//
// Copyright (c)2014 Jerry Gable (www.s3research.com)
// Except where otherwise noted, this work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.
// http://creativecommons.org/licenses/by-nc/4.0/
//


function loadPrediction () {
    // hide all of the options in the window to start
    $('#predictCSV').jqxButtonGroup('setSelection', -1);
    $('#CSVType').jqxButtonGroup('setSelection', -1);
    $("#selectLocalFileDiv").hide();
    $('#csvLoadOptions').hide();
    $('#loadLocalFile').jqxWindow('resize', 600, 200);
    $('#LFFlightName').val("");
    $('#loadLocalFile').jqxWindow('open');
    
}

// this gets called when someone selects the load Prediction or Load Flight
function loadFileTypeSelected () {
    // LoadPrediction=0 LoadFlight=1
    $("#selectLocalFileDiv").show();  // show the load file box
    if (loadLocalGlobals.predictOrCSV == 0) {
        // we are loading a prediction
        $('#csvLoadOptions').hide();
        $('#loadLocalFile').jqxWindow('resize', 600, 200);
    } else {
        $('#csvLoadOptions').show();
        $('#loadLocalFile').jqxWindow('resize', 600, 600);    
    }
    // Load the selected files
    var LFInput = document.getElementById('LFInput');
    // All the File APIs are supported.
    LFInput.addEventListener('change', function(e) {
        var file = LFInput.files[0];
        dbg(1,"Local File load selected: " + file.name + ", size: " + file.size);
        var LFReader = new FileReader();
        LFReader.onload = function(e) {
            loadLocalGlobals.localFileString = LFReader.result; 
            $('#LFFlightName').val(file.name);
            dbg(1,"Local File Loaded to global string.");
        }
        LFReader.readAsText(file);
    });
} 

 
function loadLocalFileLoadClicked() { 
            if ( loadLocalGlobals.predictOrCSV == 0) {
                // we are loading a prediction
                // look for some tags to make sure this is a correct file
                if (loadLocalGlobals.localFileString.search("launchLat") >=0 &&
                            loadLocalGlobals.localFileString.search("launchLng") >=0 &&
                            loadLocalGlobals.localFileString.search("launchAlt") >=0 &&
                            loadLocalGlobals.localFileString.search("burstAlt") >=0 ) {
                    var loadedPrediction = JSON.parse(loadLocalGlobals.localFileString);
                    // convert the timestamps back to objects
                    loadedPrediction.launchTime = new Date(loadedPrediction.launchTime);
                    loadedPrediction.forecastCycleTime = new Date(loadedPrediction.forecastCycleTime);
                    // insert on the results page
                    dbg(1,"   Inserting the loaded file into the results page.");
                    insertPredictionResults (loadedPrediction);
                    dbg(1,"   Done loading and displaying file.");

                } else {
                    alert("Not a saved prediction file.");
                }
            } else if ( loadLocalGlobals.predictOrCSV == 1) {
                // loading a CSV file
                if (loadLocalGlobals.CSVType == 0) {
                    // aprs.fi format
                    // aprs.fi escapes " with \" instead of "".  It also escapes \ and ' that shouldn't be
                    var re = /\\\\/g;
                    var tmpStr = loadLocalGlobals.localFileString.replace(re, '/');  //This is wrong  need \\"=\", \"=""
                    var re = /\\"/g;
                    var tmpStr = tmpStr.replace(re, '""');
                    var re = /\\'/g;
                    var tmpStr = tmpStr.replace(re, "'");
                    var parsedCSV = $.parse(tmpStr, { 
                        delimiter: "", 
                        header: true, 
                        dynamicTyping: true
                    });
                    //
                    // need to do some error checking here
                    //
                    // and now parse the csv into the prediction object
                    // 1. find the max altitude
                    var maxAlt = 0;
                    for(var i = 0; i < parsedCSV.results.rows.length; i++) {
                        if (parsedCSV.results.rows[i].altitude > maxAlt) {
                            maxAlt = parsedCSV.results.rows[i].altitude;
                        }
                    }
                    var thisFlight = {
                        type: 'Flight',
                        name : $("#LFFlightName").val(),
                        callsign : $("#LFCallsign").val(),
                        keypoints : {}
                    };
                    var wpID = 0;
                    var wpPhase = "ascent";
                    thisFlight.waypoints = new Array();                            
                    var baseTimeStamp =  Date.parseString(parsedCSV.results.rows[0].time,"y-M-d H:m:s");
                    // insert the waypoints
                    thisFlight.keypoints.launch = {
                        "id": wpID,
                        "timestamp": 0,
                        "lat": parsedCSV.results.rows[0].lat,
                        "lng": parsedCSV.results.rows[0].lng,
                        "alt": parsedCSV.results.rows[0].altitude,
                        "time": baseTimeStamp
                        };                    
                    for(var i = 0; i < parsedCSV.results.rows.length; i++) {
                        var thisTimestamp = Date.parseString(parsedCSV.results.rows[i].time,"y-M-d H:m:s");
                        var timedelta = (thisTimestamp - baseTimeStamp) / 1000;  // time math is in mS.
                        var tmpWP = {
                            "id": wpID,
                            "timestamp": timedelta,
                            "lat": parsedCSV.results.rows[i].lat,
                            "lng": parsedCSV.results.rows[i].lng,
                            "alt": parsedCSV.results.rows[i].altitude,
                            "phase": wpPhase
                        };
                        thisFlight.waypoints.push(tmpWP);
                        if (parsedCSV.results.rows[i].altitude == maxAlt) {
                            wpPhase = "descent"
                            thisFlight.keypoints.burst = {
                                "id": wpID,
                                "timestamp": timedelta,
                                "lat": parsedCSV.results.rows[i].lat,
                                "lng": parsedCSV.results.rows[i].lng,
                                "alt": parsedCSV.results.rows[i].altitude
                            };                    
                        }
                        wpID++;
                    }
                    thisFlight.keypoints.touchdown = {
                        "id": tmpWP.id,
                        "timestamp": tmpWP.timestamp,
                        "lat":tmpWP.lat,
                        "lng": tmpWP.lng,
                        "alt": tmpWP.alt
                    }; 
                    fillPredictionInputData (thisFlight); 
                    insertPredictionResults (thisFlight);
                } else if (loadLocalGlobals.CSVType == 1) {
                    // findu.com format
                    var parsedCSV = $.parse(loadLocalGlobals.localFileString, { 
                        delimiter: "", 
                        header: false, 
                        dynamicTyping: true
                    });
                    //
                    // need to do some error checking here
                    //
                    // and now parse the csv into the prediction object
                    // 1. find the max altitude
                    var maxAlt = 0;
                    for(var i = 0; i < parsedCSV.results.length; i++) {
                        if (parsedCSV.results[i][5] > maxAlt) {
                            maxAlt = parsedCSV.results[i][5];
                        }
                    }
                    var thisFlight = {
                        type: 'Flight',
                        name : $("#LFFlightName").val(),
                        callsign : $("#LFCallsign").val(),
                        keypoints : {}
                    };
                    var wpID = 0;
                    var wpPhase = "ascent";
                    thisFlight.waypoints = new Array();                            
                    var baseTimeStamp =  Date.parseString(parsedCSV.results[0][0],"yyyyMMddHHmmss");
                    // insert the waypoints
                    thisFlight.keypoints.launch = {
                        "id": wpID,
                        "timestamp": 0,
                        "lat": parsedCSV.results[0][1],
                        "lng": parsedCSV.results[0][2],
                        "alt": parsedCSV.results[0][5]*0.3048,
                        "time": baseTimeStamp
                    };                    
                    for(var i = 0; i < parsedCSV.results.length; i++) {
                        var thisTimestamp = Date.parseString(parsedCSV.results[i][0],"yyyyMMddHHmmss");
                        var timedelta = (thisTimestamp - baseTimeStamp) / 1000;  // time math is in mS.
                        var tmpWP = {
                            "id": wpID,
                            "timestamp": timedelta,
                            "lat": parsedCSV.results[i][1],
                            "lng": parsedCSV.results[i][2],
                            "alt": parsedCSV.results[i][5]*0.3048,
                            "phase": wpPhase
                        };
                        thisFlight.waypoints.push(tmpWP);
                        if (parsedCSV.results[i][5] == maxAlt) {
                            wpPhase = "descent"
                            thisFlight.keypoints.burst = {
                                "id": wpID,
                                "timestamp": timedelta,
                                "lat": parsedCSV.results[i][1],
                                "lng": parsedCSV.results[i][2],
                                "alt": parsedCSV.results[i][5]*0.3048
                            };                    
                        }
                        wpID++;
                    }
                    thisFlight.keypoints.touchdown = {
                        "id": tmpWP.id,
                        "timestamp": tmpWP.timestamp,
                        "lat":tmpWP.lat,
                        "lng": tmpWP.lng,
                        "alt": tmpWP.alt
                    }; 
                    fillPredictionInputData (thisFlight); 
                    insertPredictionResults (thisFlight);
                } else if (loadLocalGlobals.CSVType == 2) {
                    // habhub.org prediction format
                    var parsedCSV = $.parse(loadLocalGlobals.localFileString, { 
                        delimiter: "", 
                        header: false, 
                        dynamicTyping: true
                    });
                    //
                    // need to do some error checking here
                    //
                    // and now parse the csv into the prediction object
                    // 1. find the max altitude
                    var maxAlt = 0;
                    for(var i = 0; i < parsedCSV.results.length; i++) {
                        if (parsedCSV.results[i][3] > maxAlt) {
                            maxAlt = parsedCSV.results[i][3];
                        }
                    }
                    var thisFlight = {
                        type: 'CUSF_Pred',
                        name : $("#LFFlightName").val(),
                        callsign : $("#LFCallsign").val(),
                        keypoints : {}
                    };
                    var wpID = 0;
                    var wpPhase = "ascent";
                    thisFlight.waypoints = new Array(); 
					// timestamp is unix timestamp
					var baseTimeStamp =  new Date(parsedCSV.results[0][0] * 1000);
                    // insert the waypoints
                    thisFlight.keypoints.launch = {
                        "id": wpID,
                        "timestamp": 0,
                        "lat": parsedCSV.results[0][1],
                        "lng": parsedCSV.results[0][2],
                        "alt": parsedCSV.results[0][3],
                        "time": baseTimeStamp
                    };                    
                    for(var i = 0; i < parsedCSV.results.length; i++) {
                        var timedelta = (parsedCSV.results[i][0] - parsedCSV.results[0][0]);  
                        var tmpWP = {
                            "id": wpID,
                            "timestamp": timedelta,
                            "lat": parsedCSV.results[i][1],
                            "lng": parsedCSV.results[i][2],
                            "alt": parsedCSV.results[i][3],
                            "phase": wpPhase
                        };
                        thisFlight.waypoints.push(tmpWP);
                        if (parsedCSV.results[i][3] == maxAlt) {
                            wpPhase = "descent"
                            thisFlight.keypoints.burst = {
                                "id": wpID,
                                "timestamp": timedelta,
                                "lat": parsedCSV.results[i][1],
                                "lng": parsedCSV.results[i][2],
                                "alt": parsedCSV.results[i][3]
                            };                    
                        }
                        wpID++;
                    }
                    thisFlight.keypoints.touchdown = {
                        "id": tmpWP.id,
                        "timestamp": tmpWP.timestamp,
                        "lat":tmpWP.lat,
                        "lng": tmpWP.lng,
                        "alt": tmpWP.alt
                    }; 
                    fillPredictionInputData (thisFlight); 
                    insertPredictionResults (thisFlight);
                } else {
                    alert("CSV format not selected.");
                }
            
            } else {
                alert("Load file type not selected.");
            }
}
// this function fills the prediction input page to match the loaded flight
function fillPredictionInputData (thisFlight) {
    // first see if the box is checked on the form
    if ($('#fillPredictionInput').is(':checked')) {
        // uncheck all 3 checkboxes
        $('#PIAutoLnch').prop('checked', false); // Auto Launch Altitude (checkbox)
        $('#PIFloatChk').prop('checked', false); // Balloon is Floater (checkbox)
        $('#PIAutoTD').prop('checked', false); // Auto Touchdown Alt (checkbox)

        $('#PIFlightName').val("Correlation prediction"); // Prediction Name
        $('#PICallsign').val(thisFlight.callsign); // Tracker Callsign
        // get the closest forecast time
        var tmpForecast = new Date(thisFlight.keypoints.launch.time);
        if (tmpForecast.getHours() >= 18) {
            tmpForecast.setHours(18,0,0,0);
        } else if (tmpForecast.getHours() >= 12) {
            tmpForecast.setHours(12,0,0,0);
        } else if (tmpForecast.getHours() >= 6) {
            tmpForecast.setHours(6,0,0,0);
        } else {
            tmpForecast.setHours(0,0,0,0);
        }
        $('#forecastCycle').val(tmpForecast.format("yyyyMMddHH")); // NOAA GFS Forecast
        $('#PILat').val(thisFlight.keypoints.launch.lat); // Launch Latitude
        $('#PILong').val(thisFlight.keypoints.launch.lng); // Launch Longitude
        $('#PILnchAlt').val(Math.round(thisFlight.keypoints.launch.alt * 3.28084)); // Launch Altitude
        var tmpLaunchDate = new Date(thisFlight.keypoints.launch.time);
        $('#PILaunchDate').val(tmpLaunchDate.clearTime()); // Launch Date
        $('#PILaunchTime').val(thisFlight.keypoints.launch.time.format("HH:mm")); // Launch Time
        $('#PIBurst').val(Math.round(thisFlight.keypoints.burst.alt * 3.28084)); // Burst Altitude
        $('#PIFloatTime').val(''); // Float Time
        var tmp1 = Number(thisFlight.keypoints.burst.alt) - Number(thisFlight.keypoints.launch.alt);
        var tmp2 = Number(thisFlight.keypoints.burst.timestamp) - Number(thisFlight.keypoints.launch.timestamp);
        var tmpAscent = tmp1 / tmp2;
        // convert meters/sec to feet/min
        tmpAscent = Math.round(tmpAscent * 3.28084 * 60);
        $('#PIAscent').val(tmpAscent); // Ascent Rate
        $('#PIDescent').val(Math.round(findDescentSpeed(thisFlight) * 3.28084 * 60)); // Descent Rate
        $('#PITDAlt').val(Math.round(thisFlight.keypoints.touchdown.alt * 3.28084)); // Touchdown Altitude
    }
}

// this calculates the descent speed using the same formulas found in worker.js ~ line 164
function findDescentSpeed (thisFlight) {
    // see if we have enough descent points to calculate
    if ((thisFlight.keypoints.touchdown.id - thisFlight.keypoints.burst.id) < 7) {
        alert("Not enough samples in the decent to calculate the descent rate.");
        return 5.0812; // 1000 f/m in meters
    }
    var tmpAv = 0;
    for(var ii = thisFlight.keypoints.touchdown.id-5; ii < thisFlight.keypoints.touchdown.id; ii++) {
        var currentV = (thisFlight.waypoints[ii-1].alt - thisFlight.waypoints[ii].alt) / (thisFlight.waypoints[ii].timestamp - thisFlight.waypoints[ii-1].timestamp); 
        var currentDensity = getDensity(thisFlight.waypoints[ii-1].alt); 
        var tmpVelConstant = currentV * Math.sqrt(currentDensity);
        tmpAv += tmpVelConstant;
    }
    var velConstant = tmpAv/5;
    // and finally calculate the velocity at sea level
    var descRate = 1/Math.sqrt(1.225) * velConstant;
    return descRate;
}

// This function returns the air density in kg/m^3 when given the alt. in meters
function getDensity (alt) {
    if (alt <= 0) { return 1.22500000}
    else if (alt <= 500	 ) { return 1.16730000; }
    else if (alt <= 1000) { return 	1.11170000; }
    else if (alt <= 1500) { return 	1.05810000; }
    else if (alt <= 2000) { return 	1.00660000; }
    else if (alt <= 2500) { return 	0.95695000; }
    else if (alt <= 3000) { return 	0.90925000; }
    else if (alt <= 3500) { return 	0.86340000; }
    else if (alt <= 4000) { return 	0.81935000; }
    else if (alt <= 4500) { return 	0.77704000; }
    else if (alt <= 5000) { return 	0.73643000; }
    else if (alt <= 5500) { return 	0.69747000; }
    else if (alt <= 6000) { return 	0.66011000; }
    else if (alt <= 6500) { return 	0.62431000; }
    else if (alt <= 7000) { return 	0.59002000; }
    else if (alt <= 7500) { return 	0.55719000; }
    else if (alt <= 8000) { return 	0.52579000; }
    else if (alt <= 8500) { return 	0.49576000; }
    else if (alt <= 9000) { return 	0.46706000; }
    else if (alt <= 9500) { return 	0.43966000; }
    else if (alt <= 10000) { return 0.41351000; }
    else if (alt <= 10500) { return 0.38857000; }
    else if (alt <= 11000) { return 0.36480000; }
    else if (alt <= 11500) { return 0.33743000; }
    else if (alt <= 12000) { return 0.31194000; }
    else if (alt <= 12500) { return 0.28838000; }
    else if (alt <= 13000) { return 0.26660000; }
    else if (alt <= 13500) { return 0.24646000; }
    else if (alt <= 14000) { return 0.22786000; }
    else if (alt <= 14500) { return 0.21066000; }
    else if (alt <= 15000) { return 0.19476000; }
    else if (alt <= 15500) { return 0.18006000; }
    else if (alt <= 16000) { return 0.16647000; }
    else if (alt <= 16500) { return 0.15391000; }
    else if (alt <= 17000) { return 0.14230000; }
    else if (alt <= 17500) { return 0.13157000; }
    else if (alt <= 18000) { return 0.12165000; }
    else if (alt <= 18500) { return 0.11247000; }
    else if (alt <= 19000) { return 0.10400000; }
    else if (alt <= 19500) { return 0.09615700; }
    else if (alt <= 20000) { return 0.08891000; }
    else if (alt <= 20500) { return 0.08205100; }
    else if (alt <= 21000) { return 0.07571500; }
    else if (alt <= 21500) { return 0.06988100; }
    else if (alt <= 22000) { return 0.06451000; }
    else if (alt <= 22500) { return 0.05956300; }
    else if (alt <= 23000) { return 0.05500600; }
    else if (alt <= 23500) { return 0.05080700; }
    else if (alt <= 24000) { return 0.04693800; }
    else if (alt <= 24500) { return 0.04337200; }
    else if (alt <= 25000) { return 0.04008400; }
    else if (alt <= 25500) { return 0.03705200; }
    else if (alt <= 26000) { return 0.03425700; }
    else if (alt <= 26500) { return 0.03167800; }
    else if (alt <= 27000) { return 0.02929800; }
    else if (alt <= 27500) { return 0.02710300; }
    else if (alt <= 28000) { return 0.02507600; }
    else if (alt <= 28500) { return 0.02320600; }
    else if (alt <= 29000) { return 0.02147800; }
    else if (alt <= 29500) { return 0.01988300; }
    else if (alt <= 30000) { return 0.01841000; }
    else if (alt <= 30500) { return 0.01704900; }
    else if (alt <= 31000) { return 0.01579200; }
    else if (alt <= 31500) { return 0.01462900; }
    else if (alt <= 32000) { return 0.01355500; }
    else if (alt <= 32500) { return 0.01253000; }
    else if (alt <= 33000) { return 0.01157300; }
    else if (alt <= 33500) { return 0.01069400; }
    else if (alt <= 34000) { return 0.00988740; }
    else if (alt <= 34500) { return 0.00914560; }
    else if (alt <= 35000) { return 0.00846340; }
    else if (alt <= 35500) { return 0.00783570; }
    else if (alt <= 36000) { return 0.00725790; }
    else if (alt <= 36500) { return 0.00672580; }
    else if (alt <= 37000) { return 0.00623550; }
    else if (alt <= 37500) { return 0.00578350; }
    else if (alt <= 38000) { return 0.00536660; }
    else if (alt <= 38500) { return 0.00498190; }
    else if (alt <= 39000) { return 0.00462670; }
    else if (alt <= 39500) { return 0.00429870; }
    else if (alt <= 40000) { return 0.00399570; }
    else if (alt <= 40500) { return 0.00371550; }
    else if (alt <= 41000) { return 0.00345640; }
    else if (alt <= 41500) { return 0.00321670; }
    else if (alt <= 42000) { return 0.00299480; }
    else if (alt <= 42500) { return 0.00278930; }
    else if (alt <= 43000) { return 0.00259890; }
    else if (alt <= 43500) { return 0.00242240; }
    else if (alt <= 44000) { return 0.00225890; }
    else if (alt <= 44500) { return 0.00210710; }
    else if (alt <= 45000) { return 0.00196630; }
    else if (alt <= 45500) { return 0.00183560; }
    else if (alt <= 46000) { return 0.00171410; }
    else if (alt <= 46500) { return 0.00160140; }
    else if (alt <= 47000) { return 0.00149650; }
    else if (alt <= 47500) { return 0.00140120; }
    else if (alt <= 48000) { return 0.00131670; }
    else if (alt <= 48500) { return 0.00123730; }
    else if (alt <= 49000) { return 0.00116280; }
    else if (alt <= 49500) { return 0.00109270; }
    else if (alt <= 50000) { return 0.00102690; }
    else if (alt <= 50500) { return 0.00096502; }
    else if (alt <= 51000) { return 0.00090690; }
    else if (alt <= 51500) { return 0.00085305; }
    else if (alt <= 52000) { return 0.00080562; }
    else if (alt <= 52500) { return 0.00076061; }
    else if (alt <= 53000) { return 0.00071791; }
    else if (alt <= 53500) { return 0.00067741; }
    else if (alt <= 54000) { return 0.00063900; }
    else if (alt <= 54500) { return 0.00060260; }
    else if (alt <= 55000) { return 0.00056810; }
    else if (alt <= 55500) { return 0.00053541; }
    else if (alt <= 56000) { return 0.00050445; }
    else if (alt <= 56500) { return 0.00047513; }
    else if (alt <= 57000) { return 0.00044738; }
    else if (alt <= 57500) { return 0.00042111; }
    else if (alt <= 58000) { return 0.00039626; }
    else if (alt <= 58500) { return 0.00037276; }
    else if (alt <= 59000) { return 0.00035054; }
    else if (alt <= 59500) { return 0.00032953; }
    else { return 	0.00030968; }
}