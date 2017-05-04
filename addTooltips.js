//
// Copyright (c)2014 Jerry Gable (www.s3research.com)
// Except where otherwise noted, this work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.
// http://creativecommons.org/licenses/by-nc/4.0/
//
// This defines the tooltips used.
function addTooltips () {

    $("#predTab").jqxTooltip({ content: 'Use this tab to enter the details about the flight', position: 'bottom', autoHideDelay: 5000});
    $("#resultsTab").jqxTooltip({ content: 'Use this tab to view and interact with the prediction', position: 'bottom', autoHideDelay: 5000});
    $("#forecastCycle").jqxTooltip({ content: 'timestamp used by NOAA to indentify a forecast. Default is the latest available.', position: 'top-right'});
    $("#PIFlightName").jqxTooltip({ content: 'Enter a name that will allow you to identify the prediction on th results page', position: 'top-right'});
    $("#PICallsign").jqxTooltip({ content: 'The callsign of the flight tracker', position: 'top-right'});
    $("#PILat").jqxTooltip({ content: 'Latitude of the launch loacation.', position: 'top-right'});
    $("#PILong").jqxTooltip({ content: 'Longitude of the launch loacation.', position: 'top-right'});
    $("#PIAutoLnch").jqxTooltip({ content: 'When checked the launch altitude is provide by Google Maps.  Uncheck to manually enter', position: 'top-right'});
    $("#PILnchAlt").jqxTooltip({ content: 'Manually enter the launch altitude here.', position: 'top-right'});
    $("#PILaunchTime").jqxTooltip({ content: 'Enter the launch time (UTC).', position: 'top-right'});
    $("#PIBurst").jqxTooltip({ content: 'Enter the expected burst altitude', position: 'top-right'});
    $("#PIFloatChk").jqxTooltip({ content: 'Check this box to enter a float time for the balloon', position: 'top-right'});
    $("#PIFloatTime").jqxTooltip({ content: 'Enter the float time in minutes.', position: 'top-right'});
    $("#PIAscent").jqxTooltip({ content: 'Enter the ascent rate of the balloon.', position: 'top-right'});
    $("#PIDescent").jqxTooltip({ content: 'Enter the sea level descent rate off the parachute.  Will be adjusted for altitude. ', position: 'top-right'});
    $("#PIAutoTD").jqxTooltip({ content: 'When checked the touchdown altitude is provide by Google Maps.  Uncheck to manually enter', position: 'top-right'});
    $("#PITDAlt").jqxTooltip({ content: 'Manually enter the touchdown altitude here.', position: 'top-right'});
    $("#savePredTooltip").jqxTooltip({ content: "Click this button to save this prediction on your computer.<br>NOTE: You don't have to save to view on the results page.", position: 'bottom', autoHideDelay: 5000});
    $("#PIGeneratePred").jqxTooltip({ content: "Click to generate a prediction based on the above data.", position: 'bottom'});
    $("#autofit").jqxTooltip({ content: 'Click this to zoom the map to the markers.', position: 'top-right'});
    $("#showWeather").jqxTooltip({ content: 'Check this box to add the weather area to the map.', position: 'top-right'});
    $("#loadPred").jqxTooltip({ content: 'Click this button to load a saved prediction or an actual flight saved as a csv file.', position: 'top-right'});
    $("#delPred").jqxTooltip({ content: 'Select a flight in the tabe and click this button to remove it from the table, map, and Altitude graph.', position: 'top-right'});
    $("#showRuler").jqxTooltip({ content: 'Click this button to add markers that can be moved to measure distances on the map.', position: 'bottom'});
    $("#otherCallsigns").jqxTooltip({ content: 'Enter extra callsigns you want to track. Separate with commas. aprs.fi wildcards are OK<br>(example: KF7MVY-11,KF7MVY-3,WA0TJT-*)', position: 'bottom'});
    $("#generateOverlay").jqxTooltip({ content: 'Click this button to generate the overlay and upload it to the s3research server for display on aprsfi', position: 'top-right'});
    $("#overlayLink").jqxTooltip({ content: 'This link will display the overlay as well as well as the tracks for the tracker and additional calsigns entered.<br><b>NOTE:</b> aprs.fi will not zoom to include the overlay.  You may need to zoom out to see the prediction if the trackers are not close to it.', position: 'top-right', autoHideDelay: 6000});
    $("#uploadresults").jqxTooltip({ content: 'This is the status of the server upload of the overlay', position: 'bottom'});
    $("#debugbtn").jqxTooltip({ content: 'This control selects the debug level.  Basic will print main messages.  Full will print messages in the various loops<br><b>NOTE:</b> Turning on logging will significantly slow down the tool.  Turn on only if needed.', position: 'top-right', autoHideDelay: 5000});
    $("#predictCSV").jqxTooltip({ content: 'This button selects if you want to load a saved prediction or an actual flight saved as a .csv file.', position: 'top-right'});
    $("#LFInput").jqxTooltip({ content: 'Select the file you want to load.', position: 'top-right'});
    $("#CSVType").jqxTooltip({ content: 'Select the format of the csv file you want to load.  Currently exports from aprs.fi and findu.com are supported.', position: 'top-right'});

    $("#LFFlightName").jqxTooltip({ content: 'Enter a descriptive name here to identify the flight on the prediction results page.', position: 'top-right'});
    $("#LFCallsign").jqxTooltip({ content: 'Enter the callsign to display on the prediction results page', position: 'top-right'});
    $("#LFok").jqxTooltip({ content: 'Click to load the file into the prediction results page.', position: 'left'});
    $("#LFcancel").jqxTooltip({ content: 'Click to cancel the load.', position: 'top-right'});
    
};