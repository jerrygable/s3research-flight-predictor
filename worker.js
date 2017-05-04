//
// Copyright (c)2014 Jerry Gable (www.s3research.com)
// Except where otherwise noted, this work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.
// http://creativecommons.org/licenses/by-nc/4.0/
//
importScripts("../libs/date/date.js");
var weatherData = new Array();
var currentPrediction = new Object();
var debugLevel = 0;
// send debug messages to the main program
function dbg (lvl, msg) {
    if (debugLevel >= lvl) {
        var d = new Date();
        var tmpObj = new Object(); 
        tmpObj.dbgMsg = d.toISOString() + "  L" + lvl + "  " + msg;
        tmpObj.status = 99;
        postMessage(tmpObj);
    }
}

// this function is called to start the processing in the worker
onmessage = function(event) {
    currentPrediction = event.data.currentPrediction;  
    debugLevel = event.data.debugLevel;
    dbg(1, "Worker Called: " + JSON.stringify(event.data) + "\n");
    runPrediction ();
}

// run the prediction
function runPrediction () {
    postMessage({'status' : 1}); // starting prediction
    // put the info used in a dbg message
    dbg(1, "Prediction info used: " + JSON.stringify(currentPrediction));
    var current = {
        'lat' : currentPrediction.launchLat, 
        'lng' : currentPrediction.launchLng,
        'alt' : currentPrediction.launchAlt,
        'secs' : 0,
        'wpnum' : 0,
    };
    currentPrediction.waypoints = new Array;
    currentPrediction.waypoints[current.wpnum] = {
        'id' : current.wpnum, 
        'timestamp' : current.secs, 
        'lat' : current.lat,
        'lng' : current.lng,
        'alt' : current.alt,
        'phase' : "ascent"
    };
    currentPrediction.keypoints = {};
    currentPrediction.keypoints.launch = {
        'id' : current.wpnum, 
        'timestamp' : current.secs, 
        'lat' : current.lat,
        'lng' : current.lng,
        'alt' : current.alt
    };  
    dbg(1, "  Launch Info: " + JSON.stringify(currentPrediction.keypoints.launch));

    var burstAlt = currentPrediction.burstAlt;
    // time to calculate the ascent phase of the prediction
    var looplimit = 0;
    var targetAlt = burstAlt;
    while (current.alt < burstAlt  && looplimit < 50000) {
        looplimit++;
        // get the weather info on the current WP
        var WPInfo = getWPInfo (current.secs, current.lat, current.lng, current.alt);
        var zoneSeconds = (burstAlt - current.alt) / currentPrediction.ascentRate;
        // we want a waypoint a max of every 15 seconds
        if (zoneSeconds > 15) {
            // set the zone to 4 minutes
            zoneSeconds = 15;
            targetAlt = (zoneSeconds * currentPrediction.ascentRate) + current.alt;
        } else {
            // we are approaching burst
            targetAlt = burstAlt;
        } 
        var radius = 6378137 + ((targetAlt + current.alt)/2) ;  //earth radius used for calculation
        var distance = zoneSeconds * WPInfo.windSpeed;    
        //var currentPoint = new google.maps.LatLng(current.lat, current.lng);
        //var newLoc = google.maps.geometry.spherical.computeOffset(currentPoint, distance, WPInfo.windDir, radius);
        var newLoc = computeOffset(current.lat, current.lng, distance, WPInfo.windDir, radius);
        // change to new location 
        current.lat = newLoc.lat;
        current.lng = newLoc.lng;
        current.alt = targetAlt;
        current.secs += zoneSeconds;
        current.wpnum ++;
       
        // put the waypoint in the list
        currentPrediction.waypoints.push({
            'id' : current.wpnum, 
            'timestamp' : current.secs, 
            'lat' : current.lat,
            'lng' : current.lng,
            'alt' : current.alt,
            'phase' : "ascent",
            'rate' : currentPrediction.ascentRate
        });
        if (looplimit < 100 || (looplimit % 1000) == 0) {
            dbg(2, "    Ascent Waypoint Info: " + JSON.stringify(currentPrediction.waypoints[current.wpnum]));
        }
    }
    if (looplimit >= 50000) {
        dbg(1, "ERROR: Stuck in an ascent calculation loop");
        // alert("ERROR: Stuck in an ascent calculation loop");
        return;
    }
    // see if we have any float time
    if (currentPrediction.floatTime > 0) {
        // Put in the float keypoint
        currentPrediction.keypoints.floatStart = {
            'id' : current.wpnum, 
            'timestamp' : current.secs, 
            'lat' : current.lat,
            'lng' : current.lng,
            'alt' : current.alt
        }; 
        dbg(1, "  FloatStart Info: " + JSON.stringify(currentPrediction.keypoints.floatStart));
        var totalFloat = 0;
        while (totalFloat < currentPrediction.floatTime) {
            var WPInfo = getWPInfo (current.secs, current.lat, current.lng, current.alt);
            if (currentPrediction.floatTime - totalFloat > 420) {
                var zoneSeconds = 300;
            } else {
                var zoneSeconds = currentPrediction.floatTime - totalFloat;
            }
            totalFloat += zoneSeconds;
            var radius = 6378137 + current.alt;  //earth radius used for calculation
            var distance = zoneSeconds * WPInfo.windSpeed;    
            //var currentPoint = new google.maps.LatLng(current.lat, current.lng);
            //var newLoc = google.maps.geometry.spherical.computeOffset(currentPoint, distance, WPInfo.windDir, radius);
            var newLoc = computeOffset(current.lat, current.lng, distance, WPInfo.windDir, radius);
            // change to new location 
            current.lat = newLoc.lat;
            current.lng = newLoc.lng;
            current.alt = current.alt;
            current.secs += zoneSeconds;
            current.wpnum ++;
            // put the waypoint in the list
            currentPrediction.waypoints.push({
                'id' : current.wpnum, 
                'timestamp' : current.secs, 
                'lat' : current.lat,
                'lng' : current.lng,
                'alt' : current.alt,
                'phase' : "float",
                'rate' : 0
            });
            dbg(2, "    Float Waypoint Info: " + JSON.stringify(currentPrediction.waypoints[current.wpnum]));
        }
    }
 
    // Put in the burst keypoint
    currentPrediction.keypoints.burst = {
        'id' : current.wpnum, 
        'timestamp' : current.secs, 
        'lat' : current.lat,
        'lng' : current.lng,
        'alt' : current.alt
    }; 
    dbg(1, "  Burst Info: " + JSON.stringify(currentPrediction.keypoints.burst));

    // For the decent we need to calculate the descent rate at the various zones.
    // the formula for velocity is
    // V = sqrt((2*m*g)/(d*a*c))
    //    V = velocity in m/s
    //    m = mass in Kg
    //    g = gravity
    //    d = Air density Kg/m^3
    //    a = area
    //    c = drag coefficient
    // since everything is constant except d and V this reduces to
    // V = 1/SQRT(d) * velConstant.
    // since we are given the velocity at sea level we can calc. velConstant from
    // velConstant = V/SQRT(d)
    // density (d) at sea level is 1.225 kg/m^3
    var velConstant = currentPrediction.descentRate * Math.sqrt(1.225);
    // This is the altitude entered for the TD alt
    var TDTargetAlt = currentPrediction.TDTargetAlt;
    // a couple of variables needed to get the ground alt. from google
    var tmpWaypoints = new Array();
    var TDLocs = []; // array of latLng passed to googlr to get the altitudes
    // time for the descent calculation
    var looplimit = 0;
    while (current.alt > TDTargetAlt && looplimit < 50000) {
        looplimit++;
        // get the weather info on the current WP
        var WPInfo = getWPInfo (current.secs, current.lat, current.lng, current.alt);
        var descRate = 1/Math.sqrt(WPInfo.density) * velConstant;
        var zoneSeconds = (current.alt - TDTargetAlt) /descRate;
        if (zoneSeconds > 15) {
            // set the zone to 4 minutes
            zoneSeconds = 15;
            targetAlt = current.alt - (zoneSeconds * descRate);
        } else {
            targetAlt = TDTargetAlt;
        }
        var radius = 6378137 + ((targetAlt + current.alt)/2) ;  //earth radius used for calculation
        var distance = zoneSeconds * WPInfo.windSpeed;    
        //var currentPoint = new google.maps.LatLng(current.lat, current.lng);
        //var newLoc = google.maps.geometry.spherical.computeOffset(currentPoint, distance, WPInfo.windDir, radius);
        var newLoc = computeOffset(current.lat, current.lng, distance, WPInfo.windDir, radius);
        // change to new location 
        current.lat = newLoc.lat;
        current.lng = newLoc.lng;
        current.alt = targetAlt;
        current.secs += zoneSeconds;
        current.wpnum ++;
       
        if (TDTargetAlt != 0 || current.alt >= 7925) {
        //if we have a target alt or we are above 26000 feet just put in the waypoint
        // put the waypoint in the list
            currentPrediction.waypoints.push({
                'id' : current.wpnum, 
                'timestamp' : current.secs, 
                'lat' : current.lat,
                'lng' : current.lng,
                'alt' : current.alt,
                'phase' : "descent",
                'rate' : descRate
            });
            if (looplimit < 200 || (looplimit % 1000) == 0) {
                dbg(2, "    Descent Waypoint Info: " + JSON.stringify(currentPrediction.waypoints[current.wpnum]));
            }
        } else if ((TDTargetAlt == 0 && current.alt < 7925)) {
            var tmpWP = {
                'id' : current.wpnum, 
                'timestamp' : current.secs, 
                'lat' : current.lat,
                'lng' : current.lng,
                'alt' : current.alt,
                'phase' : "descent",
                'rate' : descRate,
                'windSpeed' : WPInfo.windSpeed,
                'windDir' : WPInfo.windDir
            }
            if (looplimit < 200 || (looplimit % 1000) == 0) {
                dbg(2, "    Temp Descent Waypoint Info: " + JSON.stringify(tmpWP));
            }
            tmpWaypoints.push(tmpWP);
            TDLocs.push({'lat' : current.lat, 'lng' : current.lng});  // save for google query
        }
    }
    if (looplimit >= 50000) {
        dbg(1, "ERROR: Stuck in an descent calculation loop");
        // alert("ERROR: Stuck in an descent calculation loop");
        return;
    }
    var windBoxes = new Array();
    for (var idx=0; idx < weatherData.length; idx++) { 
        windBoxes[idx] = {'leftLng' : Math.min.apply(null, weatherData[idx].longs),
            'rightLng' : Math.max.apply(null, weatherData[idx].longs),
            'topLat' : Math.max.apply(null, weatherData[idx].lats),
            'botLat' : Math.min.apply(null, weatherData[idx].lats),
            'cycle' : weatherData[idx].cycle,
            'forecastHour' : weatherData[idx].forecastHour
        };
    }
    // time to return the data
    var tmpObj = new Object(); 
    tmpObj.currentPrediction = currentPrediction;
    tmpObj.TDLocs = TDLocs;
    tmpObj.tmpWaypoints = tmpWaypoints;
    tmpObj.windBoxes = windBoxes;
    tmpObj.status = 5;
    postMessage(tmpObj);
}

