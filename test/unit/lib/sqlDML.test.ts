/* tslint:disable:no-console */
/* tslint:disable:object-literal-sort-keys */

import test from 'ava';
import * as _ from 'lodash';
import * as tds from 'tedious';
import * as util from 'util';
import * as uuid from 'uuid';

import * as dmd from '../../../src/lib/docMetadata';
import * as Logger from '../../../src/lib/Logger';
import * as smd from '../../../src/lib/sqlMetadata';
import * as testDoc from './testDoc.test';

const DOCTOSQL_DB_TYPE: string = (process.env.DOCTOSQL_DB_TYPE as string) || 'sqlserver'
const { Database } = require(`../../../src/lib/${DOCTOSQL_DB_TYPE}/Database`);
const ddl: any = require(`../../../src/lib/${DOCTOSQL_DB_TYPE}/sqlDDL`);
const dml: any = require(`../../../src/lib/${DOCTOSQL_DB_TYPE}/sqlDML`);
const moduleName: string = 'test/unit/lib/sqlDML.test';

function inspect(obj: any): string {
  return `${util.inspect(obj, true, 13, false)}`;
}

function execute(conn: any, script: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'execute';
    log.trace({ moduleName, methodName, script }, `start`);
    // console.log(script);
    const results: any[] = [];
    if (script) {
      const sqlRequest = new tds.Request(
        script,
        (sqlerr: any, rowCount: any) => {
          if (sqlerr) {
            log.error({ moduleName, methodName, script, sqlerr });
            return reject({ conn, sqlerr });
          } else {
            log.trace({ moduleName, methodName, script }, `${rowCount} rows`);
          }
        });

      log.trace({ moduleName, methodName, script});

      sqlRequest.on('row', (columns: any) => {
        const result: any = {};
        for (let i = 0; i < columns.length; i++) {
          result[`column${i}`] = columns[i].value;
        }
        results.push(result);
        log.info({ moduleName, methodName, script, results }, `row`);
      });

      sqlRequest.on('requestCompleted', () => {
        log.trace({ moduleName, methodName, script });
        return resolve({ conn, results });
      });

      conn.execSql(sqlRequest);
    } else {
      results.push({ error: 'Script was null' });
      reject({ conn, results });
    }
  });
}

function getTestd2s(conn: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getTestd2s';
    log.trace({ moduleName, methodName }, 'start');
    const sqlStatement: string = `
      select A_BOOLEAN,
             A_DATE,
             convert(float, A_NUMBER, 3),
             A_STRING,
             ID,
             REV
      from   TESTD2S
      order by ID
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, sqlStatement, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName }, `${rowCount} rows`);
        }
      });
    log.trace({ moduleName, methodName, sqlStatement });
    let result: any = {};
    const results: any[] = [];
    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName }, `row`);
      result = {
        aBoolean: columns[0].value,
        aDate: columns[1].value,
        aNumber: columns[2].value,
        aString: columns[3].value,
        id: columns[4].value,
        rev: columns[5].value
      };
      results.push(result);
    });
    sqlRequest.on('requestCompleted', () => {
      log.trace({ moduleName, methodName }, `requestCompleted`);
      return resolve({ conn, results });
    });
    conn.execSql(sqlRequest);
  });
}

function getTestd2sAnArrayWithIds(conn: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getTestd2sAnArrayWithIds';
    log.trace({ moduleName, methodName }, 'start');
    const sqlStatement: string = `
      select A_BOOLEAN,
             A_DATE,
             convert(float, A_NUMBER, 3),
             A_STRING,
             ID,
             TESTD2S_ID
      from   TESTD2S_AN_ARRAY_WITH_IDS
      order by TESTD2S_ID,
             ID
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, sqlStatement, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName }, `${rowCount} rows`);
        }
      });
    log.trace({ moduleName, methodName, sqlStatement });
    let result: any = {};
    const results: any[] = [];
    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName }, `row`);
      result = {
        aBoolean: columns[0].value,
        aDate: columns[1].value,
        aNumber: columns[2].value,
        aString: columns[3].value,
        id: columns[4].value,
        testd2sId: columns[5].value
      };
      results.push(result);
    });
    sqlRequest.on('requestCompleted', () => {
      log.trace({ moduleName, methodName }, `requestCompleted`);
      return resolve({ conn, results });
    });
    conn.execSql(sqlRequest);
  });
}

