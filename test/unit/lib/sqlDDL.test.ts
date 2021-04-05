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
const Database: any = require(`../../../src/lib/${DOCTOSQL_DB_TYPE}/Database`);
const ddl: any = require(`../../../src/lib/${DOCTOSQL_DB_TYPE}/sqlDDL`);
const moduleName: string = 'test/unit/lib/sqlDDL.test';

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
            log.error(sqlerr);
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
      });

      sqlRequest.on('requestCompleted', () => {
        log.trace({ moduleName, methodName, script });
        return resolve({ conn, results });
      });

      conn.execSql(sqlRequest);
    } else {
      reject({ conn, results });
    }
  });
}

function getColumns(conn: any, like: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getColumns';
    log.trace({ moduleName, methodName, like }, 'start');
    const sqlStatement: string = `
      select table_name,
             column_name,
             upper(data_type) as data_type,
             character_maximum_length
      from   INFORMATION_SCHEMA.COLUMNS
      where  table_name like @table_name + '%'
      order by table_name,
             ordinal_position
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, like, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName, like }, `${rowCount} rows`);
        }
      });

    sqlRequest.addParameter('table_name', tds.TYPES.VarChar, like);

    log.trace({ moduleName, methodName, like, sqlStatement });

    let result: any;
    const results: any[] = [];

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

function getKeys(conn: any, like: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'getKeys';
    log.trace({ moduleName, methodName, like }, 'start');
    const sqlStatement: string = `
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
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, like, sqlerr });
          return reject({ conn, sqlerr });
        } else {
          log.trace({ moduleName, methodName, like }, `${rowCount} rows`);
        }
      });

    sqlRequest.addParameter('table_name', tds.TYPES.VarChar, like);

    log.trace({ moduleName, methodName, like, sqlStatement });

    let result: any;
    const results: any[] = [];

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

let log: any;
let pool: any;
test.before('Set up database connections', () => {
  log = Logger.instance.log;
  log.log_level = 'TRACE';

  let rdbms: any;
  try {
    // grab the environment variable with the database connection string
    rdbms = JSON.parse((process.env.DOCTOSQL_RDBMS as string));
  } catch (e) {
    log.fatal('DOCTOSQL_RDBMS is not a valid JSON string');
  }

  if (!_.isPlainObject(rdbms)) {
    log.fatal('Invalid database connection string.  Check value of DOCTOSQL_RDBMS');
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

  const connectionConfig: any = {
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

test('sqlDDL - ', async (t) => {
  t.plan(8);

  let tokens: any;
  tokens = [];
  const DELIMITER: string = '\t';
  const COLUMN_NAME: number = 0;
  const SQL_TYPE: number = 1;
  const DOC_ADDR: number = 2;
  const DOC_TYPE: number = 3;

  const docs: any[] = [];
  docs.push(testDoc.doc);
  const name: string = 'testd2s';

  const result = await pool.connection.then((conn2: any) => {
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
  }).then((intermediateResult: any) => {
    intermediateResult.conn.release();
  });
  
  await dmd.initializeLogger(log);
  const json = await dmd.analyzeDocuments(name.toLowerCase(), docs);
  await smd.initializeLogger(log);
  const meta = await smd.analyzeDocumentMetadata(json);
  const logs = await ddl.initializeLogger(log);
  const ddl0 = await ddl.createTables(meta);
  // console.log(inspect(ddl0));

  t.true(ddl0 !== false, '');

  let conn = null;
  conn = await pool.connection;
  let tabcols = await getColumns(conn, name.toLocaleUpperCase());
  await conn.release();

  // console.log(`*** \n${inspect(tabcols.results)}`);

  let count: number;
  let found: number;
  count = 0;
  found = 0;
  for (const tab in meta) {
    if (meta.hasOwnProperty(tab)) {
      const tableName: string = ddl.createTableName(meta, tab);
      for (const col of meta[tab].columns) {
        tokens = col.split(DELIMITER);
        const columnName: string = tokens[COLUMN_NAME].trim();
        const sqlType: string = tokens[SQL_TYPE].trim();
        let maxLength: number = 99999;
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
            } else {
              found++;
            }
          }
        }
      }
    }
  }
  t.true(count === found, 'the database and the metadata are the same');

  conn = await pool.connection;
  let tabkeys = await getKeys(conn, name.toLocaleUpperCase());
  await conn.release();

  // console.log(`*** \n${inspect(tabkeys.results)}`);

  count = 0;
  found = 0;
  for (const tab in meta) {
    if (meta.hasOwnProperty(tab)) {
      const tableName: string = ddl.createTableName(meta, tab);
      const keyName: string = tableName + '_PK';
      // skip PK
      for (const col of meta[tab].fkColumns) {
        tokens = col.split(DELIMITER);
        const columnName: string = tokens[COLUMN_NAME].trim();
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
        const tableName: string = ddl.createTableName(meta, tab);
        const keyName: string = tableName + '_UK';
        count = 2;  // ID and REV
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

  const json2 = await dmd.analyzeDocuments(name.toLowerCase(), docs);
  const meta2 = await smd.analyzeDocumentMetadata(json2);
  const ddl1 = await ddl.createTables(meta2);
  const ddl2 = await ddl.alterTables(meta2);
  // console.log(inspect(ddl2));

  t.true(ddl2 !== false, '');

  conn = await pool.connection;
  tabcols = await getColumns(conn, name.toLocaleUpperCase());
  await conn.release();

  // console.log(`*** \n${inspect(tabcols.results)}`);

  count = 0;
  found = 0;
  for (const tab in meta) {
    if (meta.hasOwnProperty(tab)) {
      const tableName: string = ddl.createTableName(meta, tab);
      for (const col of meta[tab].columns) {
        tokens = col.split(DELIMITER);
        const columnName: string = tokens[COLUMN_NAME].trim();
        const sqlType: string = tokens[SQL_TYPE].trim();
        let maxLength: number = 99999;
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
            } else {
              found++;
            }
          }
        }
      }
    }
  }
  t.true(count === found, 'the database and the metadata are the same after being altered');

  conn = await pool.connection;
  tabkeys = await getKeys(conn, name.toLocaleUpperCase());
  await conn.release();

  // console.log(`*** \n${inspect(tabkeys.results)}`);

  count = 0;
  found = 0;
  for (const tab in meta) {
    if (meta.hasOwnProperty(tab)) {
      const tableName: string = ddl.createTableName(meta, tab);
      const keyName: string = tableName + '_PK';
      // skip PK
      for (const col of meta[tab].fkColumns) {
        tokens = col.split(DELIMITER);
        const columnName: string = tokens[COLUMN_NAME].trim();
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
        const tableName: string = ddl.createTableName(meta, tab);
        const keyName: string = tableName + '_UK';
        count = 2;  // ID and REV
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
});
