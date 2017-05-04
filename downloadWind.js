//
// Copyright (c)2014 Jerry Gable (www.s3research.com)
// Except where otherwise noted, this work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.
// http://creativecommons.org/licenses/by-nc/4.0/
//

// Generate the default time the forecast to use.
function getDefaultForecastCycle () {
    
    // use the UTCoffset to get the UTC time to calculate forecast time
    // note this is then acted upon as it was local time
    var nowTime = new Date();
    var forecastTime = new Date(nowTime.getTime() - UTCoffset);
    
    // go back 5 hours to make sure the forecast is available
    forecastTime.setHours(forecastTime.getHours()-4);
    // and now go back to the prev forecast time.
    if (forecastTime.getHours() >= 18) {
        forecastTime.setHours(18,0,0,0);
    } else if (forecastTime.getHours() >= 12) {
        forecastTime.setHours(12,0,0,0);
    } else if (forecastTime.getHours() >= 6) {
        forecastTime.setHours(6,0,0,0);
    } else {
        forecastTime.setHours(0,0,0,0);
    }
    // Set the default launch time to the forecast time as default
    var tmpD1 = new Date(nowTime.getTime() - UTCoffset);
    tmpD1 = tmpD1.clearTime();
    
    $("#PILaunchDate").jqxDateTimeInput('setDate', new Date(nowTime.getTime() - UTCoffset));

    // set the text value of the forecast name
    // NOTE: month returned is 0 to 11 so you have to add 1 to get what we consider the month
    return forecastTime.format("yyyyMMddHH"); 
}

// calc miles data span size 
/*function calcWeatherSpans () {
    var latCtr = Number($('#latIn').val());
    var lngCtr = Number($('#longIn').val());
    var latOfst = Number($('#abpoints').val()) * 0.5;
    var lngOfst = Number($('#lrpoints').val()) * 0.5;
    var centerpt = new google.maps.LatLng(latCtr, lngCtr);
    var latPoint = new google.maps.LatLng(latCtr + latOfst, lngCtr);
    var lngPoint = new google.maps.LatLng(latCtr, lngCtr + lngOfst);
    var latDist = google.maps.geometry.spherical.computeDistanceBetween(centerpt,latPoint);
    latDist = latDist/1609.34;
    latDist = latDist.toFixed(0);
    $("#abmiles").text(latDist);
    var lngDist = google.maps.geometry.spherical.computeDistanceBetween(centerpt,lngPoint);
    lngDist = lngDist/1609.34;
    lngDist = lngDist.toFixed(0);
    $("#lrmiles").text(lngDist);
}
*/
// simple function to pad month, day, hour, minute to 2 char string
function pad (s) {
    var ss = s.toString();
    if (s < 10) {
        ss = "0" + ss
    }
    return ss;
}
// calculate the launch times 
function calcForecastTimes (FCS) {
    // loop through all of the future times to fill in the select
    // the forecast is hourly from 0 to 192 hours
    
alert( " calcForecastTimes was called. (in downloadWind.js, line 66)");   
    var options = new Array;
    for (var i = 0; i <= 192; i+=3) {
        var thisTime = new Date(Date.UTC(FCS.substr(0, 4), Number(FCS.substr(4, 2)) -1, FCS.substr(6, 2), FCS.substr(8, 2), 0, 0, 0));
        thisTime.setUTCHours(thisTime.getUTCHours()+i);
        var thisOpt =  pad(thisTime.getUTCMonth()+1) + "/" + pad(thisTime.getUTCDate()) + "/" + thisTime.getUTCFullYear().toString() + " " + pad(thisTime.getUTCHours()) + ":00 UTC (+ " + i + " hrs)";
        options.push(thisOpt);
    }
    // insert the options
    return options; 
}

// round to the nearest half            
function roundHalf(n) {
    return (Math.round(n*2)/2).toFixed(1);
};

// timer for fake progress bar
function windloadTimer() {
    if (windloadTimeoutValue >= 100) {
        windloadTimeoutValue = 0;
    } else {
        windloadTimeoutValue++;
    }
    $("#windLoadProgressBar").val(windloadTimeoutValue);
}