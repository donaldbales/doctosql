// sqlServer

/* tslint:disable:no-console */
import Logger from 'bunyan';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as padEnd from 'string.prototype.padend';
import * as tds from 'tedious';

import Database from './Database';
import { inspect } from './inspect';
import { createTableName } from './sqlDDL';

// Sql Server Reserved Words
// https://docs.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-2017

const arrayIndex: string = 'AI';
const delimiter: string = `\t`;
const nameLimit: number = 128;
const moduleName: string = 'src/lib/sqlDML.js';

let pool: Database;
let log: Logger;

let revisions: Map<string, string> = new Map();
let revisionsTable: string = '';
export async function initializeRevisions(tables: any): Promise<any> {
  const methodName: string = 'initializeRevisions';
  log.info({ moduleName, methodName }, `start`);
  let table: string = '';
  for (table in tables) {
    if (!tables[table].parentName) {
      revisionsTable = table;
      break;
    }
  }
  await pool.connection.then((conn: any) => {
    log.trace({ moduleName, methodName, table }, 'Step 1');
    return checkForRevisions(conn, tables, table);
  }).then((results: any) => {
    log.trace({ moduleName, methodName, table }, 'Step 2');
    revisions = new Map(results.results);
    return results.conn.release();
  }).catch((error) => {
    log.error({ moduleName, methodName, table, error: inspect(error).slice(0, 2000) });
  });
}

