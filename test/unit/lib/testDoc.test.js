"use strict";
// test doc
/* tslint:disable:object-literal-sort-keys */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doc = void 0;
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
ava_1.default('testDoc -', (t) => __awaiter(void 0, void 0, void 0, function* () {
    t.pass();
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERvYy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdERvYy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxXQUFXO0FBQ1gsNkNBQTZDOzs7Ozs7Ozs7Ozs7QUFFN0MsNkJBQXVCO0FBQ3ZCLDZCQUE2QjtBQUVoQixRQUFBLEdBQUcsR0FBUTtJQUN0QixHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNkLElBQUksRUFBRSxLQUFLLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRTtJQUN0QixRQUFRLEVBQUUsSUFBSTtJQUNkLEtBQUssRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtJQUMvQixPQUFPLEVBQUUsaUJBQWlCO0lBQzFCLE9BQU8sRUFBRSxvQ0FBb0M7SUFDN0MsZ0JBQWdCLEVBQ2hCO1FBQ0UsUUFBUSxFQUFFLEtBQUs7UUFDZixLQUFLLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7UUFDL0IsT0FBTyxFQUFFLEdBQUc7UUFDWixPQUFPLEVBQUUsZ0JBQWdCO0tBQzFCO0lBQ0QsZ0JBQWdCLEVBQ2hCO1FBQ0UsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7UUFDYixRQUFRLEVBQUUsSUFBSTtRQUNkLEtBQUssRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtRQUMvQixPQUFPLEVBQUUsR0FBRztRQUNaLE9BQU8sRUFBRSxrQkFBa0I7UUFDM0Isc0JBQXNCLEVBQUU7WUFDdEIsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDYixRQUFRLEVBQUUsS0FBSztZQUNmLEtBQUssRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUMvQixPQUFPLEVBQUUsR0FBRztZQUNaLE9BQU8sRUFBRSxnQkFBZ0I7U0FDMUI7S0FDRjtJQUNELGdCQUFnQixFQUNoQjtRQUNFO1lBQ0UsUUFBUSxFQUFFLElBQUk7WUFDZCxLQUFLLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDL0IsT0FBTyxFQUFFLEdBQUc7WUFDWixPQUFPLEVBQUUsaUJBQWlCO1NBQzNCO1FBQ0Q7WUFDRSxRQUFRLEVBQUUsS0FBSztZQUNmLEtBQUssRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUMvQixPQUFPLEVBQUUsR0FBRztZQUNaLE9BQU8sRUFBRSxnQkFBZ0I7U0FDMUI7S0FDRjtJQUNELGNBQWMsRUFDZDtRQUNFO1lBQ0UsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDYixRQUFRLEVBQUUsSUFBSTtZQUNkLEtBQUssRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUMvQixPQUFPLEVBQUUsR0FBRztZQUNaLE9BQU8sRUFBRSxpQkFBaUI7U0FDM0I7UUFDRDtZQUNFLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ2IsUUFBUSxFQUFFLEtBQUs7WUFDZixLQUFLLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDL0IsT0FBTyxFQUFFLEdBQUc7WUFDWixPQUFPLEVBQUUsZ0JBQWdCO1lBQ3pCLCtCQUErQixFQUFFO2dCQUMvQixFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDYixRQUFRLEVBQUUsSUFBSTtnQkFDZCxLQUFLLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQy9CLE9BQU8sRUFBRSxHQUFHO2dCQUNaLE9BQU8sRUFBRSxrQkFBa0I7YUFDNUI7U0FDRjtLQUNGO0NBQ0YsQ0FBQztBQUVGLGFBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBTyxDQUFDLEVBQUUsRUFBRTtJQUM1QixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDWCxDQUFDLENBQUEsQ0FBQyxDQUFDIn0=