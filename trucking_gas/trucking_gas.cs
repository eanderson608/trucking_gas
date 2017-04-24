using System;
using System.IO;
using System.Collections.Generic;
using System.Collections;
using GTANetworkServer;
using GTANetworkShared;
using MySql.Data.MySqlClient;
using Insight.Database.Providers.MySql;
using Insight.Database;

// [Command("test_veh")]
// public void test_veh(Client player)
// {
//     API.createVehicle(VehicleHash.Tanker, new Vector3(1478.65, -1941.525, 70.87663), new Vector3(-0.1540594, 1.219151, -58.19306), 0, 0);
//     API.createVehicle(VehicleHash.Tanker, new Vector3(1499.669, -1883.172, 71.91733), new Vector3(0.9528068, -1.812619, -56.72259), 0, 0);
//     API.createVehicle(VehicleHash.Tanker, new Vector3(1484.068, -1920.807, 71.2972), new Vector3(-1.602701, 0.1204513, -150.8448), 0, 0);
//     API.createVehicle(VehicleHash.Tanker, new Vector3(1462.376, -1962.467, 70.54766), new Vector3(-4.629603, 0.4030944, 77.08592), 0, 0);
//     API.createVehicle(VehicleHash.Tanker, new Vector3(1464.602, -1967.525, 70.93919), new Vector3(-2.127359, 3.860004, 82.53113), 0, 0);
//     API.createVehicle((VehicleHash)(1518533038), new Vector3(1358.479, -2095.168, 52.23389), new Vector3(-0.5589451, -0.009479955, 39.35367), 0, 0);
//     API.createVehicle((VehicleHash)(1518533038), new Vector3(1353.362, -2072.033, 52.23305), new Vector3(-0.5559111, 0.1112771, -52.28785), 0, 0);
//     API.createVehicle((VehicleHash)(1518533038), new Vector3(1363.787, -2063.75, 52.23439), new Vector3(-0.4294589, -0.01799727, -51.96065), 0, 0);
//     API.createVehicle((VehicleHash)(1518533038), new Vector3(1413.885, -2055.93, 52.2322), new Vector3(-0.580934, 0.02048028, 111.118), 0, 0);
//     API.createVehicle((VehicleHash)(1518533038), new Vector3(1411.602, -2052.352, 52.23357), new Vector3(-0.5466788, -0.216793, 114.7139), 0, 0);
// }
//
// [Command("test_mark")]
// public void test_mark(Client player)
// {
//     API.createSphereColShape(new Vector3(1383.331, -2079.071, 51.99853), 5f);
//     API.createMarker(1, new Vector3(1383.331, -2079.071, 51.99853 - 1), new Vector3(), new Vector3(), new Vector3(1, 1, 1), 255, 255, 0, 0, 0);
//     API.createBlip(new Vector3(1383.331, -2079.071, 51.99853));
//
// }


namespace Jobs
{
    public class trucking_gas : Script
    {

        ColShape jobStartShape = null;
        List<Retailer> gasStations = null;
        ArrayList deliveryColShapes = new ArrayList();
        ArrayList contractsAsync = new ArrayList();
        ArrayList contracts;
        ArrayList tankerModels = new ArrayList();
        

        private static MySqlConnectionStringBuilder _database;
        private static IRetailerRepository _retailerRepository;

        public trucking_gas()
        {
            API.onResourceStart += OnResourceStart;
            API.onPlayerConnected += OnPlayerConnected;
            API.onEntityEnterColShape += OnEntityEnterColShapeHandler;
            API.onEntityExitColShape += OnEntityExitColShapeHandler;
            API.onClientEventTrigger += OnClientEvent;
            API.onVehicleTrailerChange += OnVehicleTrailerChangeHandler;

        }