function checkForRevisions(conn: any, tables: any, table: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'checkForRevisions';
    log.info({ moduleName, methodName, table }, 'start');
    const tableName: any = createTableName(tables, table);
    const sqlStatement: string = `
      select ID,
             REV
      from   ${tableName}
      order by ID
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, table, sqlerr });
          return reject(sqlerr);
        } else {
          log.info({ moduleName, methodName, table }, `${rowCount} rows`);
        }
      });

    log.trace({ moduleName, methodName, table, tableName, sqlStatement });

    let result: any;
    const results: any[] = [];

    sqlRequest.on('row', (columns) => {
      const id: any = columns[0].value;
      const rev: any = columns[1].value;
      result = [
        id,
        rev
      ];
      results.push(result);
    });

    sqlRequest.on('requestCompleted', () => {
      log.debug({ moduleName, methodName, table }, `requestCompleted`);
      return resolve({ conn, tables, table, results });
    });

    conn.execSql(sqlRequest);
  });
}

export function initializeLogger(loggerLog: Logger): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'initializeLogger';
    log = loggerLog;

    // for now, throw connection pool in here.

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

    log.trace({ moduleName, methodName }, `logger set up!`);

    resolve(true);
  });
}

function mergeRow(
  conn: any,
  tables: any,
  table: string,
  doc: any,
  parentJsonKey: any,
  evented: boolean = false): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'mergeRow';
    log.trace({ moduleName, methodName, table, doc, parentJsonKey }, 'start');
    const id: string = doc._id || doc.id;
    const tableName: string = createTableName(tables, table);
    let sqlStatement: string = `merge into ${tableName} as t using `;
    let columnList: string = '';
    let sDotColumnList: string = '';
    let valuesList: string = '';
    let setList: string = '';
    let onList: string = '';
    for (const column of tables[table].columns) {
      const tokens = column.split(delimiter);
      const columnName: string = tokens[0].trim();
      columnList += `${columnName}, `;
      sDotColumnList += `s.${columnName}, `;
      valuesList += `@${columnName}, `;
      setList += `t.${columnName} = s.${columnName}, `;
      if (columnName === 'ID' ||
          columnName === arrayIndex) {
        onList += `t.${columnName} = s.${columnName} and `;
      }
    }
    for (const column of tables[table].fkColumns) {
      const tokens = column.split(delimiter);
      const columnName: string = tokens[0].trim();
      columnList += `${columnName}, `;
      sDotColumnList += `s.${columnName}, `;
      valuesList += `@${columnName}, `;
      setList += `t.${columnName} = s.${columnName}, `;
      onList += `t.${columnName} = s.${columnName} and `;
    }
    columnList = `${columnList.slice(0, columnList.length - 2)}`;
    sDotColumnList = `${sDotColumnList.slice(0, sDotColumnList.length - 2)}`;
    valuesList = `${valuesList.slice(0, valuesList.length - 2)}`;
    setList = `${setList.slice(0, setList.length - 2)}`;
    onList = `${onList.slice(0, onList.length - 5)}`;

    sqlStatement += `( select ${valuesList} ) as s ( ${columnList} ) `;
    sqlStatement += `on ( ${onList} ) `;
    sqlStatement += `when not matched by target then `;
    sqlStatement += `insert ( ${columnList} ) values ( ${sDotColumnList} ) `;
    sqlStatement += `when matched then `;
    sqlStatement += `update set ${setList};`;

    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          if (evented) {
            log.warn({ moduleName, methodName, table, id, sqlerr });
          } else {
            log.error({ moduleName, methodName, table, id, sqlerr });
          }
          return reject({ sqlerr, table, doc, parentJsonKey });
        } else {
          log.info({ moduleName, methodName, table, id, parentJsonKey }, `${rowCount} rows`);
        }
      });

    for (const column of tables[table].columns) {
      const tokens = column.split(delimiter);
      const sqlName: string = tokens[0].trim();
      const sqlType: string = tokens[1].trim();
      const lastIndexOfDot: number = tokens[2].lastIndexOf('.');
      let jsonKey: string = tokens[2];
      if (lastIndexOfDot > -1) {
        jsonKey = tokens[2].slice(lastIndexOfDot + 1, tokens[2].length);
      }
      if (parentJsonKey) {
        jsonKey = `${parentJsonKey}.${jsonKey}`;
      }
      const dataType: string = tokens[3];
      let tdsType: any;
      tdsType = parameterType(dataType);
      let precision: number;
      precision = 36;
      let scale: number;
      scale = 17;
      let value: any;
      try {
        value = resolveValue(jsonKey, doc);

        const tov: string = typeof(value);
        if (tov === 'undefined' || value === null) {
          value = null;
          // If an ID is missing, try using the AI
          if (sqlName === 'ID') {
            jsonKey = 'ai';
            if (parentJsonKey) {
              jsonKey = `${parentJsonKey}.${jsonKey}`;
            }
            value = resolveValue(jsonKey, doc);
          }
        } else
        if (dataType === 'int') {
          if (!isNaN(value)) {
            value = Number(value);
          } else {
            value = null;
          }
        } else
        if (dataType === 'number') {
          if (!isNaN(value)) {
            // don't mess with the value
          } else {
            value = null;
            // tdsType = tds.TYPES.Null;
          }
        } else
        if (dataType === 'date') {
          const parsed: any = moment(value);
          if (parsed && parsed.isValid()) {
            value = parsed.toDate();
          } else {
            value = null;
          }
        } else
        if (dataType === 'boolean') {
          if (value === false || value === 'false' || value === 0) {
            value = 0;
          } else
          if (value === true || value === 'true' || value === 1) {
            value = 1;
          } else {
            value = null;
          }
        } else
        if (dataType === 'string') {
          if (!value) {
            value = null;
          }
        } else {
          value = null;
        }
      } catch (conversionError) {
        log.error({ moduleName, methodName, table, column: sqlName, tdsType, jsonKey, conversionError });
      }
      log.trace({ moduleName, methodName, table, column: sqlName, tdsType, jsonKey, value });

      if (tdsType === tds.TYPES.Decimal) {
        sqlRequest.addParameter(sqlName, tdsType, value, { precision, scale });
      } else {
        sqlRequest.addParameter(sqlName, tdsType, value);
      }
    }
    for (const column of tables[table].fkColumns) {
      const tokens = column.split(delimiter);
      const sqlName: string = tokens[0].trim();
      const sqlType: string = tokens[1].trim();
      let jsonKey: string = tokens[2];
      const childParts: string[] = jsonKey.split('.');
      const childPart: string = childParts[childParts.length - 1];
      const parentParts: string[] = parentJsonKey.split('.');
      let parentPart: string = '';
      if (childParts.length === 2) {
        jsonKey = childPart;
      } else
      if (childParts.length > 2) {
        parentPart = childParts[childParts.length - 2];
        let childInParent: number = -1;
        for (let i = parentParts.length - 1; i > -1; i--) {
          if (parentParts[i] === parentPart) {
            childInParent = i;
            break;
          }
        }
        if (childInParent < parentParts.length - 1 &&
            parentParts[childInParent + 1] &&
           !Number.isNaN(Number(parentParts[childInParent + 1]))) {
          const parentChildParts: string[] = parentParts.slice(0, childInParent + 2);
          // console.log(`slicing childInParent + 1: ${parentChildParts}`);
          parentChildParts.push(childPart);
          jsonKey = parentChildParts.join('.');
        } else {
          const parentChildParts: string[] = parentParts.slice(0, childInParent + 1);
          parentChildParts.push(childPart);
          jsonKey = parentChildParts.join('.');
        }
      } else {
        throw Error('Something is seriously wrong here.');
      }
      const dataType: string = tokens[3];
      const tdsType = parameterType(dataType);
      let value: any;
      try {
        value = resolveValue(jsonKey, doc);

        const tov: string = typeof(value);
        if (tov === 'undefined' || value === null) {
          value = null;
        } else
        if (dataType === 'int') {
          if (!isNaN(value)) {
            value = Number(value);
          } else {
            value = null;
          }
        } else
        if (dataType === 'number') {
          if (!isNaN(value)) {
            // don't mess with the value
          } else {
            value = null;
          }
        } else
        if (dataType === 'date') {
          const parsed: any = moment(value);
          if (parsed && parsed.isValid()) {
            value = parsed.toDate();
          } else {
            value = null;
          }
        } else
        if (dataType === 'boolean') {
          if (value === false || value === 'false' || value === 0) {
            value = 0;
          } else
          if (value === true || value === 'true' || value === 1) {
            value = 1;
          } else {
            value = null;
          }
        } else
        if (dataType === 'string') {
          if (!value) {
            value = null;
          }
        } else {
          value = null;
        }
      } catch (conversionError) {
        log.error({ moduleName, methodName, table, column: sqlName, tdsType, jsonKey, conversionError });
      }
      log.trace({ moduleName, methodName, table, column: sqlName, tdsType, jsonKey, value });

      if (value && tdsType === tds.TYPES.Decimal) {
        sqlRequest.addParameter(sqlName, tdsType, value, { precision: 36, scale: 17 });
      } else {
        sqlRequest.addParameter(sqlName, tdsType, value);
      }
    }

    log.trace({ moduleName, methodName, table, sqlStatement, sqlStatementLength: sqlStatement.length });

    let result: any;
    const results: any[] = [];

    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName, table, columns }, `row`);
      result = { occurs: columns[0].value };
      results.push(result);
    });

    sqlRequest.on('requestCompleted', () => {
      log.trace({ moduleName, methodName, table }, `requestCompleted`);
      return resolve({ conn, tables, table, doc, parentJsonKey });
    });

    conn.execSql(sqlRequest);
  });
}

async function mergeRows(conn: any, tables: any, table: string, doc: any, evented: boolean = false): Promise<any> {
  const methodName: string = 'mergeRows';
  log.trace({ moduleName, methodName, table }, `start`);

  // Check the id and revision
  const id: string = (doc._id as string) || (doc.id as string);
  const rev: string = (doc._rev as string) || (doc.rev as string);
  if (revisions.has(id) &&
     (revisions.get(id) as string) == rev) {
    if (revisionsTable === table) {
      log.info({ moduleName, methodName, table, id }, `no change.`);
    }
    return { conn, tables, table, doc, i: -2 };
  }

  // build an initial address with no consideration of arrays
  let jsonKeys: string[] = [];
  let jsonKey: string = table;
  let parent: string = tables[table].parentName;
  for ( ; ; ) {
    if (parent) {
      jsonKey = `${parent}.${jsonKey}`;
      parent = tables[parent].parentName;
    } else {
      break;
    }
  }
  // drop the root table from the address
  const jsonKeyIO: number = jsonKey.indexOf('.');
  if (jsonKeyIO > -1) {
    jsonKey = jsonKey.slice(jsonKeyIO + 1, jsonKey.length);
  } else {
    jsonKey = '';
    jsonKeys.push(jsonKey);
  }
  log.trace({ moduleName, methodName, table, jsonKey }, `not considering arrays`);
  // build addresses with consideration for arrays
  let maxKeyLength: number = jsonKey.split('.').length;
  const tokens: string[] = jsonKey.split('.');
  const tokensLength: number = tokens.length || 0;
  if (jsonKey && tokensLength > 0) {
    let key: string = '';
    let val: any = '';
    for (const token of tokens) {
      const jkl: number = jsonKeys.length;
      if (jkl > 0) {
        for (let k = 0; k < jkl; k++) {
          key = `${jsonKeys[k]}.${token}`;
          val = resolveValue(key, doc);
          if (val && val instanceof Array) {
            maxKeyLength++;
            for (let i = 0; i < val.length; i++) {
              const arrayKey: string = `${key}.${i}`;
              jsonKeys.push(arrayKey);
              log.trace({ moduleName, methodName, table, arrayKey }, `an array`);
            }
          } else
          if (val && val instanceof Object) {
            const objectKey: string = `${key}`;
            jsonKeys.push(objectKey);
            log.trace({ moduleName, methodName, table, objectKey }, `an object`);
          }
        }
      } else {
        key += `.${token}`;
        key = key.startsWith('.') ? key.slice(1, key.length) : key;
        val = resolveValue(key, doc);
        if (val && val instanceof Array) {
          maxKeyLength++;
          for (let i = 0; i < val.length; i++) {
            const arrayKey2: string = `${key}.${i}`;
            jsonKeys.push(arrayKey2);
            log.trace({ moduleName, methodName, table, arrayKey2 }, `an array`);
          }
        } else
        if (val && val instanceof Object) {
          const objectKey2: string = `${key}`;
          jsonKeys.push(objectKey2);
          log.trace({ moduleName, methodName, table, objectKey2 }, `an object`);
        }
      }
    }
    // get rid of parent addresses
    log.trace({ moduleName, methodName, table, jsonKeys, maxKeyLength }, `before`);
    const newJsonKeys: string[] = [];
    for (const newJsonKey of jsonKeys) {
      const newKeyLength: number = newJsonKey.split('.').length;
      if (newKeyLength === maxKeyLength) {
        newJsonKeys.push(newJsonKey);
      }
    }
    jsonKeys = newJsonKeys;
    log.trace({ moduleName, methodName, table, jsonKeys }, `after`);
  }
  // apply addresses
  let result: any = new Promise((r) => { r({ conn, tables, table, doc, i: -1 }); });
  let value: any = '';
  for (jsonKey of jsonKeys) {
    if (jsonKey === '') {
      value = doc;
    } else if (jsonKey) {
      value = resolveValue(jsonKey, doc);
    } else {
      throw Error('This should never happen!!!');
    }
    if (value &&
        value instanceof Object) {
      log.trace({ moduleName, methodName, jsonKey, value }, `It's an object.`);
      result = new Promise((r) => { r({ conn, tables, table, doc, i: -1 }); });
      try {
        result = await mergeRow(conn, tables, table, doc, jsonKey);
      } catch (mergeRowError) {
        if (evented) {
          console.warn(mergeRowError);
        } else {
          console.error(mergeRowError);
        }
      }
    }
  }
  return result;
}

