"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const doctosql = require("../src/index");
const entityName = 'TEST_DOCTO_SQL';
const docs = [
    {
        complex_object: {
            good_stuff: 'good stuff value 1',
            more_stuff: 'more stuff value 1'
        },
        config: 'config 1',
        id: 'id1',
        rev: 'rev1-1'
    },
    {
        complex_object: {
            good_stuff: 'good stuff value 2',
            more_stuff: 'more stuff value 2'
        },
        config: 'config 2',
        id: 'id2',
        rev: 'rev2-1'
    },
    {
        complex_object: {
            good_stuff: 'good stuff value 3',
            more_stuff: 'more stuff value 3'
        },
        config: 'config 3',
        id: 'id3',
        rev: 'rev3-1'
    }
];
// To insert, or update, all
doctosql.load(entityName, docs);
// doctosql.incr(entityName, docs);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzaWMtcnVubmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYmFzaWMtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQXlDO0FBQ3pDLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDO0FBQ3BDLE1BQU0sSUFBSSxHQUFVO0lBQ2xCO1FBQ0UsY0FBYyxFQUFFO1lBQ2QsVUFBVSxFQUFFLG9CQUFvQjtZQUNoQyxVQUFVLEVBQUUsb0JBQW9CO1NBQ2pDO1FBQ0QsTUFBTSxFQUFFLFVBQVU7UUFDbEIsRUFBRSxFQUFFLEtBQUs7UUFDVCxHQUFHLEVBQUUsUUFBUTtLQUNkO0lBQ0Q7UUFDRSxjQUFjLEVBQUU7WUFDZCxVQUFVLEVBQUUsb0JBQW9CO1lBQ2hDLFVBQVUsRUFBRSxvQkFBb0I7U0FDakM7UUFDRCxNQUFNLEVBQUUsVUFBVTtRQUNsQixFQUFFLEVBQUUsS0FBSztRQUNULEdBQUcsRUFBRSxRQUFRO0tBQ2Q7SUFDRDtRQUNFLGNBQWMsRUFBRTtZQUNkLFVBQVUsRUFBRSxvQkFBb0I7WUFDaEMsVUFBVSxFQUFFLG9CQUFvQjtTQUNqQztRQUNELE1BQU0sRUFBRSxVQUFVO1FBQ2xCLEVBQUUsRUFBRSxLQUFLO1FBQ1QsR0FBRyxFQUFFLFFBQVE7S0FDZDtDQUNGLENBQUM7QUFFRiw0QkFBNEI7QUFDNUIsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDaEMsbUNBQW1DIn0=