        public void OnResourceStart()
        {
            // set up database connection
            MySqlInsightDbProvider.RegisterProvider();
            _database = new MySqlConnectionStringBuilder("server=localhost;user=root;database=gtanserver;port=3306;password=");
            _retailerRepository = _database.Connection().As<IRetailerRepository>();

            // get list of gas stations
            gasStations = _retailerRepository.GetAllRetailersByType("GAS_STATION");
       
            // get delivery locations, convert to Vector3's, and create col shapes
            // also save id in colshape entity data
            foreach (var station in gasStations)
            {
                dynamic d = API.fromJson(station.DeliverLocation);
                Vector3 pos = new Vector3((float)d.X, (float)d.Y, (float)(d.Z - 1));
                var shape = API.createCylinderColShape(pos, 5, 5);
                shape.setData("ID", station.Id);

                // add shapes to list
                deliveryColShapes.Add(shape);
            }

            // initailize list of tanker models
            tankerModels.Add(-730904777);
            tankerModels.Add(1956216962);
            tankerModels.Add(-1207431159);

            // synchronize list of contracts
            contracts = ArrayList.Synchronized(contractsAsync);

            var jobStartPos = new Vector3(1383.331, -2079.071, 51.99853 + 1);
            var jobStartTextPos = new Vector3(1383.331, -2079.071, 51.99853 + 1.5);
            jobStartShape = API.createSphereColShape(jobStartPos, 3f);

            var jobStartMarker = API.createMarker(20, jobStartPos, new Vector3(), new Vector3(180, 0, -25), new Vector3(1, 1, 1), 150, 0, 0, 255, 0);
            var jobStartTextLabel = API.createTextLabel("~b~ Trucking Job: Gas", jobStartTextPos, 100f, 0.3f, true);

            var jobStartBlip = API.createBlip(jobStartMarker);
            API.setBlipSprite(jobStartBlip, 477);
            API.setBlipColor(jobStartBlip, 26);
            API.setBlipName(jobStartBlip, "Trucking Job: Gas");
        }

        public void OnClientEvent(Client player, string eventName, params object[] arguments)
        {
            if (eventName == "start_gas_trucking_job")
            {
                // create vehicles
                Vehicle hauler = API.createVehicle(VehicleHash.Hauler, new Vector3(1358.479, -2095.168, 52), new Vector3(0, 0, 30), 0, 0);
                Vehicle tanker = API.createVehicle(VehicleHash.Tanker, new Vector3(1478.65, -1941.525, 70.87663), new Vector3(-0.1540594, 1.219151, -58.19306), 0, 0);
                API.setEntitySyncedData(tanker.handle, "GAS", 6000);
                API.setEntitySyncedData(tanker.handle, "GAS_CAPACITY", 6000);


                // create contract object
                DeliveryContract contract = new DeliveryContract(player, tanker);
                contract.addDelivery(1, 2000); // 2000 gallons to gas station with id of 1
                contracts.Add(contract);

                API.sendChatMessageToPlayer(player, "you are contracted to deliver: " + contract.Deliveries);

                // create list of delivery locations from contract
                ArrayList deliveryLocs = new ArrayList();
                foreach (var key in contract.Deliveries.Keys)
                {
                    deliveryLocs.Add(_retailerRepository.GetRetailerById(key));
                }

                // send delivery locations to player
                var deliveryLocsJson = API.toJson(deliveryLocs);
                API.triggerClientEvent(player, "send_delivery_locations_from_server", deliveryLocsJson, tanker.handle, hauler.handle);         

            }
            else if (eventName == "player_deliver_gas")
            {
                // find the players delivery contract
                DeliveryContract contract = null;
                foreach (DeliveryContract c in contracts)
                {
                    if (c.Player == player)
                    {
                        contract = c;
                    }
                }

                // deliver gas
                var stationId = API.getEntityData(player.handle, "IS_ABLE_TO_DELIVER_TO_STATION");
                API.sendChatMessageToPlayer(player, "you are delivering " + contract.Deliveries[stationId] + " gallons of gasoline to station: " + stationId.ToString());
                _retailerRepository.AddRetailerStock(stationId, contract.Deliveries[stationId]);

                // remove delivery from contract
                contract.removeDelivery(stationId);
                API.sendChatMessageToPlayer(player, "deliveries remaining: " + contract.Deliveries.Count.ToString());

                // trigger client event
                API.triggerClientEvent(player, "player_delivered_gas", stationId);

            }
        }


        private void OnPlayerConnected(Client player)
        {
            API.sendChatMessageToPlayer(player, "~g~ Hello World! ");
            API.setEntityPosition(player, new Vector3(1413.885, -2055.93, 52.2322));
        }