export async function mergeDoc(tables: any, doc: any, evented: boolean = false): Promise<any> {
  const methodName: string = 'mergeDoc';
  log.trace({ moduleName, methodName }, `start`);

  const tableKeys: any[] = [];
  for (const table in tables) {
    if (tables.hasOwnProperty(table)) {
      log.trace({ moduleName, methodName, table }, 'Step 0');
      tableKeys.push(table);
    }
  }

  for (let i = 0; i < tableKeys.length; i++) {
    const table: string = tableKeys[i];
    const eye: number = i;
    log.trace({ moduleName, methodName, table, i: eye }, `loop`);

    const result = await pool.connection.then((conn: any) => {
      log.trace({ moduleName, methodName, table }, 'Step 1');
      return mergeRows(conn, tables, table, doc, evented);
    }).then((intermediateResult: any) => {
      log.trace({ moduleName, methodName, table }, 'Step 2');
      intermediateResult.conn.release();
    });

    if (i === tableKeys.length - 1) {
      log.trace({ moduleName, methodName }, `return`);
      return result;
    }
  }
}

export async function mergeDocs(tables: any, docs: any[], evented: boolean = false): Promise<any> {
  const methodName: string = 'mergeDocs';
  log.trace({ moduleName, methodName }, `start`);

  let result: Promise<any>;

  for (let i = 0; i < docs.length; i++) {
    const doc: any = docs[i];
    const eye: number = i;
    let slc: string = '';
    if (doc._id)  {
      slc = doc._id.slice(0, 13);
    } else
    if (doc.id)  {
      slc = doc.id.slice(0, 13);
    } 
    log.trace({ moduleName, methodName, doc: slc, i: eye }, `loop`);

    result = await mergeDoc(tables, doc, evented);

    if (i === docs.length - 1) {
      log.trace({ moduleName, methodName }, `return`);
      return result;
    }
  }
}

function parameterType(dataType: string): tds.TediousType {
  const methodName: string = 'parameterType';
  log.trace({ moduleName, methodName }, `start`);

  let result: tds.TediousType = tds.TYPES.VarChar;
  if (dataType === 'int') {
    result = tds.TYPES.Int;
  } else
  if (dataType === 'number') {
    result = tds.TYPES.VarChar;
  } else
  if (dataType === 'date') {
    result = tds.TYPES.DateTimeOffset;
  } else
  if (dataType === 'boolean') {
    // console.log(`********** dataType is boolean`);
    result = tds.TYPES.Int;
  }
  return result;
}

function resolveValue(path: any, obj: any): any {
  const methodName: string = 'resolveValue';
  log.trace({ moduleName, methodName }, `start`);

  return path.split('.').reduce((prev: any, curr: any) => {
    return prev ? prev[curr] : null;
  }, obj || self );
}
