var playerInJobStartShape = false;
var playerOnJob = false;
var jobInfoBrowser = null;

var tankerHandle = null;
var haulerHandle = null;


var jobEndMarker = null;
var jobEndBlip = null;
var jobEndLabel = null;
var jobEndPos = null;

var playerHasTanker = false;

var canDeliverGas = false;
var tankerInDeliveryShape = null;

var tankerInJobEndShape = false;

var deliveryBlips = new Map();
var deliveryMarkers = new Map();
var deliveryRotations = new Map();

var string = null;

API.onServerEventTrigger.connect(function (eventName, args) {

    switch (eventName) {

        case "player_enter_job_start_shape":
            playerInJobStartShape = true;
            break;

        case "player_exit_job_start_shape":
            playerInJobStartShape = false;
            break;

        case "send_delivery_info_to_client":

            string = args[0];
            playerOnJob = true;
            var res = API.getScreenResolution();
            jobInfoBrowser = API.createCefBrowser(res.Width / 2, res.Height / 2);
            API.waitUntilCefBrowserInit(jobInfoBrowser);
            API.setCefBrowserPosition(jobInfoBrowser, res.Width / 4, res.Height / 4);
            API.loadPageCefBrowser(jobInfoBrowser, "trucking_gas_info.html");
            API.showCursor(true);
            API.setCanOpenChat(false);
            API.sleep(100);
            jobInfoBrowser.call("displayJson", string);
            break;

        case "send_delivery_locations_from_server":

            tankerHandle = args[1];
            haulerHandle = args[2];

            // create marker, label, and blip for job end point
            var pos = JSON.parse(args[3]);

            jobEndPos = new Vector3(pos.X, pos.Y, pos.Z);
            jobEndMarker = API.createMarker(22, jobEndPos, new Vector3(0, 0, 1), new Vector3(0, 180, 0), new Vector3(10, 1, 15), 255, 0, 0, 100);

           //jobEndLabel = API.createTextLabel("~r~ Return Tanker Here When Finished", jobEndPos, 50, 0.3, false);


            // create markers and blips for list of delivery points
            
            list = JSON.parse(args[0]);
            API.sendChatMessage(string.toString());
            for (var i = 0; i < list.length; i++) {
                
                var loc = JSON.parse(list[i].DeliverLocation);
                var vector = new Vector3(loc.X, loc.Y, loc.Z);
                var bonusRotation = list[i].BonusRotation

                var blip = API.createBlip(vector);
                API.setBlipColor(blip, 5);
                API.setBlipName(blip, "Gas Delivery");

                var marker = API.createMarker(22, vector, new Vector3(0, 0, 1), new Vector3(0, bonusRotation, 0), new Vector3(10, 1, 15), 66, 155, 244, 100);

                // add marker and blips to map
                deliveryBlips.set(list[i].Id, blip);
                deliveryMarkers.set(list[i].Id, marker);
                deliveryRotations.set(list[i].Id, bonusRotation);
                API.sendChatMessage(bonusRotation.toString());
                API.sendChatMessage(deliveryRotations.get(list[i].Id).toString());
            }
            break;

        case "tanker_entered_delivery_shape":
            tankerInDeliveryShape = args[0];

            // change marker color
            var marker = deliveryMarkers.get(args[0]);

            if (marker != null) {
                API.setMarkerColor(marker, 100, 239, 234, 69);
            }
            
            break;

        case "tanker_exited_delivery_shape":
            tankerInDeliveryShape = null;

            // change marker color            
            var marker = deliveryMarkers.get(args[0]);

            if (marker != null) {
                API.setMarkerColor(marker, 100, 66, 155, 244);
            }
            
            break;

        case "player_can_deliver_gas":        
            canDeliverGas = true;
            break;

        case "player_cannot_deliver_gas":
            canDeliverGas = false;
            break;

        case "player_delivered_gas":
            tankerInDeliveryShape = null;
            canDeliverGas = false;
            var id = args[0];

            // remove marker and blip
            var marker = deliveryMarkers.get(id);
            var blip = deliveryBlips.get(id);
            API.deleteEntity(marker);
            API.deleteEntity(blip);
            deliveryMarkers.delete(id);
            deliveryBlips.delete(id);

            // handle client-side procedure for ending job
            if (deliveryBlips.size == 0) {

                jobEndBlip = API.createBlip(jobEndPos);
                API.setBlipColor(jobEndBlip, 49); // red
            }
            break;

        case "tanker_entered_job_end_shape":
            tankerInJobEndShape = true;
            break;

        case "tanker_exited_job_end_shape":
            tankerInJobEndShape = false;
            break;

        case "end_job":

            playerOnJob = false;
            tankerInJobEndShape = false;


            // delete markers, blips, and positions
            deliveryMarkers.forEach(function (item, key, mapObj) {
                API.deleteEntity(item);
            });

            deliveryBlips.forEach(function (item, key, mapObj) {
                API.deleteEntity(item);
            });

            deliveryMarkers.clear()
            deliveryBlips.clear();
            deliveryRotations.clear();

            // delete job end blip and marker
            API.deleteEntity(jobEndMarker);
            if (jobEndBlip != null) API.deleteEntity(jobEndBlip);

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

    // display text to deliver gas if possible
    if (canDeliverGas) {
        var res_x = API.getScreenResolutionMantainRatio().Width;
        var res_y = API.getScreenResolutionMantainRatio().Height;
        API.drawText("Press ~b~ ENTER ~w~ to Deliver Gas", (res_x - res_x / 2), res_y - 60, .5, 255, 255, 255, 255, 0, 1, false, true, 0);
    }

    // display tanker rotation if in delivery shape
    if (tankerInDeliveryShape != null) {
        var res_x = API.getScreenResolutionMantainRatio().Width;
        var res_y = API.getScreenResolutionMantainRatio().Height;

        var tankerRot = API.getEntityRotation(tankerHandle).Z + 180;
        var bonusRot = deliveryRotations.get(tankerInDeliveryShape + 180);

        var diffRot = (tankerRot - bonusRot) % 360;
        var diffX = API.getEntityPosition(tankerHandle).X - API.getBlipPosition(deliveryBlips.get(tankerInDeliveryShape)).X;
        var diffY = API.getEntityPosition(tankerHandle).Y - API.getBlipPosition(deliveryBlips.get(tankerInDeliveryShape)).Y;

        // round numbers to 1 decimal place
        diffRot = Math.round(diffRot * 10) / 10;
        diffX = Math.round(diffX * 10) / 10;
        diffY = Math.round(diffY * 10) / 10;

        // change color of marker if tanker is aligned good enough for bonus
        if (Math.abs(diffRot) <= 2 && Math.abs(diffX) <= 2 && Math.abs(diffY) <= 2)
        {
            var marker = deliveryMarkers.get(tankerInDeliveryShape);
            API.setMarkerColor(marker, 100, 0, 198, 3);
        }
        else
        {
            var marker = deliveryMarkers.get(tankerInDeliveryShape);
            API.setMarkerColor(marker, 100, 239, 234, 69);
        }

        API.drawText("Rot: " + diffRot.toString() + " X: " + diffX.toString() + " Y: " + diffY.toString(), (res_x - res_x / 2), res_y - 100, .5, 255, 255, 255, 255, 0, 1, false, true, 0);

        
    }

    if (tankerInJobEndShape && playerOnJob) {

        var res_x = API.getScreenResolutionMantainRatio().Width;
        var res_y = API.getScreenResolutionMantainRatio().Height;
        API.drawText("Release Tanker to End Job", (res_x - res_x / 2), res_y - 60, .5, 255, 255, 255, 255, 0, 1, false, true, 0);
    }
});

// handle client keypresses related to trucking job
API.onKeyDown.connect(function (sender, key) {

    // handle client-side procedure for accepting job
    // if player presses enter in job shape, open CEF browser
    // cef assistance from: https://forum.gtanet.work/index.php?threads/simple-cef-tutorial.1808/
    if (playerInJobStartShape && key.KeyCode === Keys.Enter) {

        API.triggerServerEvent("request_delivery_info_from_server");            
    }

    // handle client-side procedure for delivering gas
    if (canDeliverGas && key.KeyCode === Keys.Enter) {
        API.triggerServerEvent("player_deliver_gas");
    }

});

// handle client-side actions for accepting trucking job
function acceptJob() {
    destroyCefBrowserHelper(jobInfoBrowser);
    API.triggerServerEvent("start_gas_trucking_job");
}

// close cef broswer
function declineJob() {
    playerOnJob = false;
    destroyCefBrowserHelper(jobInfoBrowser);
}

function destroyCefBrowserHelper(browser) {

    API.showCursor(false);
    API.destroyCefBrowser(browser);
    API.setCanOpenChat(true);
    jobInfoBrowser = null;
}