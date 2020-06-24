"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const inspect_1 = require("../../../src/lib/inspect");
ava_1.default('inspect shows five levels of an object', (t) => {
    const obj = {
        level1data: 'level1 data',
        level1obj: {
            level2data: 'level2 data',
            level2obj: {
                level3data: 'level3 data',
                level3obj: {
                    level4data: 'level4 data',
                    level4obj: {
                        level5data: 'level5 data'
                    }
                }
            }
        }
    };
    const expected = `{
    level1data: 'level1 data',
    level1obj: {
      level2data: 'level2 data',
      level2obj: {
        level3data: 'level3 data',
        level3obj: {
          level4data: 'level4 data',
          level4obj: {
            level5data: 'level5 data'
          }
        }
      }
    }
  }`;
    const inspected = inspect_1.inspect(obj, 5).toString();
    console.log(inspected);
    t.is(inspected.replace(/\n/gi, '').replace(/\t/gi, '').replace(/ /gi, ''), expected.replace(/\n/gi, '').replace(/\t/gi, '').replace(/ /gi, ''));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaW5zcGVjdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsNkJBQXVCO0FBRXZCLHNEQUFtRDtBQUVuRCxhQUFJLENBQUMsd0NBQXdDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtJQUNuRCxNQUFNLEdBQUcsR0FBVztRQUNsQixVQUFVLEVBQUUsYUFBYTtRQUN6QixTQUFTLEVBQUU7WUFDVCxVQUFVLEVBQUUsYUFBYTtZQUN6QixTQUFTLEVBQUU7Z0JBQ1QsVUFBVSxFQUFFLGFBQWE7Z0JBQ3pCLFNBQVMsRUFBRTtvQkFDVCxVQUFVLEVBQUUsYUFBYTtvQkFDekIsU0FBUyxFQUFFO3dCQUNULFVBQVUsRUFBRSxhQUFhO3FCQUMxQjtpQkFDRjthQUNGO1NBQ0Y7S0FDRixDQUFDO0lBRUYsTUFBTSxRQUFRLEdBQVc7Ozs7Ozs7Ozs7Ozs7O0lBY3ZCLENBQUM7SUFFSCxNQUFNLFNBQVMsR0FBVyxpQkFBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNyRCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2xKLENBQUMsQ0FBQyxDQUFDIn0=