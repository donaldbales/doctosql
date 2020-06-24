// test doc
/* tslint:disable:object-literal-sort-keys */

import test from 'ava';
import * as uuid from 'uuid';

export const doc: any = {
  _id: uuid.v1(),
  _rev: `0.${uuid.v1()}`,
  aBoolean: true,
  aDate: new Date().toISOString(),
  aNumber: 31.61705701614879,
  aString: 'Thirty One Point Six One Seven ...',
  anObjectWithNoId:
  {
    aBoolean: false,
    aDate: new Date().toISOString(),
    aNumber: 2.0,
    aString: 'Two Point Zero'
  },
  anObjectWithAnId:
  {
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
  anArrayWithNoIds:
  [
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
  anArrayWithIds:
  [
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

test('testDoc -', async (t) => {
  t.pass();
});