// this function gets the wind details on the current waypoint
function getWPInfo (secs, lat, lng, alt) {
    var retData = {};  // variable for the return data

    // find out if we have a block of weather that has what we need in it.
    var currentTime = new Date(currentPrediction.launchTime);
    currentTime = currentTime.add('s',secs);
    var now = (currentTime - currentPrediction.forecastCycleTime) / 1000 /60 /60;  // now is in hours
    var forecastHour = Math.round(now - (now % 3));
dbg(1, "  currentTime-PredictTime: " + now + "    forecastHourUsed: " + forecastHour);
    
    var useThisWeather = -1;
    for (var idx=0; idx < weatherData.length; idx++) { 
        var tmpLoc = nearestLoc (lat, lng, idx)
        // see if this point and time are in this wind block
        if (weatherData[idx].forecastHour == forecastHour && 
                    currentPrediction.forecastCycleTime.equals(weatherData[idx].cycle) && 
                    tmpLoc.latMatch == 0 && tmpLoc.lngMatch == 0) {
            useThisWeather = idx;
            break;
        }
    }
    // if we didn't find this point then get another set
    if (useThisWeather == -1) {
        if (weatherData.length > 100) {
            // limit the amount of data stored
            weatherData.shift();
            dbg(1, "Dropping a block of weather data");
        }
        useThisWeather = weatherData.length; // download the next one
        downloadGrib(lat, lng, forecastHour);
        postMessage({'status' : 1}); // continuing prediction
    }
    // get the pressure list from the global weather data
    var pressList = weatherData[useThisWeather].pressures;
    // sort largest (lowest) to smallest (highest)
    pressList.sort(function(a, b){return b-a});

    // get the lat and long to use in the wind index.
    var tmplatlng = nearestLoc(lat, lng, useThisWeather);
    var wndLat = tmplatlng.rndLat;
    var wndLng = tmplatlng.rndLng;
    // return the values that show weather the point is in the weather region.
    retData.latMatch = tmplatlng.latMatch;
    retData.lngMatch = tmplatlng.lngMatch;
    
    // see if we are below the bottom
    if (weatherData[useThisWeather].getValue(wndLat, wndLng, pressList[0], 'HGT') >= alt) {
        var tmpWindDirSpeed = weatherData[useThisWeather].getWind(wndLat, wndLng, pressList[0]);
        retData.windDir = tmpWindDirSpeed.direction;
        retData.windSpeed = tmpWindDirSpeed.speed;
        retData.temp = weatherData[useThisWeather].getValue(wndLat, wndLng, pressList[0], 'TMP');
        retData.density = weatherData[useThisWeather].getDensity(wndLat, wndLng, pressList[0])
        return retData;
    }
    // and are we above the top
    var tmpPList = pressList[pressList.length -1];
    if (weatherData[useThisWeather].getValue(wndLat, wndLng, tmpPList, 'HGT') <= alt) {
        var tmpWindDirSpeed = weatherData[useThisWeather].getWind(wndLat, wndLng, tmpPList);
        retData.windDir = tmpWindDirSpeed.direction;
        retData.windSpeed = tmpWindDirSpeed.speed;
        retData.temp = weatherData[useThisWeather].getValue(wndLat, wndLng, tmpPList, 'TMP');
        retData.density = weatherData[useThisWeather].getDensity(wndLat, wndLng, tmpPList)
        return retData;
    }
    // do all of the bands
    for (var idx=1; idx < pressList.length; idx++) {
        var x1 = weatherData[useThisWeather].getValue(wndLat, wndLng, pressList[idx], 'HGT');
        if (x1 >= alt) {
            // we are in the correct zone
            break;
        }
    }
    // because of the if above we can only get here if we found the pressure
    var x0 = weatherData[useThisWeather].getValue(wndLat, wndLng, pressList[idx-1], 'HGT');
    var y1 = weatherData[useThisWeather].getDensity(wndLat, wndLng, pressList[idx]);
    var y0 = weatherData[useThisWeather].getDensity(wndLat, wndLng, pressList[idx-1]);
    retData.density = interpolate (alt , x0, x1, y0 ,y1);
    var topWind = weatherData[useThisWeather].getWind(wndLat, wndLng, pressList[idx]);
    var botWind = weatherData[useThisWeather].getWind(wndLat, wndLng, pressList[idx-1]);
    retData.windDir = interpolate (alt , x0, x1, botWind.direction , topWind.direction);
    retData.windSpeed = interpolate (alt , x0, x1, botWind.speed ,topWind.speed);
    return retData;
}