        private void OnEntityEnterColShapeHandler(ColShape shape, NetHandle entity)
        {

            Client player = null;
            bool tankerEnteredShape = false;

            // determine if the enitiy that entered the colshape is a player
            // or a tanker
            if (API.getEntityType(entity) == (EntityType) 6)
            {
                player = API.getPlayerFromHandle(entity);
            } else if (tankerModels.Contains(API.getEntityModel(entity)))
            {
                tankerEnteredShape = true;
            }

            // when a player enters the job start shape
            if (shape == jobStartShape && player != null)
            {
                API.triggerClientEvent(player, "player_enter_job_start_shape");
            }   
           
            // when a player or a tanker enters a delivery shape, check to see if both
            // the tanker and the player from an open contract are in the shape and if the player
            // is not in a vehicle. if so, tell client they are able to deliver the gas
            if ((player != null || tankerEnteredShape) && deliveryColShapes.Contains(shape))
            {
                var id = shape.getData("ID");
                foreach (DeliveryContract contract in contracts)
                {
                    if (shape.containsEntity(contract.Player.handle) && shape.containsEntity(contract.Tanker.handle) && !contract.Player.isInVehicle && contract.Deliveries.ContainsKey(id))
                    {
                        API.setEntityData(contract.Player.handle, "IS_ABLE_TO_DELIVER_TO_STATION", id);
                        API.triggerClientEvent(contract.Player, "player_can_deliver_gas", id);
                        break; // break loop once contract is found
                    }
                }
            }

        }

        private void OnEntityExitColShapeHandler(ColShape shape, NetHandle entity)
        {

            Client player = null;
            bool tankerExitedShape = false;

            // determine if the enitiy that exited the colshape is a player
            // or a tanker and if so, which one
            if (API.getEntityType(entity) == (EntityType) 6)
            {
                player = API.getPlayerFromHandle(entity);
            }

            if (shape == jobStartShape && player != null)
            {

                API.triggerClientEvent(player, "player_exit_job_start_shape");
            }

            // if either a player or a tanker leaves a delivery shape, check and see if they
            // have an open delivery contract.  if so, tell client they can not deliver gas
            if ((player != null || tankerExitedShape) && deliveryColShapes.Contains(shape))
            {
                foreach (DeliveryContract contract in contracts)
                {
                    if (contract.Player == player || contract.Tanker.handle == entity)
                    {
                        API.setEntityData(contract.Player.handle, "IS_ABLE_TO_DELIVER_TO_STATION", null);
                        API.triggerClientEvent(contract.Player, "player_cannot_deliver_gas");
                        break; // break loop once contract is found
                    }
                }
            }
        }

        private void OnVehicleTrailerChangeHandler(NetHandle tower, NetHandle trailer)
        {
            foreach (DeliveryContract contract in contracts)
            {
                // get the vechicle driven by player, if its trailer is the one specified
                // in the delivery contract, send event to player
                var playerVeh = API.getPlayerVehicle(contract.Player);
                if (trailer == contract.Tanker && tower == playerVeh)
                {
                    API.triggerClientEvent(contract.Player, "player_connects_tanker");
                } else if (tower == playerVeh && trailer.IsNull)
                {
                    API.triggerClientEvent(contract.Player, "player_loses_tanker");
                }
            }
        }
    }

    public interface IRetailerRepository
    {
        List<Retailer> GetAllRetailersByType(string _type);
        Retailer GetRetailerById(int _id);
        void AddRetailerStock(int _id, int _amount);
        void AddStockEnRoute(int _id, int _amount);
    }

    public class Retailer
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public string DeliverLocation { get; set; }
        public string PurchaseLocation { get; set; }
        public int Stock { get; set; }
        public int Capacity { get; set; }
        public int StockEnroute { get; set; }
        public int BonusRotation { get; set; }

    }

    public class DeliveryContract
    {
        public DeliveryContract(Client player, Vehicle tanker)
        {
            this.Player = player;
            this.Tanker = tanker;
            this.Deliveries = new Dictionary<int, int>();
        }

        public Client Player { get; set; }
        public Vehicle Tanker { get; set; }
        public Dictionary<int, int> Deliveries { get; set; }
        public void addDelivery(int id, int amount)
        {
            this.Deliveries.Add(id, amount);
        }
        public void removeDelivery(int id)
        {
            this.Deliveries.Remove(id);
        }

    }
}
