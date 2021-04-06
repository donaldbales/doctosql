"use strict";
/* tslint:disable:no-console */
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
const ava_1 = require("ava");
const _ = require("lodash");
const tds = require("tedious");
const util = require("util");
const uuid = require("uuid");
const dmd = require("../../../src/lib/docMetadata");
const Logger = require("../../../src/lib/Logger");
const smd = require("../../../src/lib/sqlMetadata");
const testDoc = require("./testDoc.test");
const DOCTOSQL_DB_TYPE = process.env.DOCTOSQL_DB_TYPE || 'sqlserver';
const Database = require(`../../../src/lib/${DOCTOSQL_DB_TYPE}/Database`);
const ddl = require(`../../../src/lib/${DOCTOSQL_DB_TYPE}/sqlDDL`);
const dml = require(`../../../src/lib/${DOCTOSQL_DB_TYPE}/sqlDML`);
const moduleName = 'test/unit/lib/sqlDML.test';
function inspect(obj) {
    return `${util.inspect(obj, true, 13, false)}`;
}
function execute(conn, script) {
    return new Promise((resolve, reject) => {
        const methodName = 'execute';
        log.trace({ moduleName, methodName, script }, `start`);
        // console.log(script);
        const results = [];
        if (script) {
            const sqlRequest = new tds.Request(script, (sqlerr, rowCount) => {
                if (sqlerr) {
                    log.error({ moduleName, methodName, script, sqlerr });
                    return reject({ conn, sqlerr });
                }
                else {
                    log.trace({ moduleName, methodName, script }, `${rowCount} rows`);
                }
            });
            log.trace({ moduleName, methodName, script });
            sqlRequest.on('row', (columns) => {
                const result = {};
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
        }
        else {
            results.push({ error: 'Script was null' });
            reject({ conn, results });
        }
    });
}
function getTestd2s(conn) {
    return new Promise((resolve, reject) => {
        const methodName = 'getTestd2s';
        log.trace({ moduleName, methodName }, 'start');
        const sqlStatement = `
      select A_BOOLEAN,
             A_DATE,
             convert(float, A_NUMBER, 3),
             A_STRING,
             ID,
             REV
      from   TESTD2S
      order by ID
      `;
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, sqlStatement, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, sqlStatement });
        let result = {};
        const results = [];
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
function getTestd2sAnArrayWithIds(conn) {
    return new Promise((resolve, reject) => {
        const methodName = 'getTestd2sAnArrayWithIds';
        log.trace({ moduleName, methodName }, 'start');
        const sqlStatement = `
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
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, sqlStatement, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, sqlStatement });
        let result = {};
        const results = [];
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
function getTestd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray(conn) {
    return new Promise((resolve, reject) => {
        const methodName = 'getTestd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray';
        log.trace({ moduleName, methodName }, 'start');
        const sqlStatement = `
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
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, sqlStatement, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, sqlStatement });
        let result = {};
        const results = [];
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
function getTestd2sAnArrayWithoutIds(conn) {
    return new Promise((resolve, reject) => {
        const methodName = 'getTestd2sAnArrayWithoutIds';
        log.trace({ moduleName, methodName }, 'start');
        const sqlStatement = `
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
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, sqlStatement, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, sqlStatement });
        let result = {};
        const results = [];
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
function getTestd2sAnObjectWithId(conn) {
    return new Promise((resolve, reject) => {
        const methodName = 'getTestd2sAnObjectWithId';
        log.trace({ moduleName, methodName }, 'start');
        const sqlStatement = `
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
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, sqlStatement, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, sqlStatement });
        let result = {};
        const results = [];
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
function getTestd2sAnObjectWithIdAnObjectWithinAnObject(conn) {
    return new Promise((resolve, reject) => {
        const methodName = 'getTestd2sAnObjectWithIdAnObjectWithinAnObject';
        log.trace({ moduleName, methodName }, 'start');
        const sqlStatement = `
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
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, sqlStatement, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, sqlStatement });
        let result = {};
        const results = [];
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
function getTestd2sAnObjectWithoutId(conn) {
    return new Promise((resolve, reject) => {
        const methodName = 'getTestd2sAnObjectWithoutId';
        log.trace({ moduleName, methodName }, 'start');
        const sqlStatement = `
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
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, sqlStatement, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, sqlStatement });
        let result = {};
        const results = [];
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
function getTestd2s2(conn) {
    return new Promise((resolve, reject) => {
        const methodName = 'getTestd2s2';
        log.trace({ moduleName, methodName }, 'start');
        const sqlStatement = `
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
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, sqlStatement, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, sqlStatement });
        let result = {};
        const results = [];
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
function getTestd2sAnObjectWithoutIdANewObject(conn) {
    return new Promise((resolve, reject) => {
        const methodName = 'getTestd2sAnObjectWithoutIdANewObject';
        log.trace({ moduleName, methodName }, 'start');
        const sqlStatement = `
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
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, sqlStatement, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, sqlStatement });
        let result = {};
        const results = [];
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
let log;
let pool;
ava_1.default.before('Set up database connections', () => {
    log = Logger.instance.log;
    // log.log_level = 'TRACE';
    let rdbms;
    try {
        // grab the environment variable with the database connection string
        rdbms = JSON.parse(process.env.DOCTOSQL_RDBMS);
    }
    catch (e) {
        log.fatal('DOCTOSQL_RDBMS is not a valid JSON string');
    }
    if (!_.isPlainObject(rdbms)) {
        log.fatal('Invalid database connection string.  Check value of TESTD2S_RDBMS');
        // App cannot start without a database, so die
        process.exit(1);
    }
    const database = rdbms.database;
    const password = rdbms.password;
    const server = rdbms.server;
    const userName = rdbms.userName;
    const connectTimeout = (rdbms.connectTimeout !== undefined) ?
        Number.parseInt(rdbms.connectTimeout, 10) : 500000; // five minutes
    const requestTimeout = (rdbms.requestTimeout !== undefined) ?
        Number.parseInt(rdbms.requestTimeout, 10) : 86399997; // almost 24 hours
    const port = (rdbms.port !== undefined) ?
        Number.parseInt(rdbms.port, 10) : 1433;
    const connectionConfig = {
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
    pool = Database.constructor(connectionConfig);
});
ava_1.default('sqlDML - ', (t) => __awaiter(void 0, void 0, void 0, function* () {
    t.plan(137);
    const name = 'testd2s';
    // log.level('error');
    // console.log(`*** log.level = ${log.level()}`);
    let conn = yield pool.connection;
    let results = yield execute(conn, `
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
    yield conn.release();
    const docs = [];
    docs.push(testDoc.doc);
    const log1 = yield dmd.initializeLogger(log);
    const json = yield dmd.analyzeDocuments(name.toLowerCase(), docs);
    const log2 = yield smd.initializeLogger(log);
    const meta = yield smd.analyzeDocumentMetadata(json);
    const log3 = yield ddl.initializeLogger(log);
    const ddl0 = yield ddl.createTables(meta);
    const log4 = yield dml.initializeLogger(log);
    const dml0 = yield dml.mergeDocs(meta, docs);
    // console.log(inspect(dml0));
    t.true(dml0 !== false, '');
    conn = yield pool.connection;
    results = yield getTestd2s(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnObjectWithoutId(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnObjectWithId(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnObjectWithIdAnObjectWithinAnObject(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnArrayWithoutIds(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnArrayWithIds(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray(conn);
    yield conn.release();
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
    const json2 = yield dmd.analyzeDocuments(name.toLowerCase(), docs);
    const meta2 = yield smd.analyzeDocumentMetadata(json2);
    // log.level('trace');
    // console.log(`*** log.level = ${log.level()}`);
    const ddl1 = yield ddl.createTables(meta2);
    // log.level('trace');
    // console.log(`*** log.level = ${log.level()}`);
    const ddl2 = yield ddl.alterTables(meta2);
    // log.level('error');
    // console.log(`*** log.level = ${log.level()}`);
    const dml2 = yield dml.mergeDocs(meta2, docs);
    // console.log(inspect(dml2));
    t.true(ddl2 !== false, '');
    conn = yield pool.connection;
    results = yield getTestd2s2(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnObjectWithoutId(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnObjectWithoutIdANewObject(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnObjectWithId(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnObjectWithIdAnObjectWithinAnObject(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnArrayWithoutIds(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnArrayWithIds(conn);
    yield conn.release();
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
    conn = yield pool.connection;
    results = yield getTestd2sAnArrayWithIdsAnObjectWithinAnObjectInAnArray(conn);
    yield conn.release();
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
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRE1MLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzcWxETUwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsK0JBQStCO0FBQy9CLDZDQUE2Qzs7Ozs7Ozs7Ozs7QUFFN0MsNkJBQXVCO0FBQ3ZCLDRCQUE0QjtBQUM1QiwrQkFBK0I7QUFDL0IsNkJBQTZCO0FBQzdCLDZCQUE2QjtBQUU3QixvREFBb0Q7QUFDcEQsa0RBQWtEO0FBQ2xELG9EQUFvRDtBQUNwRCwwQ0FBMEM7QUFFMUMsTUFBTSxnQkFBZ0IsR0FBWSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUEyQixJQUFJLFdBQVcsQ0FBQTtBQUN4RixNQUFNLFFBQVEsR0FBUSxPQUFPLENBQUMsb0JBQW9CLGdCQUFnQixXQUFXLENBQUMsQ0FBQztBQUMvRSxNQUFNLEdBQUcsR0FBUSxPQUFPLENBQUMsb0JBQW9CLGdCQUFnQixTQUFTLENBQUMsQ0FBQztBQUN4RSxNQUFNLEdBQUcsR0FBUSxPQUFPLENBQUMsb0JBQW9CLGdCQUFnQixTQUFTLENBQUMsQ0FBQztBQUN4RSxNQUFNLFVBQVUsR0FBVywyQkFBMkIsQ0FBQztBQUV2RCxTQUFTLE9BQU8sQ0FBQyxHQUFRO0lBQ3ZCLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFDakQsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLElBQVMsRUFBRSxNQUFjO0lBQ3hDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsTUFBTSxVQUFVLEdBQVcsU0FBUyxDQUFDO1FBQ3JDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZELHVCQUF1QjtRQUN2QixNQUFNLE9BQU8sR0FBVSxFQUFF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Q0FBQyxDQUFDLE9BQU8sS0FBSyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbkYsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbkYsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDekUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUUvRCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM5RixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM3RixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMs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QUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM3RixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNuRixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNuRixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN6RSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUsscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRS9ELENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzlGLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUsscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdGLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENB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