function interpolate (x , x0, x1, y0 ,y1) {
    if (x1 == x0) {return y0;}
    return y0+(y1-y0)*(x-x0)/(x1-x0);
}


// find the nearest wind data point
function nearestLoc (lat, lng, idx) {
    var nearest = {};
    // round to the nearest 0.5 degree
    var rndLat = Number(roundHalf(lat));
    var rndLng = Number(roundHalf(lng));
    if (weatherData[idx].lats.indexOf(rndLat) >= 0) {
        // found number
        nearest.rndLat = rndLat;
        nearest.latMatch = 0; // 0 = found point
    } else if (Math.min.apply(null, weatherData[idx].lats) > rndLat) {
        nearest.rndLat = Math.min.apply(null, weatherData[idx].lats);
        nearest.latMatch = -1; // -1 = value below lowest
    } else {
        nearest.rndLat = Math.max.apply(null, weatherData[idx].lats);
        nearest.latMatch = 1; // -1 = value below lowest
    }
    if (weatherData[idx].longs.indexOf(rndLng) >= 0) {
        // found number
        nearest.rndLng = rndLng;
        nearest.lngMatch = 0; // 0 = found point
    } else if (Math.min.apply(null, weatherData[idx].longs) > rndLng) {
        nearest.rndLng = Math.min.apply(null, weatherData[idx].longs);
        nearest.lngMatch = -1; // -1 = value below lowest
    } else {
        nearest.rndLng = Math.max.apply(null, weatherData[idx].longs);
        nearest.lngMatch = 1; // -1 = value below lowest
    }
    var stringData = JSON.stringify(nearest);
    return nearest;
}

