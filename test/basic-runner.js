"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const doctosql = require("../src/index");
const entityName = 'TEST_DOCTO_SQL';
const docs = [
    {
        config: 'arbitrary_config_changed',
        id: 'some_id',
        rev: 'some_rev_changed_again'
    }
];
// To insert, or update, all
doctosql.load(entityName, docs);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzaWMtcnVubmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYmFzaWMtcnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEseUNBQXlDO0FBQ3pDLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDO0FBQ3BDLE1BQU0sSUFBSSxHQUFVO0lBQ2xCO1FBQ0UsTUFBTSxFQUFFLDBCQUEwQjtRQUNsQyxFQUFFLEVBQUUsU0FBUztRQUNiLEdBQUcsRUFBRSx3QkFBd0I7S0FDOUI7Q0FDRixDQUFDO0FBRUYsNEJBQTRCO0FBQzVCLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDIn0=