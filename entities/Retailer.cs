using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public class Retailer
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public string DeliverLocation { get; set; }
        public string PurchaseLocation { get; set; }
        public int Stock { get; set; }
        public int Capacity { get; set; }

    }
}