// Update the link for the download weather button
function downloadGrib(latIn, longIn, forecastHour) {
    // Get the values from the form
    var tmpTime = currentPrediction.forecastCycleTime;
    var forecastCycle = tmpTime.format("yyyyMMddHH");
    var forecastCycleHour = tmpTime.format("HH");
    // calculate the 4 lat/long points surrounding the desired point
    var latTop = latIn + (10 * 0.5);
    latTop = roundHalf(latTop);
    var latBot = latIn - (10 * 0.5);
    latBot = roundHalf(latBot);
    var longLeft = longIn - (12 * 0.5);
    longLeft = roundHalf(longLeft);
    var longRight = longIn + (12 * 0.5);
    longRight = roundHalf(longRight);
    // Create the URL with all of the params
    var bigURL = "http://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p50.pl?file=gfs.t";
    bigURL += forecastCycleHour;
    bigURL += "z.pgrb2full.0p50.f";
    bigURL += pad3(forecastHour);
    bigURL += "&lev_1_mb=on&lev_2_mb=on&lev_3_mb=on&lev_5_mb=on&lev_7_mb=on&";
    bigURL += "lev_10_mb=on&lev_20_mb=on&lev_30_mb=on&lev_50_mb=on&lev_70_mb=on&lev_100_mb=on&lev_125_mb=on&lev_150_mb=on&lev_175_mb=on&";
    bigURL += "lev_200_mb=on&lev_225_mb=on&lev_250_mb=on&lev_275_mb=on&lev_300_mb=on&lev_325_mb=on&lev_350_mb=on&lev_375_mb=on&";
    bigURL += "lev_400_mb=on&lev_425_mb=on&lev_450_mb=on&lev_475_mb=on&lev_500_mb=on&lev_525_mb=on&lev_550_mb=on&lev_575_mb=on&";
    bigURL += "lev_600_mb=on&lev_625_mb=on&lev_650_mb=on&lev_675_mb=on&lev_700_mb=on&lev_725_mb=on&lev_750_mb=on&lev_775_mb=on&";
    bigURL += "lev_800_mb=on&lev_825_mb=on&lev_850_mb=on&lev_875_mb=on&lev_900_mb=on&lev_925_mb=on&lev_950_mb=on&lev_975_mb=on&";
    bigURL += "lev_1000_mb=on&var_HGT=on&var_TMP=on&var_UGRD=on&var_VGRD=on&subregion=&leftlon=";
    bigURL += longLeft;
    bigURL += "&rightlon=";
    bigURL += longRight;
    bigURL += "&toplat=";
    bigURL += latTop;
    bigURL += "&bottomlat=";
    bigURL += latBot;
    bigURL += "&dir=%2Fgfs.";
    bigURL += forecastCycle;
    
    var dbgMsg = "Requesting Wind Data. Time of Forecast: ";
    dbgMsg += forecastCycle +", Forecast Hour: " + forecastHour + ", longLeft: " + longLeft; 
    dbgMsg += ", longRight: " + longRight + ", latTop: " + latTop + ", latBot: " + latBot;
    dbg(1, dbgMsg);
    postMessage({'status' : 2, 'info' : {'lat': latIn, 'lng' : longIn, 'forecastCycle' : forecastCycle, 'forecastHour' : pad(forecastHour)}}); // starting download

    // request the wind data
    var windReq = new XMLHttpRequest();
    windReq.open("POST", "/tools/getWind/get.php", false);
    windReq.responseType = "arraybuffer";
    windReq.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    windReq.send("url="+encodeURIComponent(bigURL));
    // check if the request worked
    if (windReq.status === 200) {
        var content = windReq.response; // Note: not windReq.responseText
        dbg(1,"Wind file loaded.  Starting GRIB parser.");
        dbg(1,"    Wind data size (bytes): " + content.byteLength);
        postMessage({'status' : 3}); // starting parser
        weatherData.push(parseAllGRIBs(content)); // weather data is globally declared
        postMessage({'status' : 4}); // parser done
        dbg(1,"GRIB Parser done.");
    }
}

