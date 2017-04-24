var playerInJobStartShape = false;
var playerOnJob = false;
var jobInfoBrowser = null;

var tankerPos = null;
var tankerHandle = null;
var haulerPos = null;
var haulerHandle = null;
var tankerMarker = null;
var tankerBlip = null;
var haulerBlip = null;
var playerHasTanker = false;

var canDeliverGas = false;

var deliveryBlips = new Map();
var deliveryMarkers = new Map();

API.onServerEventTrigger.connect(function (eventName, args) {

    switch (eventName) {

        case "player_enter_job_start_shape":
            playerInJobStartShape = true;
            break;

        case "player_exit_job_start_shape":
            playerInJobStartShape = false;
            break;

        case "send_delivery_locations_from_server":

            // create markers and blips for tanker and hauler
            tankerHandle = args[1];
            haulerHandle = args[2];

            tankerPos = API.getEntityPosition(tankerHandle);
            tankerPos.Z += 2.5;
            tankerBlip = API.createBlip(tankerPos);
            tankerMarker = API.createMarker(20, tankerPos, new Vector3(), new Vector3(180, 0, 0), new Vector3(1, 1, 1), 0, 0, 255, 100);

            API.sendChatMessage(args.toString());

            if (haulerHandle != null) {
                haulerPos = API.getEntityPosition(haulerHandle);
                haulerPos.Z += 2.5;
                haulerBlip = API.createBlip(haulerPos);
            }

            // create markers and blips for list of delivery points
            var list = JSON.parse(args[0]);
            for (var i = 0; i < list.length; i++) {
                
                var loc = JSON.parse(list[i].DeliverLocation);
                var vector = new Vector3(loc.X, loc.Y, loc.Z);
                var blip = API.createBlip(vector);
                var marker = API.createMarker(22, vector, new Vector3(0, 0, 1), new Vector3(0, 178.5, 0), new Vector3(10, 1, 15), 255, 255, 255, 100);

                // add marker and blips to map
                deliveryBlips.set(list[i].Id, blip);
                deliveryMarkers.set(list[i].Id, marker);
            }
            break;

        case "player_connects_tanker":

            playerHasTanker = true;
            if (playerOnJob) {

                API.deleteEntity(tankerMarker);
                API.deleteEntity(tankerBlip);
            }

            break;

        case "player_loses_tanker":

            playerHasTanker = false;
            if (playerOnJob) {
                tankerPos = API.getEntityPosition(tankerHandle);
                tankerPos.Z += 2.5;

                tankerBlip = API.createBlip(tankerPos);
                tankerMarker = API.createMarker(20, tankerPos, new Vector3(), new Vector3(180, 0, 0), new Vector3(1, 1, 1), 0, 0, 255, 100);
            }
            break;

        case "player_can_deliver_gas":
            canDeliverGas = true;
            break;

        case "player_cannot_deliver_gas":
            canDeliverGas = false;
            break;

        case "player_delivered_gas":
            canDeliverGas = false;
            var id = args[0];

            // remove marker and blip
            var marker = deliveryMarkers.get(id);
            var blip = deliveryBlips.get(id);
            API.deleteEntity(marker);
            API.deleteEntity(blip);
            deliveryMarkers.delete(id);
            deliveryBlips.delete(id);

            break;
            
    }
});

API.onUpdate.connect(function (sender, args) {

    // display job-shape text if player is in shape and hasnt accepted job
    if (playerInJobStartShape && !playerOnJob) {
        var res_x = API.getScreenResolutionMantainRatio().Width;
        var res_y = API.getScreenResolutionMantainRatio().Height;
        API.drawText("Press ~b~ ENTER ~w~ to Accept Trucking Job", (res_x - res_x / 2), res_y - 60, .5, 255, 255, 255, 255, 0, 1, false, true, 0);
    }

    // display marker and blip on tanker
    if (playerOnJob && !playerHasTanker && tankerMarker != null && tankerHandle != null) {
        tankerPos = API.getEntityPosition(tankerHandle);
        tankerPos.Z += 2.5;
        API.setEntityPosition(tankerMarker, tankerPos);
        API.setBlipPosition(tankerBlip, tankerPos);
    }

    // display blip for hauler
    var playerVeh = API.getPlayerVehicle(API.getLocalPlayer());
    if (playerVeh != null && haulerHandle != null && playerOnJob && playerVeh.Value != haulerHandle.Value) {
        haulerPos = API.getEntityPosition(haulerHandle);
        API.setBlipPosition(haulerBlip, haulerPos);
    }

    // display text to deliver gas if possible
    if (canDeliverGas) {
        var res_x = API.getScreenResolutionMantainRatio().Width;
        var res_y = API.getScreenResolutionMantainRatio().Height;
        API.drawText("Press ~b~ ENTER ~w~ to Deliver Gas", (res_x - res_x / 2), res_y - 60, .5, 255, 255, 255, 255, 0, 1, false, true, 0);
    }
});

// handle client keypresses related to trucking job
API.onKeyDown.connect(function (sender, key) {

    // handle client-side procedure for accepting job
    // if player presses enter in job shape, open CEF browser
    // cef assistance from: https://forum.gtanet.work/index.php?threads/simple-cef-tutorial.1808/
    if (playerInJobStartShape && key.KeyCode === Keys.Enter) {

        playerOnJob = true;
        var res = API.getScreenResolution();
        jobInfoBrowser = API.createCefBrowser(res.Width / 2, res.Height / 2);
        API.waitUntilCefBrowserInit(jobInfoBrowser);
        API.setCefBrowserPosition(jobInfoBrowser, res.Width / 4, res.Height / 4);
        API.loadPageCefBrowser(jobInfoBrowser, "trucking_gas_info.html");
        API.showCursor(true);
        API.setCanOpenChat(false);
    }

    // handle client-side procedure for delivering gas
    if (canDeliverGas && key.KeyCode === Keys.Enter) {
        API.triggerServerEvent("player_deliver_gas");
    }

});


API.onPlayerEnterVehicle.connect(function (vehicle) {

    if (vehicle.Value == haulerHandle.Value) {
        API.deleteEntity(haulerBlip);
    }    
});

API.onPlayerExitVehicle.connect(function (vehicle) {

    if (vehicle.Value == haulerHandle.Value) {
        haulerPos = API.getEntityPosition(haulerHandle);
        haulerBlip = API.createBlip(haulerPos);
    }

    if (playerHasTanker == true) {
        tankerPos = API.getEntityPosition(tankerHandle);
        tankerPos.Z += 2.5;
        tankerBlip = API.createBlip(tankerPos);
        tankerMarker = API.createMarker(20, tankerPos, new Vector3(), new Vector3(180, 0, 0), new Vector3(1, 1, 1), 0, 0, 255, 100);
    }

    playerHasTanker = false;
});


// handle client-side actions for accepting trucking job
function acceptJob() {
    API.sendChatMessage("Accept");
    destroyCefBrowserHelper(jobInfoBrowser);

    API.triggerServerEvent("start_gas_trucking_job");
}

// close cef broswer
function declineJob() {
    playerOnJob = false;
    API.sendChatMessage("Cancel");
    destroyCefBrowserHelper(jobInfoBrowser);
}

function destroyCefBrowserHelper(browser) {

    API.showCursor(false);
    API.destroyCefBrowser(browser);
    API.setCanOpenChat(true);
}