function getTestd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray(conn: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getTestd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray';
    log.trace({ moduleName, methodName }, 'start');
    const sqlStatement: string = `
      select A_BOOLEAN,
             A_DATE,
             convert(float, A_NUMBER, 3),
             A_STRING,
             ID,
             AN_ARRAY_WITH_IDS_ID,
             TESTD2S_ID
      from   TESTD2S_AN_ARRAY_WITH_IDS_AN_OBJECT_WITHIN_AN_OBJECT_IN_AN_ARRAY
      order by TESTD2S_ID,
             AN_ARRAY_WITH_IDS_ID,
             ID
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, sqlStatement, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName }, `${rowCount} rows`);
        }
      });
    log.trace({ moduleName, methodName, sqlStatement });
    let result: any = {};
    const results: any[] = [];
    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName }, `row`);
      result = {
        aBoolean: columns[0].value,
        aDate: columns[1].value,
        aNumber: columns[2].value,
        aString: columns[3].value,
        id: columns[4].value,
        anArrayWithIdsId: columns[5].value,
        testd2sId: columns[6].value
      };
      results.push(result);
    });
    sqlRequest.on('requestCompleted', () => {
      log.trace({ moduleName, methodName }, `requestCompleted`);
      return resolve({ conn, results });
    });
    conn.execSql(sqlRequest);
  });
}

function getTestd2sAnArrayWithoutIds(conn: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getTestd2sAnArrayWithoutIds';
    log.trace({ moduleName, methodName }, 'start');
    const sqlStatement: string = `
      select A_BOOLEAN,
             A_DATE,
             convert(float, A_NUMBER, 3),
             A_STRING,
             convert(float, AI, 3),
             TESTD2S_ID
      from   TESTD2S_AN_ARRAY_WITH_NO_IDS
      order by TESTD2S_ID,
             convert(float, AI, 3)
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, sqlStatement, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName }, `${rowCount} rows`);
        }
      });
    log.trace({ moduleName, methodName, sqlStatement });
    let result: any = {};
    const results: any[] = [];
    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName }, `row`);
      result = {
        aBoolean: columns[0].value,
        aDate: columns[1].value,
        aNumber: columns[2].value,
        aString: columns[3].value,
        ai: columns[4].value,
        testd2sId: columns[5].value
      };
      results.push(result);
    });
    sqlRequest.on('requestCompleted', () => {
      log.trace({ moduleName, methodName }, `requestCompleted`);
      return resolve({ conn, results });
    });
    conn.execSql(sqlRequest);
  });
}

function getTestd2sAnObjectWithId(conn: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getTestd2sAnObjectWithId';
    log.trace({ moduleName, methodName }, 'start');
    const sqlStatement: string = `
      select A_BOOLEAN,
             A_DATE,
             convert(float, A_NUMBER, 3),
             A_STRING,
             ID,
             TESTD2S_ID
      from   TESTD2S_AN_OBJECT_WITH_AN_ID
      order by TESTD2S_ID,
             ID
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, sqlStatement, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName }, `${rowCount} rows`);
        }
      });
    log.trace({ moduleName, methodName, sqlStatement });
    let result: any = {};
    const results: any[] = [];
    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName }, `row`);
      result = {
        aBoolean: columns[0].value,
        aDate: columns[1].value,
        aNumber: columns[2].value,
        aString: columns[3].value,
        id: columns[4].value,
        testd2sId: columns[5].value
      };
      results.push(result);
    });
    sqlRequest.on('requestCompleted', () => {
      log.trace({ moduleName, methodName }, `requestCompleted`);
      return resolve({ conn, results });
    });
    conn.execSql(sqlRequest);
  });
}

function getTestd2sAnObjectWithIdAnObjectWithinAnObject(conn: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getTestd2sAnObjectWithIdAnObjectWithinAnObject';
    log.trace({ moduleName, methodName }, 'start');
    const sqlStatement: string = `
      select A_BOOLEAN,
             A_DATE,
             convert(float, A_NUMBER, 3),
             A_STRING,
             ID,
             AN_OBJECT_WITH_AN_ID_ID,
             TESTD2S_ID
      from   TESTD2S_AN_OBJECT_WITH_AN_ID_AN_OBJECT_WITHIN_AN_OBJECT
      order by TESTD2S_ID,
             AN_OBJECT_WITH_AN_ID_ID,
             ID
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, sqlStatement, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName }, `${rowCount} rows`);
        }
      });
    log.trace({ moduleName, methodName, sqlStatement });
    let result: any = {};
    const results: any[] = [];
    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName }, `row`);
      result = {
        aBoolean: columns[0].value,
        aDate: columns[1].value,
        aNumber: columns[2].value,
        aString: columns[3].value,
        id: columns[4].value,
        anObjectWithAnIdId: columns[5].value,
        testd2sId: columns[6].value
      };
      results.push(result);
    });
    sqlRequest.on('requestCompleted', () => {
      log.trace({ moduleName, methodName }, `requestCompleted`);
      return resolve({ conn, results });
    });
    conn.execSql(sqlRequest);
  });
}