// parse the full grib file.  It will contain multiple grib sections
// This is based on the content described in this document: 
// http://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_doc.shtml 
// NOTE: This is a very limited parser and only does wind, height, and temp data from the NOAA site.
function parseAllGRIBs (inData) {
    // create the object to keep all the data in
    var weatherDB = new weatherDBObject();  

    // loop through all the grib parts in the file
    var gribCount = 1;
    var starttime  = +new Date();
    while (inData.byteLength > 0) {
    if (gribCount % 10 == 0) {
        
        var currentTime = +new Date();
        starttime = currentTime;
    }
        dbg(2, "  Starting GRIB Block " + gribCount);
        gribCount ++;
        var sect0 = new DataView(inData,0,16);
        // Make sure this is a grib file
        // first 4 characters should be GRIB.  Must be a meteorological file (byte 7 = 0) and version 2 (byte 8 = 2).  Max length supported is 2^32 (top 32 if length =0)
        
        if (sect0.getUint8(0) == 0x47 &&sect0.getUint8(1) == 0x52 && sect0.getUint8(2) == 0x49 && sect0.getUint8(3) == 0x42 &&sect0.getUint8(6) == 0x0 && sect0.getUint8(7) == 0x2 && sect0.getUint32(8) == 0) {

            // get the length of the grub file
            var griblength = sect0.getUint32(12);
            
            // trim off this grib
            var grib = inData.slice(0,griblength);
            inData = inData.slice(griblength);
            // at this point grib contains one of the multiple gribs in the source file
            // there is a separate grib for each parameter and pressure (alt) 
            parseGRIB(grib, weatherDB);
            if (weatherDB.status < 0) {
                // error found, return
                 return(weatherDB);
            }
           
        } else {
            // alert("ERROR: Not a grib file this parser understands");
            dbg(0, "ERROR: Not a grib file this parser understands");
            weatherDB.statusMsg = "ERROR: Not a grib file this parser understands";
            weatherDB.status = -1;
            return(weatherDB);
        }
    }
    // just keep the unique, sorted values for lats, longs, pressures, & params.
    weatherDB.lats = arrayUnique(weatherDB.lats);
    weatherDB.lats.sort(function(a, b){return a-b});
    weatherDB.longs = arrayUnique(weatherDB.longs);
    weatherDB.longs.sort(function(a, b){return a-b});
    weatherDB.pressures = arrayUnique(weatherDB.pressures);
    weatherDB.pressures.sort(function(a, b){return a-b});
    weatherDB.params = arrayUnique(weatherDB.params);
    weatherDB.params.sort();
    weatherDB.status = 100; // say the data is valid
    return weatherDB;
}
// function to call when we hit a grib error
function gribError (wdb, lvl, stat, msg) {
    // alert(msg);
    dbg(lvl, msg);
    wdb.statusMsg = msg;
    wdb.status = stat;
    return wdb;
}
// 
function parseGRIB (grib, weatherDB) {
    // we have done everything we need with section 0, carve it off
    grib = grib.slice(16);
    // loop through all the sections in the grib
    while (grib.byteLength > 4) {
        var sectHdr = new DataView(grib,0,5);
        var sectSize = sectHdr.getUint32(0);  // first 4 bytes are the size
        var sectNum = sectHdr.getUint8(4);  // 5th byte is the section number
        var section = grib.slice(0,sectSize);
        var sectView = new DataView(section);
        grib = grib.slice(sectSize);
        dbg(2, "    Parsing GRIB section " + sectNum);
        switch(sectNum) {
            case 1:
                if (sectView.getUint8(9) != 2) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser has only been validated for Master Tables version 2. Version " +  sectView.getUint8(9));
                    return weatherDB;
                }
                var year = sectView.getUint16(12);
                var month = sectView.getUint8(14);
                var day = sectView.getUint8(15);
                var hour = sectView.getUint8(16);
                var minute = sectView.getUint8(17);
                var second = sectView.getUint8(18);
                break;
            case 3:
                if (sectView.getUint8(5) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 3, byte 6 is 0. Found " +  sectView.getUint8(5));
                    return weatherDB;
                }
                if (sectView.getUint8(10) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 3, byte 11 is 0. Found " +  sectView.getUint8(10));
                    return weatherDB;
                }
                if (sectView.getUint8(11) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 3, byte 12 is 0. Found " +  sectView.getUint8(11));
                    return weatherDB;
                }
                if (sectView.getUint8(12) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 3, byte 13 is 0. Found " +  sectView.getUint8(12));
                    return weatherDB;
                }
                if (sectView.getUint8(13) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 3, byte 14 is 0. Found " +  sectView.getUint8(13));
                    return weatherDB;
                }
                if (sectView.getUint8(14) != 6) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 3, byte 15 is 6. Found " +  sectView.getUint8(14));
                    return weatherDB;
                }
                if (sectView.getUint8(15) + sectView.getUint8(16) + sectView.getUint8(17) + sectView.getUint8(18) + sectView.getUint8(19) + sectView.getUint8(20) + 
                            sectView.getUint8(21) + sectView.getUint8(22) + sectView.getUint8(23) + sectView.getUint8(24) + sectView.getUint8(25) + 
                            sectView.getUint8(26) + sectView.getUint8(27) + sectView.getUint8(28) + sectView.getUint8(29)) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 3, bytes 16-30 are 0");
                    return weatherDB;
                }
                var totalPoints = sectView.getUint32(6);
                var pointsInX = sectView.getUint32(30);
                var pointsInY = sectView.getUint32(34);
                if (sectView.getUint8(38) + sectView.getUint8(39) + sectView.getUint8(40) + sectView.getUint8(41) + sectView.getUint8(42) + 
                            sectView.getUint8(43) + sectView.getUint8(44) + sectView.getUint8(45)) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 3, bytes 16-30 are 0");
                    return weatherDB;
                }
                
                // *************************************************************
                //  NOTE: Lat and long appear to be reversed from the spec
                // *************************************************************
                var latitude1  = latlonSign(sectView.getUint32(46)) / 1000000;
                var longitude1 = latlonSign(sectView.getUint32(50)) / 1000000;
                var latitude2  = latlonSign(sectView.getUint32(55)) / 1000000;
                var longitude2 = latlonSign(sectView.getUint32(59)) / 1000000;

                var incrementX = latlonSign(sectView.getUint32(63)) / 1000000;
                var incrementY = latlonSign(sectView.getUint32(67)) / 1000000;
                
                if (sectView.getUint8(54) != 48) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 3, byte 55 is 48. Found " +  sectView.getUint8(54));
                    return weatherDB;
                }
                if (sectView.getUint8(71) != 64) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 3, byte 72 is 64. Found " +  sectView.getUint8(71));
                    return weatherDB;
                }
                break;
            case 4:
                if (sectView.getUint8(5) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 4, byte 6 is 0. Found " +  sectView.getUint8(5));
                    return weatherDB;
                }
                if (sectView.getUint8(6) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 4, byte 7 is 0. Found " +  sectView.getUint8(6));
                    return weatherDB;
                }
                if (sectView.getUint8(7) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 4, byte 8 is 0. Found " +  sectView.getUint8(7));
                    return weatherDB;
                }
                if (sectView.getUint8(8) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 4, byte 9 is 0. Found " +  sectView.getUint8(8));
                    return weatherDB;
                }
                // figure out the parameter in this grib
                if (sectView.getUint8(9) == 3 && sectView.getUint8(10) == 5) {
                    var parameter = "HGT";
                } else if (sectView.getUint8(9) == 0 && sectView.getUint8(10) == 0) {
                    var parameter = "TMP";
                } else if (sectView.getUint8(9) == 2 && sectView.getUint8(10) == 2) {
                    var parameter = "UGRD";
                } else if (sectView.getUint8(9) == 2 && sectView.getUint8(10) == 3) {
                    var parameter = "VGRD";
                } else {
                    var parameter = "";
                    weatherDB = gribError(weatherDB, 1, -1, "ERROR: Unknown Parameter type found.");
                    return weatherDB;
                }
                if (sectView.getUint8(17) != 1) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 4, byte 18 is 1. Found " +  sectView.getUint8(17));
                    return weatherDB;
                }
                var forecastHour = sectView.getUint32(18);
                if (sectView.getUint8(22) != 100) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 4, byte 23 is 100. Found " +  sectView.getUint8(22));
                    return weatherDB;
                }
                if (sectView.getUint8(23) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 4, byte 24 is 0. Found " +  sectView.getUint8(23));
                    return weatherDB;
                }
                if (sectView.getUint8(28) != 255) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 4, byte 29 is 255. Found " +  sectView.getUint8(28));
                    return weatherDB;
                }
                var press_mb = sectView.getUint32(24)/100;
                
                break;
            case 5:
                var pointsInSec7 = sectView.getUint32(5);
                if (sectView.getUint8(9) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 5, byte 10 is 0. Found " +  sectView.getUint8(9));
                    return weatherDB;
                }
                if (sectView.getUint8(10) != 0) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 5, byte 11 is 0. Found " +  sectView.getUint8(10));
                    return weatherDB;
                }
                var referenceValue_R = sectView.getFloat32(11);
                var binaryScaleFactor_E = sectView.getUint16(15);
                var decimalScaleFactor_D = sectView.getUint16(17);
                var bitsForValue = sectView.getUint8(19);
                
                break;
            case 6:
                if (sectView.getUint8(5) != 255) {
                    weatherDB = gribError(weatherDB, 1, -1, "WARNING: This parser understands how to parse when section 6, byte 6 is 255. Found " +  sectView.getUint8(5));
                    return weatherDB;
                }
                break;
            case 7:
                // This section contains all of the values in various bit lengths starting at byte 5
                // convert it to one binary string to parse
                var dataString = new String();
                for (var i = 5; i < sectView.byteLength; i++) {
                    var tmp = "00000000" + sectView.getUint8(i).toString(2);  //pad up in case it is all 0s.
					tmp = tmp.slice(-8);  // cut down to 8 bits
                    var dataString = dataString.concat(tmp);
                }
                // parse it off in bitsForValue size
                var dataValue = new Array();
                for (var j = 0; j < pointsInSec7; j++) {
                    var x = parseInt(dataString.slice(0,bitsForValue),2);
                    // Apply the following formula to all the data points
                    // Y * 10^D = R + X * 2^E
                    // D = decimalScaleFactor_D
                    // R = referenceValue_R
                    // X = x
                    // E = binaryScaleFactor_E
                    var Y = (referenceValue_R + x * Math.pow(2, binaryScaleFactor_E)) / Math.pow(10,decimalScaleFactor_D);
                    dataValue.push(Y);
                    dataString = dataString.slice(bitsForValue); // keep processing the rest of the string
                }
                break;
           default:
                weatherDB = gribError(weatherDB, 1, -1, "ERROR: Unhandled section type " + sectNum);
                return weatherDB;
        }       
    }
    // check the last 4 bytes are ascii 7 (0x37)
     var EndOfGrib = new DataView(grib);
    if (grib.byteLength != 4 || EndOfGrib.getUint8(0) != 0x37 || EndOfGrib.getUint8(1) != 0x37 || EndOfGrib.getUint8(2) != 0x37 || EndOfGrib.getUint8(3) != 0x37) {
        weatherDB = gribError(weatherDB, 1, -1, "ERROR: Did not find an end of grib marker");
        return weatherDB;
    }

    
    // Put the data in the weatherDB Object
    var cycle = new Date(year, month-1, day, hour, minute, second, 0); 
    weatherDB.cycle = cycle;
    weatherDB.forecastHour = Number(forecastHour);
    
    weatherDB.pressures.push(Number(press_mb));
    weatherDB.params.push(parameter);
    var count = 0;
    for (var k = 0; k < pointsInY; k++) {
        var thislat = latitude1 + (k * incrementY);
        weatherDB.lats.push(Number(thislat));
        for (var l = 0; l < pointsInX; l++) {
            var thislong = longitude1 + (l * incrementX);
			if (thislong > 180) { thislong = thislong - 360;} // somtimes results use postive numbers
            if (k == 0) weatherDB.longs.push(Number(thislong));  // only grab the lons the first time
            weatherDB.setValue(thislat, thislong, press_mb, parameter, Number(dataValue[count]));
            count ++;
        }
    }
    return weatherDB;
}

