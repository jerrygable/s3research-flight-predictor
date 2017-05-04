//
// Copyright (c)2014 Jerry Gable (www.s3research.com)
// Except where otherwise noted, this work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.
// http://creativecommons.org/licenses/by-nc/4.0/
//
function generateOverlay(predData) {
    var overlayData = new Object();
    // clear out any old results
    $('#uploadresults').text("");
    $('#overlayLink').html("");
    
    var callsign = $('#PICallsign').val().trim().toUpperCase();
    if (callsign == "") {
        alert("You need to enter a calsign to generate an overlay");
        return;
    }
    var predName = $('#PIFlightName').val().trim();
    overlayData.callsign = callsign;
    overlayData.name = predName;
    overlayData.alsotrack = $('#otherCallsigns').val().trim().toUpperCase().replace(/ /g,"");
    var now = new Date();
    overlayData.launchtime = predData.launchTime.format("yyyyMMddHHmmss");
    overlayData.accesskey = overlayData.callsign + "_" + predData.launchTime.format("yyyyMMdd");
    overlayData.uploadtime = now.format("yyyyMMddHHmmss");
    overlayData.kml =  encodeKML(predData);
    overlayData.prediction = JSON.stringify(predData);
    // Sample URL: http://aprs.fi/#!kml=http%3A%2F%2Fs3research.com%2Ftest1.kml&call=a%2FWB8ELK-9%2Ca%2FWB8ELK%2Ca%2FWB8ELK-1&timerange=86400&tail=86400
    var url =  "http://aprs.fi/#!kml="
    url += encodeURIComponent("http://s3research.com/tools/overlays/get.php?key=" + overlayData.accesskey);
    url += "&call=a%2F" + callsign;
    var alsotrack = overlayData.alsotrack.split(",");
    if (alsotrack.length > 1 || alsotrack[0] != "") {
        for (var cs in alsotrack) {
            url += "%2Ca%2F" + alsotrack[cs];
        }
    }
    url += "&timerange=86400&tail=86400";
    overlayData.aprsfiuri = url;
    $.post('/tools/overlays/insert.php', overlayData, function (msg, status) {
        $('#uploadresults').text(msg);
        $('#overlayLink').html('Copy <a target="_blank" href="' + url + '">This Link</a> to view at aprs.fi. Note aprs.fi only zooms to tracked callsigns, not overlays.');
    },
    'text');
    
}

// convert the prediction to kml
function encodeKML(predData) {
    var callsign = predData.callsign;
    var kmlOutput = "<?xml version='1.0' encoding='UTF-8'?><kml xmlns='http://www.opengis.net/kml/2.2'><Document>\n";
    // Generate the flight path line
    kmlOutput += "<Placemark>\n";
    kmlOutput += "<LineString><coordinates>"  
    for (var i=0; i < predData.waypoints.length; i++) {
        kmlOutput += predData.waypoints[i].lng + "," + predData.waypoints[i].lat + "," + predData.waypoints[i].alt + "\n";
    }
    kmlOutput += "</coordinates></LineString>\n";
    kmlOutput += "<Style><LineStyle>";
    kmlOutput += "<width>2</width>";
    kmlOutput += "<color>ffff0000</color>";
    kmlOutput += "</LineStyle></Style>\n";
    kmlOutput += "</Placemark>\n";
     
    // Output all the markers
    $.each( predData.keypoints, function( key, value ) {
        kmlOutput += "<Placemark>\n";
        switch(key) {
            case 'launch':
                kmlOutput += "<name>Launch</name>\n";
                break;
            case 'floatStart':
                kmlOutput += "<name>Float</name>\n";
                break;
            case 'burst':
                kmlOutput += "<name>Burst</name>\n";
                break;
            case 'touchdown':
                kmlOutput += "<name>Touchdown</name>\n";
                break;
            default:
                kmlOutput += "<name>Unknown Point</name>\n";
        }        
        kmlOutput += "<description><![CDATA[" + buildDescr(value, callsign) +"]]></description>\n";
        kmlOutput += "<Point><coordinates>"  + value.lng + "," + value.lat + "," +  value.alt + "</coordinates></Point>\n";
        kmlOutput += "<styleUrl>#" +  key + "</styleUrl>\n";						
        kmlOutput += "</Placemark>\n";
    });
    // Add in coloured standard markers as Icon Styles	
    kmlOutput += '<Style id="launch">\n';
    kmlOutput += '<IconStyle><Icon><href>http://maps.google.com/mapfiles/kml/paddle/L.png</href></Icon><hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/></IconStyle>\n';
    kmlOutput += '</Style>\n';
    kmlOutput += '<Style id="floatStart">\n';
    kmlOutput += '<IconStyle><Icon><href>http://maps.google.com/mapfiles/kml/paddle/F.png</href></Icon><hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/></IconStyle>\n';
    kmlOutput += '</Style>\n';
    kmlOutput += '<Style id="burst">\n';
    kmlOutput += '<IconStyle><Icon><href>http://maps.google.com/mapfiles/kml/paddle/B.png</href></Icon><hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/></IconStyle>\n';
    kmlOutput += '</Style>\n';
    kmlOutput += '<Style id="touchdown">\n';
    kmlOutput += '<IconStyle><Icon><href>http://maps.google.com/mapfiles/kml/paddle/T.png</href></Icon><hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/></IconStyle>\n';
    kmlOutput += '</Style>\n';
     
    // Complete the document
    kmlOutput += "</Document></kml>";
    // return the kml file
    return kmlOutput;
}

// create the keypoint description
function buildDescr(data, callsign) {
    if (data.timestamp > 10800) {
        var tempTS = (data.timestamp/(3600)).toFixed(1) + ' Hrs.';
    } else {
        var tempTS = (data.timestamp/60).toFixed(1) + ' Min.';
    }
    var descr = "Prediction for " + callsign + "<br>";
    descr += "Latitude: " + data.lat.toFixed(5) + "<br>";
    descr += "Longitude: " + data.lng.toFixed(5) + "<br>";
    descr += "Altitude: " + (data.alt * 3.28084).toFixed(0)+ ' Ft.<br>';
    descr += "Timestamp: " + tempTS + "<br>";
    return descr;
}