//              convert(float, A_NUMBER, 3) as A_NUMBER,
function getTestd2sAnObjectWithoutId(conn: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getTestd2sAnObjectWithoutId';
    log.trace({ moduleName, methodName }, 'start');
    const sqlStatement: string = `
      select A_BOOLEAN,
             A_DATE,
             convert(float, A_NUMBER, 3),
             A_STRING,
             convert(float, AI, 3),
             TESTD2S_ID
      from   TESTD2S_AN_OBJECT_WITH_NO_ID
      order by TESTD2S_ID,
             convert(float, AI, 3)
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, sqlStatement, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName }, `${rowCount} rows`);
        }
      });
    log.trace({ moduleName, methodName, sqlStatement });
    let result: any = {};
    const results: any[] = [];
    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName }, `row`);
      result = {
        aBoolean: columns[0].value,
        aDate: columns[1].value,
        aNumber: columns[2].value,
        aString: columns[3].value,
        ai: columns[4].value,
        testd2sId: columns[5].value
      };
      results.push(result);
    });
    sqlRequest.on('requestCompleted', () => {
      log.trace({ moduleName, methodName }, `requestCompleted`);
      return resolve({ conn, results });
    });
    conn.execSql(sqlRequest);
  });
}

function getTestd2s2(conn: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getTestd2s2';
    log.trace({ moduleName, methodName }, 'start');
    const sqlStatement: string = `
      select A_BOOLEAN,
             A_DATE,
             convert(float, A_NUMBER, 3),
             A_STRING,
             ID,
             REV,
             A_NEW_DATE
      from   TESTD2S
      order by ID
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, sqlStatement, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName }, `${rowCount} rows`);
        }
      });
    log.trace({ moduleName, methodName, sqlStatement });
    let result: any = {};
    const results: any[] = [];
    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName }, `row`);
      result = {
        aBoolean: columns[0].value,
        aDate: columns[1].value,
        aNumber: columns[2].value,
        aString: columns[3].value,
        id: columns[4].value,
        rev: columns[5].value,
        aNewDate: columns[6].value
      };
      results.push(result);
    });
    sqlRequest.on('requestCompleted', () => {
      log.trace({ moduleName, methodName }, `requestCompleted`);
      return resolve({ conn, results });
    });
    conn.execSql(sqlRequest);
  });
}