// This defines the object that holds the data from the weather forecast
function weatherDBObject () {
    this.status = 0; // status = 100 if data is loaded, -xx if load error
    this.statusMsg = "Initialized";
    this.cycle = new Date();        // date and time the forecast was made
    this.forecastHour = new Number(); // Time in hours from the forecast cycle this prediction is for
    this.pressures = new Array();   // Pressures
    this.params = new Array();      // Parameters (HGT, TEMP, UGRD, VGRD)
    this.lats = new Array();        // latitudes
    this.longs = new Array();       // logitudes
    // this.values in the format:
    //          aa.a_bb.b_cc_dddd : value
    //              aa.a = latitude    
    //              bb.b = longitude    
    //              cc   = pressure
    //              dddd = parameter
    this.values = new Object();
}

// prototype to add (or change an existing value) value to the values object
weatherDBObject.prototype.setValue = function(lat, long, press, param, value) {
    this.values[lat + "_" + long + "_" + press + "_" + param] = value;
    //var key = lat + "_" + long + "_" + press + "_" + param;
    //sessionStorage.setItem(key, value);
};
// prototype to get a value from the values object
weatherDBObject.prototype.getValue = function(lat, long, press, param) {
    return this.values[lat + "_" + long + "_" + press + "_" + param];
    //var key = lat + "_" + long + "_" + press + "_" + param;
    //return sessionStorage.getItem(key);
};

