import test from 'ava';

import { inspect } from '../../../src/lib/inspect';

test('inspect shows five levels of an object', (t) => {
  const obj: object = {
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

  const expected: string = `{
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

  const inspected: string = inspect(obj, 5).toString();
  console.log(inspected);
  t.is(inspected.replace(/\n/gi, '').replace(/\t/gi, '').replace(/ /gi, ''), expected.replace(/\n/gi, '').replace(/\t/gi, '').replace(/ /gi, ''));
});