function getTestd2sAnObjectWithoutIdANewObject(conn: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getTestd2sAnObjectWithoutIdANewObject';
    log.trace({ moduleName, methodName }, 'start');
    const sqlStatement: string = `
      select A_BOOLEAN,
             A_DATE,
             convert(float, A_NUMBER, 3),
             A_STRING,
             ID,
             convert(float, AN_OBJECT_WITH_NO_ID_AI, 3),
             TESTD2S_ID
      from   TESTD2S_AN_OBJECT_WITH_NO_ID_A_NEW_OBJECT
      order by TESTD2S_ID,
             convert(float, AN_OBJECT_WITH_NO_ID_AI, 3),
             ID
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, sqlStatement, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName }, `${rowCount} rows`);
        }
      });
    log.trace({ moduleName, methodName, sqlStatement });
    let result: any = {};
    const results: any[] = [];
    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName }, `row`);
      result = {
        aBoolean: columns[0].value,
        aDate: columns[1].value,
        aNumber: columns[2].value,
        aString: columns[3].value,
        id: columns[4].value,
        anObjectWithNoIdAi: columns[5].value,
        testd2sId: columns[6].value
      };
      results.push(result);
    });
    sqlRequest.on('requestCompleted', () => {
      log.trace({ moduleName, methodName }, `requestCompleted`);
      return resolve({ conn, results });
    });
    conn.execSql(sqlRequest);
  });
}

let log: any;
let pool: any;
test.before('Set up database connections', () => {
  log = Logger.instance.log;
  // log.log_level = 'TRACE';

  let rdbms: any;
  try {
    // grab the environment variable with the database connection string
    rdbms = JSON.parse((process.env.DOCTOSQL_RDBMS as string));
  } catch (e) {
    log.fatal('DOCTOSQL_RDBMS is not a valid JSON string');
  }

  if (!_.isPlainObject(rdbms)) {
    log.fatal('Invalid database connection string.  Check value of TESTD2S_RDBMS');
    // App cannot start without a database, so die
    process.exit(1);
  }

  const database: string = rdbms.database;
  const password: string = rdbms.password;
  const server: string = rdbms.server;
  const userName: string = rdbms.userName;
  const connectTimeout: number = (rdbms.connectTimeout !== undefined) ?
    Number.parseInt(rdbms.connectTimeout, 10) : 500000; // five minutes
  const requestTimeout: number = (rdbms.requestTimeout !== undefined) ?
    Number.parseInt(rdbms.requestTimeout, 10) : 86399997; // almost 24 hours
  const port: number = (rdbms.port !== undefined) ?
    Number.parseInt(rdbms.port, 10) : 1433;

  const connectionConfig: tds.ConnectionConfig = {
    authentication: {
      options: {
        password,
        userName
      },
      type: 'default',
    },
    options: {
      connectTimeout,
      database,
      // If you're on Windows Azure, you will need this:
      encrypt: true,
      port,
      requestTimeout
    },
    server
  };

  // Global instances
  pool = new Database(connectionConfig);
});

test('sqlDML - ', async (t) => {
  t.plan(137);

  const name: string = 'testd2s';
  // log.level('error');
  // console.log(`*** log.level = ${log.level()}`);
  let conn: any = await pool.connection;
  let results: any = await execute(conn, `
      drop table if exists ${name.toUpperCase()};
      drop table if exists ${name.toUpperCase()}_AN_ARRAY_WITH_IDS;
      drop table if exists ${name.toUpperCase()}_AN_ARRAY_WITH_IDS_AN_OBJECT_WITHIN_AN_OBJECT_IN_AN_ARRAY;
      drop table if exists ${name.toUpperCase()}_AN_ARRAY_WITH_NO_IDS;
      drop table if exists ${name.toUpperCase()}_AN_OBJECT_WITH_AN_ID;
      drop table if exists ${name.toUpperCase()}_AN_OBJECT_WITH_AN_ID_AN_OBJECT_WITHIN_AN_OBJECT;
      drop table if exists ${name.toUpperCase()}_AN_OBJECT_WITH_NO_ID;
      drop table if exists ${name.toUpperCase()}_AN_OBJECT_WITH_NO_ID_A_NEW_OBJECT;
    `);
  log.debug(results.results);
  await conn.release();

  const docs: any[] = [];
  docs.push(testDoc.doc);
  const log1: any = await dmd.initializeLogger(log);
  const json: any = await dmd.analyzeDocuments(name.toLowerCase(), docs);
  const log2: any = await smd.initializeLogger(log);
  const meta: any = await smd.analyzeDocumentMetadata(json);
  const log3: any = await ddl.initializeLogger(log);
  const ddl0: any = await ddl.createTables(meta);
  const log4: any = await dml.initializeLogger(log);
  const dml0: any = await dml.mergeDocs(meta, docs);

  // console.log(inspect(dml0));

  t.true(dml0 !== false, '');

  conn = await pool.connection;
  results = await getTestd2s(conn);
  await conn.release();
  let testd2s = results.results;
  // console.log(`*** testd2s\n${inspect(testd2s)}`);
  t.true(testd2s.length === 1, '');
  console.log(inspect(docs));
  t.true(docs[0].aBoolean === Boolean(testd2s[0].aBoolean), '');
  t.true(docs[0].aDate === testd2s[0].aDate.toISOString(), '');
  t.true(docs[0].aNumber === testd2s[0].aNumber, '');
  t.true(docs[0].aString === testd2s[0].aString, '');
  t.true(docs[0]._id === testd2s[0].id, '');
  t.true(docs[0]._rev === testd2s[0].rev, '');

  conn = await pool.connection;
  results = await getTestd2sAnObjectWithoutId(conn);
  await conn.release();
  let testd2sAnObjectWithoutId = results.results;
  // console.log(`*** testd2sAnObjectWithoutId\n${inspect(testd2sAnObjectWithoutId)}`);
  t.true(testd2sAnObjectWithoutId.length === 1, '');
  // console.log(inspect(docs));
  t.true(docs[0].anObjectWithNoId.aBoolean === Boolean(testd2sAnObjectWithoutId[0].aBoolean), '');
  t.true(docs[0].anObjectWithNoId.aDate === testd2sAnObjectWithoutId[0].aDate.toISOString(), '');
  t.true(docs[0].anObjectWithNoId.aNumber === testd2sAnObjectWithoutId[0].aNumber, '');
  t.true(docs[0].anObjectWithNoId.aString === testd2sAnObjectWithoutId[0].aString, '');
  t.true(0 === testd2sAnObjectWithoutId[0].ai, '');
  t.true(docs[0]._id === testd2sAnObjectWithoutId[0].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnObjectWithId(conn);
  await conn.release();
  let testd2sAnObjectWithId = results.results;
  // console.log(`*** testd2sAnObjectWithId\n${inspect(testd2sAnObjectWithId)}`);
  t.true(testd2sAnObjectWithId.length === 1, '');
  // console.log(inspect(docs));
  t.true(docs[0].anObjectWithAnId.aBoolean === Boolean(testd2sAnObjectWithId[0].aBoolean), '');
  t.true(docs[0].anObjectWithAnId.aDate === testd2sAnObjectWithId[0].aDate.toISOString(), '');
  t.true(docs[0].anObjectWithAnId.aNumber === testd2sAnObjectWithId[0].aNumber, '');
  t.true(docs[0].anObjectWithAnId.aString === testd2sAnObjectWithId[0].aString, '');
  t.true(docs[0].anObjectWithAnId.id === testd2sAnObjectWithId[0].id, '');
  t.true(docs[0]._id === testd2sAnObjectWithId[0].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnObjectWithIdAnObjectWithinAnObject(conn);
  await conn.release();
  let testd2sAnObjectWithIdAnObjectWithinAnObject = results.results;
  // console.log(`*** testd2sAnObjectWithIdAnObjectWithinAnObject\n` +
  //            `${inspect(testd2sAnObjectWithIdAnObjectWithinAnObject)}`);
  t.true(testd2sAnObjectWithIdAnObjectWithinAnObject.length
         === 1, '');
  // console.log(inspect(docs));
  t.true(docs[0].anObjectWithAnId.anObjectWithinAnObject.aBoolean
         === Boolean(testd2sAnObjectWithIdAnObjectWithinAnObject[0].aBoolean), '');
  t.true(docs[0].anObjectWithAnId.anObjectWithinAnObject.aDate
         === testd2sAnObjectWithIdAnObjectWithinAnObject[0].aDate.toISOString(), '');
  t.true(docs[0].anObjectWithAnId.anObjectWithinAnObject.aNumber
         === testd2sAnObjectWithIdAnObjectWithinAnObject[0].aNumber, '');
  t.true(docs[0].anObjectWithAnId.anObjectWithinAnObject.aString
         === testd2sAnObjectWithIdAnObjectWithinAnObject[0].aString, '');
  t.true(docs[0].anObjectWithAnId.anObjectWithinAnObject.id
         === testd2sAnObjectWithIdAnObjectWithinAnObject[0].id, '');
  t.true(docs[0].anObjectWithAnId.id
         === testd2sAnObjectWithIdAnObjectWithinAnObject[0].anObjectWithAnIdId, '');
  t.true(docs[0]._id
         === testd2sAnObjectWithIdAnObjectWithinAnObject[0].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnArrayWithoutIds(conn);
  await conn.release();
  let testd2sAnArrayWithoutIds = results.results;
  // console.log(`*** testd2sAnArrayWithoutIds\n${inspect(testd2sAnArrayWithoutIds)}`);
  t.true(testd2sAnArrayWithoutIds.length === 2, '');
  // console.log(inspect(docs));
  t.true(docs[0].anArrayWithNoIds[0].aBoolean === Boolean(testd2sAnArrayWithoutIds[0].aBoolean), '');
  t.true(docs[0].anArrayWithNoIds[0].aDate === testd2sAnArrayWithoutIds[0].aDate.toISOString(), '');
  t.true(docs[0].anArrayWithNoIds[0].aNumber === testd2sAnArrayWithoutIds[0].aNumber, '');
  t.true(docs[0].anArrayWithNoIds[0].aString === testd2sAnArrayWithoutIds[0].aString, '');
  t.true(0 === testd2sAnArrayWithoutIds[0].ai, '');
  t.true(docs[0]._id === testd2sAnArrayWithoutIds[0].testd2sId, '');

  t.true(docs[0].anArrayWithNoIds[1].aBoolean === Boolean(testd2sAnArrayWithoutIds[1].aBoolean), '');
  t.true(docs[0].anArrayWithNoIds[1].aDate === testd2sAnArrayWithoutIds[1].aDate.toISOString(), '');
  t.true(docs[0].anArrayWithNoIds[1].aNumber === testd2sAnArrayWithoutIds[1].aNumber, '');
  t.true(docs[0].anArrayWithNoIds[1].aString === testd2sAnArrayWithoutIds[1].aString, '');
  t.true(1 === testd2sAnArrayWithoutIds[1].ai, '');
  t.true(docs[0]._id === testd2sAnArrayWithoutIds[1].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnArrayWithIds(conn);
  await conn.release();
  let testd2sAnArrayWithIds = results.results;
  // console.log(`*** testd2sAnArrayWithIds\n${inspect(testd2sAnArrayWithIds)}`);
  t.true(testd2sAnArrayWithIds.length === 2, '');
  // console.log(inspect(docs));
  t.true(docs[0].anArrayWithIds[0].aBoolean === Boolean(testd2sAnArrayWithIds[0].aBoolean), '');
  t.true(docs[0].anArrayWithIds[0].aDate === testd2sAnArrayWithIds[0].aDate.toISOString(), '');
  t.true(docs[0].anArrayWithIds[0].aNumber === testd2sAnArrayWithIds[0].aNumber, '');
  t.true(docs[0].anArrayWithIds[0].aString === testd2sAnArrayWithIds[0].aString, '');
  t.true(docs[0].anArrayWithIds[0].id === testd2sAnArrayWithIds[0].id, '');
  t.true(docs[0]._id === testd2sAnArrayWithIds[0].testd2sId, '');

  t.true(docs[0].anArrayWithIds[1].aBoolean === Boolean(testd2sAnArrayWithIds[1].aBoolean), '');
  t.true(docs[0].anArrayWithIds[1].aDate === testd2sAnArrayWithIds[1].aDate.toISOString(), '');
  t.true(docs[0].anArrayWithIds[1].aNumber === testd2sAnArrayWithIds[1].aNumber, '');
  t.true(docs[0].anArrayWithIds[1].aString === testd2sAnArrayWithIds[1].aString, '');
  t.true(docs[0].anArrayWithIds[1].id === testd2sAnArrayWithIds[1].id, '');
  t.true(docs[0]._id === testd2sAnArrayWithIds[1].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray(conn);
  await conn.release();
  let testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray = results.results;
  // console.log(`*** testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray\n` +
  //            `${inspect(testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray)}`);
  t.true(testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray.length
         === 1, '');
  // console.log(inspect(docs));
  t.true(docs[0].anArrayWithIds[1].anObjectWithinAnObjectInAnArray.aBoolean
         === Boolean(testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[0].aBoolean), '');
  t.true(docs[0].anArrayWithIds[1].anObjectWithinAnObjectInAnArray.aDate
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[0].aDate.toISOString(), '');
  t.true(docs[0].anArrayWithIds[1].anObjectWithinAnObjectInAnArray.aNumber
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[0].aNumber, '');
  t.true(docs[0].anArrayWithIds[1].anObjectWithinAnObjectInAnArray.aString
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[0].aString, '');
  t.true(docs[0].anArrayWithIds[1].anObjectWithinAnObjectInAnArray.id
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[0].id, '');
  t.true(docs[0].anArrayWithIds[1].id
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[0].anArrayWithIdsId, '');
  t.true(docs[0]._id
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[0].testd2sId, '');

  const doc2 = _.cloneDeep(testDoc.doc);
  doc2._id = uuid.v1();
  doc2.aString = 'One Point Zero, One Point Zero, One Point Zero, One Point Zero, One Point Zero, One Point Zero,';
  doc2.aNewDate = new Date().toISOString();

  doc2.anObjectWithNoId.aNewObject = {};
  doc2.anObjectWithNoId.aNewObject.id = uuid.v1();
  doc2.anObjectWithNoId.aNewObject.aBoolean = false;
  doc2.anObjectWithNoId.aNewObject.aDate = new Date().toISOString();
  doc2.anObjectWithNoId.aNewObject.aNumber = 8.0;
  doc2.anObjectWithNoId.aNewObject.aString = 'Eight Point Zero';

  docs.push(doc2);

  const json2 = await dmd.analyzeDocuments(name.toLowerCase(), docs);
  const meta2 = await smd.analyzeDocumentMetadata(json2);

  // log.level('trace');
  // console.log(`*** log.level = ${log.level()}`);

  const ddl1 = await ddl.createTables(meta2);

  // log.level('trace');
  // console.log(`*** log.level = ${log.level()}`);

  const ddl2 = await ddl.alterTables(meta2);

  // log.level('error');
  // console.log(`*** log.level = ${log.level()}`);

  const dml2: any = await dml.mergeDocs(meta2, docs);
  // console.log(inspect(dml2));

  t.true(ddl2 !== false, '');

  conn = await pool.connection;
  results = await getTestd2s2(conn);
  await conn.release();
  testd2s = results.results;
  // console.log(`*** testd2s\n${inspect(testd2s)}`);
  t.true(testd2s.length === 2, '');
  // console.log(inspect(docs));
  t.true(docs[1].aBoolean === Boolean(testd2s[1].aBoolean), '');
  t.true(docs[1].aDate === testd2s[1].aDate.toISOString(), '');
  t.true(docs[1].aNumber === testd2s[1].aNumber, '');
  t.true(docs[1].aString === testd2s[1].aString, '');
  t.true(docs[1]._id === testd2s[1].id, '');
  t.true(docs[1]._rev === testd2s[1].rev, '');
  t.true(docs[1].aNewDate === testd2s[1].aNewDate.toISOString(), '');

  conn = await pool.connection;
  results = await getTestd2sAnObjectWithoutId(conn);
  await conn.release();
  testd2sAnObjectWithoutId = results.results;
  // console.log(`*** testd2sAnObjectWithoutId\n${inspect(testd2sAnObjectWithoutId)}`);
  t.true(testd2sAnObjectWithoutId.length === 2, '');
  // console.log(inspect(docs));
  t.true(docs[1].anObjectWithNoId.aBoolean === Boolean(testd2sAnObjectWithoutId[1].aBoolean), '');
  t.true(docs[1].anObjectWithNoId.aDate === testd2sAnObjectWithoutId[1].aDate.toISOString(), '');
  t.true(docs[1].anObjectWithNoId.aNumber === testd2sAnObjectWithoutId[1].aNumber, '');
  t.true(docs[1].anObjectWithNoId.aString === testd2sAnObjectWithoutId[1].aString, '');
  t.true(0 === testd2sAnObjectWithoutId[1].ai, '');
  t.true(docs[1]._id === testd2sAnObjectWithoutId[1].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnObjectWithoutIdANewObject(conn);
  await conn.release();
  const testd2sAnObjectWithoutIdANewObject = results.results;
  // console.log(`*** testd2sAnObjectWithoutIdANewObject\n` +
  //            `${inspect(testd2sAnObjectWithoutIdANewObject)}`);
  t.true(testd2sAnObjectWithoutIdANewObject.length
         === 1, '');
  // console.log(inspect(docs));
  t.true(docs[1].anObjectWithNoId.aNewObject.aBoolean
         === Boolean(testd2sAnObjectWithoutIdANewObject[0].aBoolean), '');
  t.true(docs[1].anObjectWithNoId.aNewObject.aDate
         === testd2sAnObjectWithoutIdANewObject[0].aDate.toISOString(), '');
  t.true(docs[1].anObjectWithNoId.aNewObject.aNumber
         === testd2sAnObjectWithoutIdANewObject[0].aNumber, '');
  t.true(docs[1].anObjectWithNoId.aNewObject.aString
         === testd2sAnObjectWithoutIdANewObject[0].aString, '');
  t.true(docs[1].anObjectWithNoId.aNewObject.id
         === testd2sAnObjectWithoutIdANewObject[0].id, '');
  t.true(docs[1].anObjectWithNoId.ai
         === testd2sAnObjectWithoutIdANewObject[0].anObjectWithNoIdAi, '');
  t.true(docs[1]._id
         === testd2sAnObjectWithoutIdANewObject[0].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnObjectWithId(conn);
  await conn.release();
  testd2sAnObjectWithId = results.results;
  // console.log(`*** testd2sAnObjectWithId\n${inspect(testd2sAnObjectWithId)}`);
  t.true(testd2sAnObjectWithId.length === 2, '');
  // console.log(inspect(docs));
  t.true(docs[1].anObjectWithAnId.aBoolean === Boolean(testd2sAnObjectWithId[1].aBoolean), '');
  t.true(docs[1].anObjectWithAnId.aDate === testd2sAnObjectWithId[1].aDate.toISOString(), '');
  t.true(docs[1].anObjectWithAnId.aNumber === testd2sAnObjectWithId[1].aNumber, '');
  t.true(docs[1].anObjectWithAnId.aString === testd2sAnObjectWithId[1].aString, '');
  t.true(docs[1].anObjectWithAnId.id === testd2sAnObjectWithId[1].id, '');
  t.true(docs[1]._id === testd2sAnObjectWithId[1].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnObjectWithIdAnObjectWithinAnObject(conn);
  await conn.release();
  testd2sAnObjectWithIdAnObjectWithinAnObject = results.results;
  // console.log(`*** testd2sAnObjectWithIdAnObjectWithinAnObject\n` +
  //            `${inspect(testd2sAnObjectWithIdAnObjectWithinAnObject)}`);
  t.true(testd2sAnObjectWithIdAnObjectWithinAnObject.length
         === 2, '');
  // console.log(inspect(docs));
  t.true(docs[1].anObjectWithAnId.anObjectWithinAnObject.aBoolean
         === Boolean(testd2sAnObjectWithIdAnObjectWithinAnObject[1].aBoolean), '');
  t.true(docs[1].anObjectWithAnId.anObjectWithinAnObject.aDate
         === testd2sAnObjectWithIdAnObjectWithinAnObject[1].aDate.toISOString(), '');
  t.true(docs[1].anObjectWithAnId.anObjectWithinAnObject.aNumber
         === testd2sAnObjectWithIdAnObjectWithinAnObject[1].aNumber, '');
  t.true(docs[1].anObjectWithAnId.anObjectWithinAnObject.aString
         === testd2sAnObjectWithIdAnObjectWithinAnObject[1].aString, '');
  t.true(docs[1].anObjectWithAnId.anObjectWithinAnObject.id
         === testd2sAnObjectWithIdAnObjectWithinAnObject[1].id, '');
  t.true(docs[1].anObjectWithAnId.id
         === testd2sAnObjectWithIdAnObjectWithinAnObject[1].anObjectWithAnIdId, '');
  t.true(docs[1]._id
         === testd2sAnObjectWithIdAnObjectWithinAnObject[1].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnArrayWithoutIds(conn);
  await conn.release();
  testd2sAnArrayWithoutIds = results.results;
  // console.log(`*** testd2sAnArrayWithoutIds\n${inspect(testd2sAnArrayWithoutIds)}`);
  t.true(testd2sAnArrayWithoutIds.length === 4, '');
  // console.log(inspect(docs));
  t.true(docs[1].anArrayWithNoIds[0].aBoolean === Boolean(testd2sAnArrayWithoutIds[2].aBoolean), '');
  t.true(docs[1].anArrayWithNoIds[0].aDate === testd2sAnArrayWithoutIds[2].aDate.toISOString(), '');
  t.true(docs[1].anArrayWithNoIds[0].aNumber === testd2sAnArrayWithoutIds[2].aNumber, '');
  t.true(docs[1].anArrayWithNoIds[0].aString === testd2sAnArrayWithoutIds[2].aString, '');
  t.true(0 === testd2sAnArrayWithoutIds[2].ai, '');
  t.true(docs[1]._id === testd2sAnArrayWithoutIds[2].testd2sId, '');

  t.true(docs[1].anArrayWithNoIds[1].aBoolean === Boolean(testd2sAnArrayWithoutIds[3].aBoolean), '');
  t.true(docs[1].anArrayWithNoIds[1].aDate === testd2sAnArrayWithoutIds[3].aDate.toISOString(), '');
  t.true(docs[1].anArrayWithNoIds[1].aNumber === testd2sAnArrayWithoutIds[3].aNumber, '');
  t.true(docs[1].anArrayWithNoIds[1].aString === testd2sAnArrayWithoutIds[3].aString, '');
  t.true(1 === testd2sAnArrayWithoutIds[3].ai, '');
  t.true(docs[1]._id === testd2sAnArrayWithoutIds[3].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnArrayWithIds(conn);
  await conn.release();
  testd2sAnArrayWithIds = results.results;
  // console.log(`*** testd2sAnArrayWithIds\n${inspect(testd2sAnArrayWithIds)}`);
  t.true(testd2sAnArrayWithIds.length === 4, '');
  // console.log(inspect(docs));
  t.true(docs[1].anArrayWithIds[0].aBoolean === Boolean(testd2sAnArrayWithIds[2].aBoolean), '');
  t.true(docs[1].anArrayWithIds[0].aDate === testd2sAnArrayWithIds[2].aDate.toISOString(), '');
  t.true(docs[1].anArrayWithIds[0].aNumber === testd2sAnArrayWithIds[2].aNumber, '');
  t.true(docs[1].anArrayWithIds[0].aString === testd2sAnArrayWithIds[2].aString, '');
  t.true(docs[1].anArrayWithIds[0].id === testd2sAnArrayWithIds[2].id, '');
  t.true(docs[1]._id === testd2sAnArrayWithIds[2].testd2sId, '');

  t.true(docs[1].anArrayWithIds[1].aBoolean === Boolean(testd2sAnArrayWithIds[3].aBoolean), '');
  t.true(docs[1].anArrayWithIds[1].aDate === testd2sAnArrayWithIds[3].aDate.toISOString(), '');
  t.true(docs[1].anArrayWithIds[1].aNumber === testd2sAnArrayWithIds[3].aNumber, '');
  t.true(docs[1].anArrayWithIds[1].aString === testd2sAnArrayWithIds[3].aString, '');
  t.true(docs[1].anArrayWithIds[1].id === testd2sAnArrayWithIds[3].id, '');
  t.true(docs[1]._id === testd2sAnArrayWithIds[3].testd2sId, '');

  conn = await pool.connection;
  results = await getTestd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray(conn);
  await conn.release();
  testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray = results.results;
  // console.log(`*** testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray\n` +
  //            `${inspect(testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray)}`);
  t.true(testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray.length
         === 2, '');
  // console.log(inspect(docs));
  t.true(docs[1].anArrayWithIds[1].anObjectWithinAnObjectInAnArray.aBoolean
         === Boolean(testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[1].aBoolean), '');
  t.true(docs[1].anArrayWithIds[1].anObjectWithinAnObjectInAnArray.aDate
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[1].aDate.toISOString(), '');
  t.true(docs[1].anArrayWithIds[1].anObjectWithinAnObjectInAnArray.aNumber
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[1].aNumber, '');
  t.true(docs[1].anArrayWithIds[1].anObjectWithinAnObjectInAnArray.aString
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[1].aString, '');
  t.true(docs[1].anArrayWithIds[1].anObjectWithinAnObjectInAnArray.id
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[1].id, '');
  t.true(docs[1].anArrayWithIds[1].id
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[1].anArrayWithIdsId, '');
  t.true(docs[1]._id
         === testd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray[1].testd2sId, '');

});