// prototype to get the wind vector and speed
// NOTE: This returns the direction the wind is going
weatherDBObject.prototype.getWind = function(lat, long, press) {
    this.ugrd = this.values[lat + "_" + long + "_" + press + "_UGRD"];
    this.vgrd = this.values[lat + "_" + long + "_" + press + "_VGRD"];
    this.speed = Math.sqrt(Math.pow(this.ugrd,2) + Math.pow(this.vgrd,2));
    var tmpdirect = Math.atan2(this.ugrd , this.vgrd) * 180/Math.PI;
    if (tmpdirect < 0) tmpdirect += 360;
    this.direction = tmpdirect;
    return {"speed" : this.speed, "direction" : this.direction};

}

// calculate the air density in kg/m^3
// formula D=P/(R*T)
// P = pressure in pascals (100*mb)
// R = gas constant = 287.05 for dry air
// T = temp in Kelvin
weatherDBObject.prototype.getDensity = function(lat, long, press) {
    this.tmp = this.values[lat + "_" + long + "_" + press + "_TMP"];
    return ((press * 100) / (287.05 * this.tmp));
}

var arrayUnique = function(a) {
    return a.reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
    }, []);
};

// Put the sign on the lat/long.
function latlonSign (val) {
    var signval = 1;
    var x = val >>> 31;
    if ((val >>> 31) == 1) {
        signval = -1;
        val = val & 0x7fffffff;
    }
    return (val * signval);
}

