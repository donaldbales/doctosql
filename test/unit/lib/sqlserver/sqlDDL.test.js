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
const dmd = require("../../../../src/lib/docMetadata");
const Logger = require("../../../../src/lib/Logger");
const smd = require("../../../../src/lib/sqlMetadata");
const testDoc = require("../testDoc.test");
const DOCTOSQL_DATABASE = process.env.DOCTOSQL_DATABASE || 'sqlserver';
const { Database } = require(`../../../../src/lib/${DOCTOSQL_DATABASE}/Database`);
const ddl = require(`../../../../src/lib/${DOCTOSQL_DATABASE}/sqlDDL`);
const moduleName = 'test/unit/lib/sqlserver/sqlDDL.test';
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
                    log.error(sqlerr);
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
            });
            sqlRequest.on('requestCompleted', () => {
                log.trace({ moduleName, methodName, script });
                return resolve({ conn, results });
            });
            conn.execSql(sqlRequest);
        }
        else {
            reject({ conn, results });
        }
    });
}
function getColumns(conn, like) {
    return new Promise((resolve, reject) => {
        const methodName = 'getColumns';
        log.trace({ moduleName, methodName, like }, 'start');
        const sqlStatement = `
      select table_name,
             column_name,
             upper(data_type) as data_type,
             character_maximum_length
      from   INFORMATION_SCHEMA.COLUMNS
      where  table_name like @table_name + '%'
      order by table_name,
             ordinal_position
      `;
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, like, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName, like }, `${rowCount} rows`);
            }
        });
        sqlRequest.addParameter('table_name', tds.TYPES.VarChar, like);
        log.trace({ moduleName, methodName, like, sqlStatement });
        let result;
        const results = [];
        sqlRequest.on('row', (columns) => {
            log.trace({ moduleName, methodName, like }, `row`);
            result = {
                tableName: columns[0].value,
                columnName: columns[1].value,
                sqlType: columns[2].value,
                maxLength: columns[3].value
            };
            results.push(result);
        });
        sqlRequest.on('requestCompleted', () => {
            log.trace({ moduleName, methodName, like }, `requestCompleted`);
            return resolve({ conn, results });
        });
        conn.execSql(sqlRequest);
    });
}
function getKeys(conn, like) {
    return new Promise((resolve, reject) => {
        const methodName = 'getKeys';
        log.trace({ moduleName, methodName, like }, 'start');
        const sqlStatement = `
      select constraint_name,
             table_name,
             column_name,
             ordinal_position
      from   INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      where  table_name like @table_name + '%'
      order by table_name,
             constraint_name,
             ordinal_position
      `;
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, like, sqlerr });
                return reject({ conn, sqlerr });
            }
            else {
                log.trace({ moduleName, methodName, like }, `${rowCount} rows`);
            }
        });
        sqlRequest.addParameter('table_name', tds.TYPES.VarChar, like);
        log.trace({ moduleName, methodName, like, sqlStatement });
        let result;
        const results = [];
        sqlRequest.on('row', (columns) => {
            log.trace({ moduleName, methodName, like }, `row`);
            result = {
                keyName: columns[0].value,
                tableName: columns[1].value,
                columnName: columns[2].value,
                position: columns[3].value
            };
            results.push(result);
        });
        sqlRequest.on('requestCompleted', () => {
            log.trace({ moduleName, methodName, like }, `requestCompleted`);
            return resolve({ conn, results });
        });
        conn.execSql(sqlRequest);
    });
}
let log;
let pool;
ava_1.default.before('Set up database connections', () => {
    log = Logger.instance.log;
    log.log_level = 'TRACE';
    let rdbms;
    try {
        // grab the environment variable with the database connection string
        rdbms = JSON.parse(process.env.DOCTOSQL_RDBMS);
    }
    catch (e) {
        log.fatal('DOCTOSQL_RDBMS is not a valid JSON string');
    }
    if (!_.isPlainObject(rdbms)) {
        log.fatal('Invalid database connection string.  Check value of DOCTOSQL_RDBMS');
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
    pool = new Database(connectionConfig);
    console.log(inspect(pool));
});
ava_1.default('sqlDDL - ', (t) => __awaiter(void 0, void 0, void 0, function* () {
    t.plan(8);
    let tokens;
    tokens = [];
    const DELIMITER = '\t';
    const COLUMN_NAME = 0;
    const SQL_TYPE = 1;
    const DOC_ADDR = 2;
    const DOC_TYPE = 3;
    const docs = [];
    docs.push(testDoc.doc);
    const name = 'testd2s';
    const result = yield pool.connection.then((conn2) => {
        return execute(conn2, `
      drop table if exists ${name.toUpperCase()};
      drop table if exists ${name.toUpperCase()}_AN_ARRAY_WITH_IDS;
      drop table if exists ${name.toUpperCase()}_AN_ARRAY_WITH_IDS_AN_OBJECT_WITHIN_AN_OBJECT_IN_AN_ARRAY;
      drop table if exists ${name.toUpperCase()}_AN_ARRAY_WITH_NO_IDS;
      drop table if exists ${name.toUpperCase()}_AN_OBJECT_WITH_AN_ID;
      drop table if exists ${name.toUpperCase()}_AN_OBJECT_WITH_AN_ID_AN_OBJECT_WITHIN_AN_OBJECT;
      drop table if exists ${name.toUpperCase()}_AN_OBJECT_WITH_NO_ID;
      drop table if exists ${name.toUpperCase()}_AN_OBJECT_WITH_NO_ID_A_NEW_OBJECT;
    `);
    }).then((intermediateResult) => {
        intermediateResult.conn.release();
    });
    yield dmd.initializeLogger(log);
    const json = yield dmd.analyzeDocuments(name.toLowerCase(), docs);
    yield smd.initializeLogger(log);
    const meta = yield smd.analyzeDocumentMetadata(json);
    const logs = yield ddl.initializeLogger(log);
    const ddl0 = yield ddl.createTables(meta);
    // console.log(inspect(ddl0));
    t.true(ddl0 !== false, '');
    let conn = null;
    conn = yield pool.connection;
    let tabcols = yield getColumns(conn, name.toLocaleUpperCase());
    yield conn.release();
    // console.log(`*** \n${inspect(tabcols.results)}`);
    let count;
    let found;
    count = 0;
    found = 0;
    for (const tab in meta) {
        if (meta.hasOwnProperty(tab)) {
            const tableName = ddl.createTableName(meta, tab);
            for (const col of meta[tab].columns) {
                tokens = col.split(DELIMITER);
                const columnName = tokens[COLUMN_NAME].trim();
                const sqlType = tokens[SQL_TYPE].trim();
                let maxLength = 99999;
                if (sqlType.indexOf('(') > -1) {
                    maxLength = Number(sqlType.split('(')[1].split(')')[0]);
                }
                count++;
                for (const tabcol of tabcols.results) {
                    if (tabcol.tableName === tableName &&
                        tabcol.columnName === columnName &&
                        tabcol.sqlType === sqlType.slice(0, tabcol.sqlType.length)) {
                        if (tabcol.maxLength) {
                            if (tabcol.maxLength >= maxLength) {
                                found++;
                            }
                        }
                        else {
                            found++;
                        }
                    }
                }
            }
        }
    }
    t.true(count === found, 'the database and the metadata are the same');
    conn = yield pool.connection;
    let tabkeys = yield getKeys(conn, name.toLocaleUpperCase());
    yield conn.release();
    // console.log(`*** \n${inspect(tabkeys.results)}`);
    count = 0;
    found = 0;
    for (const tab in meta) {
        if (meta.hasOwnProperty(tab)) {
            const tableName = ddl.createTableName(meta, tab);
            const keyName = tableName + '_PK';
            // skip PK
            for (const col of meta[tab].fkColumns) {
                tokens = col.split(DELIMITER);
                const columnName = tokens[COLUMN_NAME].trim();
                count++;
                for (const tabkey of tabkeys.results) {
                    if (tabkey.keyName === keyName &&
                        tabkey.tableName === tableName &&
                        tabkey.columnName === columnName) {
                        found++;
                    }
                }
            }
        }
    }
    t.true(count === found, 'the database and the metadata keys are the same');
    count = 0;
    found = 0;
    for (const tab in meta) {
        if (meta.hasOwnProperty(tab)) {
            if (meta[tab].parentName === '') {
                const tableName = ddl.createTableName(meta, tab);
                const keyName = tableName + '_UK';
                count = 2; // ID and REV
                for (const tabkey of tabkeys.results) {
                    if (tabkey.keyName === keyName &&
                        tabkey.tableName === tableName &&
                        (tabkey.columnName === 'ID' || tabkey.columnName === 'REV')) {
                        found++;
                    }
                }
            }
        }
    }
    t.true(count === found, 'the database and the metadata unique keys are the same');
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
    const ddl1 = yield ddl.createTables(meta2);
    const ddl2 = yield ddl.alterTables(meta2);
    // console.log(inspect(ddl2));
    t.true(ddl2 !== false, '');
    conn = yield pool.connection;
    tabcols = yield getColumns(conn, name.toLocaleUpperCase());
    yield conn.release();
    // console.log(`*** \n${inspect(tabcols.results)}`);
    count = 0;
    found = 0;
    for (const tab in meta) {
        if (meta.hasOwnProperty(tab)) {
            const tableName = ddl.createTableName(meta, tab);
            for (const col of meta[tab].columns) {
                tokens = col.split(DELIMITER);
                const columnName = tokens[COLUMN_NAME].trim();
                const sqlType = tokens[SQL_TYPE].trim();
                let maxLength = 99999;
                if (sqlType.indexOf('(') > -1) {
                    maxLength = Number(sqlType.split('(')[1].split(')')[0]);
                }
                count++;
                for (const tabcol of tabcols.results) {
                    if (tabcol.tableName === tableName &&
                        tabcol.columnName === columnName &&
                        tabcol.sqlType === sqlType.slice(0, tabcol.sqlType.length)) {
                        if (tabcol.maxLength) {
                            if (tabcol.maxLength >= maxLength) {
                                found++;
                            }
                        }
                        else {
                            found++;
                        }
                    }
                }
            }
        }
    }
    t.true(count === found, 'the database and the metadata are the same after being altered');
    conn = yield pool.connection;
    tabkeys = yield getKeys(conn, name.toLocaleUpperCase());
    yield conn.release();
    // console.log(`*** \n${inspect(tabkeys.results)}`);
    count = 0;
    found = 0;
    for (const tab in meta) {
        if (meta.hasOwnProperty(tab)) {
            const tableName = ddl.createTableName(meta, tab);
            const keyName = tableName + '_PK';
            // skip PK
            for (const col of meta[tab].fkColumns) {
                tokens = col.split(DELIMITER);
                const columnName = tokens[COLUMN_NAME].trim();
                count++;
                for (const tabkey of tabkeys.results) {
                    if (tabkey.keyName === keyName &&
                        tabkey.tableName === tableName &&
                        tabkey.columnName === columnName) {
                        found++;
                    }
                }
            }
        }
    }
    t.true(count === found, 'the database and the metadata keys are the same after begin altered');
    count = 0;
    found = 0;
    for (const tab in meta) {
        if (meta.hasOwnProperty(tab)) {
            if (meta[tab].parentName === '') {
                const tableName = ddl.createTableName(meta, tab);
                const keyName = tableName + '_UK';
                count = 2; // ID and REV
                for (const tabkey of tabkeys.results) {
                    if (tabkey.keyName === keyName &&
                        tabkey.tableName === tableName &&
                        (tabkey.columnName === 'ID' || tabkey.columnName === 'REV')) {
                        found++;
                    }
                }
            }
        }
    }
    t.true(count === found, 'the database and the metadata unique keys are the same after being altered');
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRERMLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzcWxEREwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsK0JBQStCO0FBQy9CLDZDQUE2Qzs7Ozs7Ozs7Ozs7QUFFN0MsNkJBQXVCO0FBQ3ZCLDRCQUE0QjtBQUM1QiwrQkFBK0I7QUFDL0IsNkJBQTZCO0FBQzdCLDZCQUE2QjtBQUU3Qix1REFBdUQ7QUFDdkQscURBQXFEO0FBQ3JELHVEQUF1RDtBQUN2RCwyQ0FBMkM7QUFFM0MsTUFBTSxpQkFBaUIsR0FBWSxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUE0QixJQUFJLFdBQVcsQ0FBQztBQUMzRixNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixpQkFBaUIsV0FBVyxDQUFDLENBQUM7QUFDbEYsTUFBTSxHQUFHLEdBQVEsT0FBTyxDQUFDLHVCQUF1QixpQkFBaUIsU0FBUyxDQUFDLENBQUM7QUFDNUUsTUFBTSxVQUFVLEdBQVcscUNBQXFDLENBQUM7QUFFakUsU0FBUyxPQUFPLENBQUMsR0FBUTtJQUN2QixPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO0FBQ2pELENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxJQUFTLEVBQUUsTUFBYztJQUN4QyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFXLFNBQVMsQ0FBQztRQUNyQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2RCx1QkFBdUI7UUFDdkIsTUFBTSxPQUFPLEdBQVUsRUFBRSxDQUFDO1FBQzFCLElBQUksTUFBTSxFQUFFO1lBQ1YsTUFBTSxVQUFVLEdBQUcsSUFB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