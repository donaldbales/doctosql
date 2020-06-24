"use strict";
// test doc
/* tslint:disable:object-literal-sort-keys */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const uuid = require("uuid");
exports.doc = {
    _id: uuid.v1(),
    _rev: `0.${uuid.v1()}`,
    aBoolean: true,
    aDate: new Date().toISOString(),
    aNumber: 31.61705701614879,
    aString: 'Thirty One Point Six One Seven ...',
    anObjectWithNoId: {
        aBoolean: false,
        aDate: new Date().toISOString(),
        aNumber: 2.0,
        aString: 'Two Point Zero'
    },
    anObjectWithAnId: {
        id: uuid.v1(),
        aBoolean: true,
        aDate: new Date().toISOString(),
        aNumber: 3.0,
        aString: 'Three Point Zero',
        anObjectWithinAnObject: {
            id: uuid.v1(),
            aBoolean: false,
            aDate: new Date().toISOString(),
            aNumber: 6.0,
            aString: 'Six Point Zero'
        }
    },
    anArrayWithNoIds: [
        {
            aBoolean: true,
            aDate: new Date().toISOString(),
            aNumber: 4.0,
            aString: 'Four Point Zero'
        },
        {
            aBoolean: false,
            aDate: new Date().toISOString(),
            aNumber: 4.2,
            aString: 'Four Point One'
        }
    ],
    anArrayWithIds: [
        {
            id: uuid.v1(),
            aBoolean: true,
            aDate: new Date().toISOString(),
            aNumber: 5.0,
            aString: 'Five Point Zero'
        },
        {
            id: uuid.v1(),
            aBoolean: false,
            aDate: new Date().toISOString(),
            aNumber: 5.1,
            aString: 'Five Point One',
            anObjectWithinAnObjectInAnArray: {
                id: uuid.v1(),
                aBoolean: true,
                aDate: new Date().toISOString(),
                aNumber: 7.0,
                aString: 'Seven Point Zero'
            }
        }
    ]
};
ava_1.default('testDoc -', (t) => __awaiter(this, void 0, void 0, function* () {
    t.pass();
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERvYy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdERvYy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxXQUFXO0FBQ1gsNkNBQTZDOzs7Ozs7Ozs7O0FBRTdDLDZCQUF1QjtBQUN2Qiw2QkFBNkI7QUFFaEIsUUFBQSxHQUFHLEdBQVE7SUFDdEIsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDZCxJQUFJLEVBQUUsS0FBSyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUU7SUFDdEIsUUFBUSxFQUFFLElBQUk7SUFDZCxLQUFLLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7SUFDL0IsT0FBTyxFQUFFLGlCQUFpQjtJQUMxQixPQUFPLEVBQUUsb0NBQW9DO0lBQzdDLGdCQUFnQixFQUNoQjtRQUNFLFFBQVEsRUFBRSxLQUFLO1FBQ2YsS0FBSyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1FBQy9CLE9BQU8sRUFBRSxHQUFHO1FBQ1osT0FBTyxFQUFFLGdCQUFnQjtLQUMxQjtJQUNELGdCQUFnQixFQUNoQjtRQUNFLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ2IsUUFBUSxFQUFFLElBQUk7UUFDZCxLQUFLLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7UUFDL0IsT0FBTyxFQUFFLEdBQUc7UUFDWixPQUFPLEVBQUUsa0JBQWtCO1FBQzNCLHNCQUFzQixFQUFFO1lBQ3RCLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ2IsUUFBUSxFQUFFLEtBQUs7WUFDZixLQUFLLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDL0IsT0FBTyxFQUFFLEdBQUc7WUFDWixPQUFPLEVBQUUsZ0JBQWdCO1NBQzFCO0tBQ0Y7SUFDRCxnQkFBZ0IsRUFDaEI7UUFDRTtZQUNFLFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQy9CLE9BQU8sRUFBRSxHQUFHO1lBQ1osT0FBTyxFQUFFLGlCQUFpQjtTQUMzQjtRQUNEO1lBQ0UsUUFBUSxFQUFFLEtBQUs7WUFDZixLQUFLLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDL0IsT0FBTyxFQUFFLEdBQUc7WUFDWixPQUFPLEVBQUUsZ0JBQWdCO1NBQzFCO0tBQ0Y7SUFDRCxjQUFjLEVBQ2Q7UUFDRTtZQUNFLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ2IsUUFBUSxFQUFFLElBQUk7WUFDZCxLQUFLLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDL0IsT0FBTyxFQUFFLEdBQUc7WUFDWixPQUFPLEVBQUUsaUJBQWlCO1NBQzNCO1FBQ0Q7WUFDRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUNiLFFBQVEsRUFBRSxLQUFLO1lBQ2YsS0FBSyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQy9CLE9BQU8sRUFBRSxHQUFHO1lBQ1osT0FBTyxFQUFFLGdCQUFnQjtZQUN6QiwrQkFBK0IsRUFBRTtnQkFDL0IsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Z0JBQ2IsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsS0FBSyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUMvQixPQUFPLEVBQUUsR0FBRztnQkFDWixPQUFPLEVBQUUsa0JBQWtCO2FBQzVCO1NBQ0Y7S0FDRjtDQUNGLENBQUM7QUFFRixhQUFJLENBQUMsV0FBVyxFQUFFLENBQU8sQ0FBQyxFQUFFLEVBQUU7SUFDNUIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ1gsQ0FBQyxDQUFBLENBQUMsQ0FBQyJ9