// simple function to pad month, day, hour, minute to 2 char string
function pad (s) {
    var ss = s.toString();
    if (s < 10) {
        ss = "0" + ss
    }
    return ss;
}
// simple function to number to 3 char string
function pad3 (s) {
    var ss = s.toString();
    ss = "0000" + ss
    ss= ss.substr(ss.length - 3);
    return ss;
}

// round to the nearest half            
function roundHalf(n) {
    return (Math.round(n*2)/2).toFixed(1);
};

function computeOffset(lat, lng, distance, heading, radius) {
    var dist = distance / radius;
    var heading = Math.deg2rad(heading);
    var fromLat = Math.deg2rad(lat);
    var cosDistance = Math.cos(dist);
    var sinDistance = Math.sin(dist);
    var sinFromLat = Math.sin(fromLat);
    var cosFromLat = Math.cos(fromLat);
    var sc = cosDistance * sinFromLat + sinDistance * cosFromLat * Math.cos(heading);
    
    var toLat = Math.rad2deg(Math.asin(sc));
    var toLng = Math.rad2deg(Math.deg2rad(lng) + Math.atan2(sinDistance * cosFromLat 
        * Math.sin(heading), cosDistance - sinFromLat * sc));
    
    return {'lat' : toLat, 'lng' : toLng};
}
// Converts from degrees to radians.
Math.deg2rad = function(degrees) {
  return degrees * Math.PI / 180;
};
 
// Converts from radians to degrees.
Math.rad2deg = function(radians) {
  return radians * 180 / Math.PI;
};
