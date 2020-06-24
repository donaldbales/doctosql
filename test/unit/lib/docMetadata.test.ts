/* tslint:disable:no-console */

import test from 'ava';
import * as util from 'util';

import * as dmd from '../../../src/lib/docMetadata';
import * as Logger from '../../../src/lib/Logger';
import * as testDoc from './testDoc.test';

function inspect(obj: any): string {
  return `${util.inspect(obj, true, 13, false)}`;
}

test('docMetadata - ', async (t) => {
  t.plan(87);

  // console.log(inspect(testDoc));
  const docs: any[] = [];
  docs.push(testDoc.doc);
  // console.log(docs);

  const log: any = Logger.instance.log;

  const logs = await dmd.initializeLogger(log);
  const meta = await dmd.analyzeDocuments('docs', docs)
  .catch ((error) => {
    //
  });
  // console.log(inspect(meta));

  t.truthy(logs, 'log has been injected');
  t.truthy(meta, 'meta has been resolved');

  t.truthy(meta.docs, '');
  t.true(meta.docs.dataType === 'array', '');
  t.true(meta.docs.maxLength === 1, '');
  t.true(meta.docs.name === 'docs', '');
  t.truthy(meta.docs.attributes, '');

  t.truthy(meta.docs.attributes.docs, '');
  t.true(meta.docs.attributes.docs.dataType === 'object', '');
  t.true(meta.docs.attributes.docs.maxLength === 0, '');
  t.true(meta.docs.attributes.docs.name === 'docs', '');
  t.truthy(meta.docs.attributes.docs.attributes._id, '');
  t.true(meta.docs.attributes.docs.attributes._id.dataType === 'string', '');
  t.truthy(meta.docs.attributes.docs.attributes._rev, '');
  t.true(meta.docs.attributes.docs.attributes._rev.dataType === 'string', '');
  t.truthy(meta.docs.attributes.docs.attributes.aBoolean, '');
  t.true(meta.docs.attributes.docs.attributes.aBoolean.dataType === 'boolean', '');
  t.truthy(meta.docs.attributes.docs.attributes.aDate, '');
  t.true(meta.docs.attributes.docs.attributes.aDate.dataType === 'date', '');
  t.truthy(meta.docs.attributes.docs.attributes.aNumber, '');
  t.true(meta.docs.attributes.docs.attributes.aNumber.dataType === 'number', '');
  t.truthy(meta.docs.attributes.docs.attributes.aString, '');
  t.true(meta.docs.attributes.docs.attributes.aString.dataType === 'string', '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithNoId, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithNoIds, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds, '');

  t.true(meta.docs.attributes.docs.attributes.anObjectWithNoId.dataType === 'object', '');
  t.true(meta.docs.attributes.docs.attributes.anObjectWithNoId.maxLength === 0, '');
  t.true(meta.docs.attributes.docs.attributes.anObjectWithNoId.name === 'anObjectWithNoId', '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithNoId.attributes.ai, '');
  t.true(meta.docs.attributes.docs.attributes.anObjectWithNoId.attributes.ai.dataType === 'int', '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithNoId.attributes.aBoolean, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithNoId.attributes.aDate, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithNoId.attributes.aNumber, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithNoId.attributes.aString, '');

  t.true(meta.docs.attributes.docs.attributes.anObjectWithAnId.dataType === 'object', '');
  t.true(meta.docs.attributes.docs.attributes.anObjectWithAnId.maxLength === 0, '');
  t.true(meta.docs.attributes.docs.attributes.anObjectWithAnId.name === 'anObjectWithAnId', '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes.id, '');
  t.true(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes.id.dataType === 'string', '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes.aBoolean, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes.aDate, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes.aNumber, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes.aString, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes.anObjectWithinAnObject, '');

  t.true(meta.docs.attributes.docs.attributes.anArrayWithNoIds.dataType === 'array', '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithNoIds.maxLength === 2, '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithNoIds.name === 'anArrayWithNoIds', '');

  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithNoIds.attributes.anArrayWithNoIds, '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithNoIds.attributes
         .anArrayWithNoIds.dataType === 'object', '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithNoIds.attributes
         .anArrayWithNoIds.maxLength === 0, '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithNoIds.attributes
         .anArrayWithNoIds.name === 'anArrayWithNoIds', '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithNoIds.attributes
           .anArrayWithNoIds.attributes.ai, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithNoIds.attributes
           .anArrayWithNoIds.attributes.aBoolean, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithNoIds.attributes
           .anArrayWithNoIds.attributes.aDate, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithNoIds.attributes
           .anArrayWithNoIds.attributes.aNumber, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithNoIds.attributes
           .anArrayWithNoIds.attributes.aString, '');

  t.true(meta.docs.attributes.docs.attributes.anArrayWithIds.dataType === 'array', '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithIds.maxLength === 2, '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithIds.name === 'anArrayWithIds', '');

  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes.anArrayWithIds, '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
         .anArrayWithIds.dataType === 'object', '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
         .anArrayWithIds.maxLength === 0, '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
         .anArrayWithIds.name === 'anArrayWithIds', '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.id, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.aBoolean, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.aDate, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.aNumber, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.aString, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.anObjectWithinAnObjectInAnArray, '');

  t.true(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes
         .anObjectWithinAnObject.dataType === 'object', '');
  t.true(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes
         .anObjectWithinAnObject.maxLength === 0, '');
  t.true(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes
         .anObjectWithinAnObject.name === 'anObjectWithinAnObject', '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes
         .anObjectWithinAnObject.attributes.id, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes
         .anObjectWithinAnObject.attributes.aBoolean, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes
         .anObjectWithinAnObject.attributes.aDate, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes
         .anObjectWithinAnObject.attributes.aNumber, '');
  t.truthy(meta.docs.attributes.docs.attributes.anObjectWithAnId.attributes
         .anObjectWithinAnObject.attributes.aString, '');

  t.true(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.anObjectWithinAnObjectInAnArray.dataType === 'object', '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.anObjectWithinAnObjectInAnArray.maxLength === 0, '');
  t.true(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.anObjectWithinAnObjectInAnArray.name === 'anObjectWithinAnObjectInAnArray', '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.anObjectWithinAnObjectInAnArray.attributes.id, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.anObjectWithinAnObjectInAnArray.attributes.aBoolean, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.anObjectWithinAnObjectInAnArray.attributes.aDate, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.anObjectWithinAnObjectInAnArray.attributes.aNumber, '');
  t.truthy(meta.docs.attributes.docs.attributes.anArrayWithIds.attributes
           .anArrayWithIds.attributes.anObjectWithinAnObjectInAnArray.attributes.aString, '');
});
