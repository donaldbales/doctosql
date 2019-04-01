// sqlServer

/* tslint:disable:no-console */

import Logger from 'bunyan';
import * as fs from 'fs';
import * as moment from 'moment';
import * as path from 'path';
import * as padEnd from 'string.prototype.padend';
import * as tds from 'tedious';

import Database from './Database';
import { inspect } from './inspect';

// Sql Server Reserved Words
// https://docs.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-2017

const arrayIndex: string = 'AI';
const delimiter: string = `\t`;
const nameLimit: number = 128;
const moduleName: string = 'src/lib/sqlDDL.js';

let log: Logger;

export function alterTables(tables: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'alterTables';
    log.trace({ moduleName, methodName }, `start`);
    let results: string = '';
    const tableKeys: any[] = [];
    for (const table in tables) {
      if (tables.hasOwnProperty(table)) {
        log.trace({ moduleName, methodName, table }, '0');
        tableKeys.push(table);
      }
    }
    let count: number = 0;
    for (const table of tableKeys) {
      connect(tables, table).then((result) => {
        log.trace({ moduleName, methodName, table }, 'Step 1');
        return checkForColumns(result.conn, result.tables, result.table);
      }).then((result) => {
        log.trace({ moduleName, methodName, table }, 'Step 2');
        return alterTableScript(result.conn, result.tables, result.table);
      }).then((result) => {
        log.trace({ moduleName, methodName, table }, 'Step 3');
        return executeDDL(result.conn, result.tables, result.table, result.sql);
      }).then((result) => {
        log.trace({ moduleName, methodName, table }, 'Step 4');
        results += `${inspect(result.results)}\n`;
        result.conn.close();
        if (++count === tableKeys.length) {
          resolve(results);
        }
      }).catch((error) => {
        log.error({ moduleName, methodName, table, error: inspect(error).slice(0, 2000) });
        if (++count === tableKeys.length) {
          resolve(results);
        }
      });
    }
  });
}

export function alterTableScript(conn: any, tables: any, table: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'alterTableScript';
    log.trace({ moduleName, methodName, table }, `start`);
    const tableName: any = createTableName(tables, table);
    let sql: string = '';
    const columns: any[] = tables[table].columns;
    for (const column of columns) {
      const tokens = column.split(delimiter);
      const columnName: string = tokens[0];
      const sqlDataType: string = tokens[1];
      const action: string = tokens[4];
      if (action === 'add') {
        sql += `alter table ${tableName} \n`;
        sql += `add ${columnName}  `;
        if (columnName.indexOf(`ID `) === 0 ||
            columnName.indexOf(`${arrayIndex} `) === 0) {
          sql += `${sqlDataType}  NOT NULL;\n`;
        } else {
          sql += `${sqlDataType.trim()};\n`;
        }
      } else
      if (action === 'alter') {
        sql += `alter table ${tableName} \n`;
        sql += `alter column ${columnName}  `;
        if (columnName.indexOf(`ID `) === 0 ||
            columnName.indexOf(`${arrayIndex} `) === 0) {
          sql += `${sqlDataType}  NOT NULL;\n`;
        } else {
          sql += `${sqlDataType.trim()};\n`;
        }
      }
    }
    /* should we try to recover from a change in structure?
    for (const column of tables[table].fkColumns) {
      const tokens = column.split(delimiter);
      sql += `${tokens[0]}  ${tokens[1]}  NOT NULL,\n`;
    }
    */

    if (sql) {
      try {
        const filename: string = `.${path.sep}db${path.sep}` +
          `${tableName.toLowerCase()}.${moment().format('YYYYMMDDHHmmss')}.alt`;
        fs.writeFileSync(filename, sql);
      } catch (err) {
        const error: any = inspect(err);
        log.error({ moduleName, methodName, sql, error });
      }
    }
    return resolve({ conn, tables, table, sql });
  });
}

function connect(tables: any, table: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const rdbms: any = JSON.parse(process.env.DOCTOSQL_RDBMS as string);

    const conn = new tds.Connection({
      options: {
        connectTimeout: 1800000,
        database: rdbms.database,
        encrypt: true,
        port: rdbms.port || 1433,
        readOnlyIntent: false,
        requestTimeout: 1800000,
        rowCollectionOnRequestCompletion: false,
        useColumnNames: false
      },
      password: rdbms.password,
      server: rdbms.server,
      userName: rdbms.userName
    });

    conn.on('connect', (err) => {
      if (err) {
        console.error(`***err=${inspect(err)}`);
        return reject(err);
      }
      return resolve({ conn, tables, table });
    });

    conn.on('error', (err) => {
      console.error(err);
      return reject(err);
    });
  });
}

function checkForColumn(conn: any, tables: any, table: string, columnName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'checkForColumn';
    log.trace({ moduleName, methodName, table, columnName }, 'start');
    const sqlStatement: string = `
      select data_type,
             case when character_maximum_length = -1 then 2147483647 else character_maximum_length end
      from   INFORMATION_SCHEMA.COLUMNS
      where  table_name = @table_name
      and    column_name = @column_name
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, table, columnName, sqlerr });
          return reject(sqlerr);
        } else {
          log.info({ moduleName, methodName, table, columnName }, `${rowCount} rows`);
        }
      });

    const tableName: any = createTableName(tables, table);
    log.trace({ moduleName, methodName, table }, `Setting table_name to ${tableName}`);
    sqlRequest.addParameter('table_name', tds.TYPES.VarChar, tableName);
    sqlRequest.addParameter('column_name', tds.TYPES.VarChar, columnName);

    log.trace({ moduleName, methodName, table, tableName, columnName, sqlStatement });

    let result: any;
    const results: any[] = [];

    sqlRequest.on('row', (columns) => {
      const sqlDataType: any = columns[0].value;
      const sqlMaxLength: any = columns[1].value;
      result = {
        sqlDataType,
        sqlMaxLength
      };
      log.trace({ moduleName, methodName, table, columnName, sqlDataType, sqlMaxLength }, `row`);
      results.push(result);
    });

    sqlRequest.on('requestCompleted', (rowCount: any, more: any, rows: any) => {
      log.trace({ moduleName, methodName, table, rowCount }, `requestCompleted`);
      return resolve({ conn, tables, table, results });
    });

    conn.execSql(sqlRequest);
  });
}

async function checkForColumns(conn: any, tables: any, table: string): Promise<any> {
  const methodName: string = 'checkForColumns';
  log.trace({ moduleName, methodName, table }, 'start');
  const columns: any[] = tables[table].columns;
  for (let i = 0; i < columns.length; i++) {
    const tokens: string[] = columns[i].split(delimiter);
    const columnName: string = tokens[0].trim();
    const sqlDataType: string = tokens[1].trim();
    let sqlMaxLength: number = -1;
    const from: number = sqlDataType.indexOf('(');
    const thru: number = sqlDataType.indexOf(')');
    if (from > -1 && thru > from) {
      sqlMaxLength = Number(sqlDataType.slice(from + 1, thru));
    }

    let result: any;
    try {
      result = await checkForColumn(conn, tables, table, columnName);
    } catch (error) {
      log.error({ moduleName, methodName, error });
      return { conn: result.conn, tables: result.tables, table: result.table, error };
    }

    // Two things
    //  both are varchar and one is longer, longer wins
    //  one is varchar and the other is not, varchar wins
    if (result &&
        result.results[0] &&
        result.results[0].sqlDataType) {
      const existingType: string = result.results[0].sqlDataType.toUpperCase();
      const existingLength: number = result.results[0].sqlMaxLength;
      if (sqlDataType.indexOf('VARCHAR') === 0 &&
          existingType.indexOf('VARCHAR') === 0) {
        if (sqlMaxLength &&
            existingLength &&
            sqlMaxLength > existingLength) {
          columns[i] += `\talter`;
        } else {
          columns[i] += `\tOK`;
        }
      } else
      if (sqlDataType.indexOf('VARCHAR') === 0 &&
          existingType.indexOf('VARCHAR') === -1) {
        columns[i] += `\talter`;
      } else {
        columns[i] += `\tOK`;
      }
    } else {
      // It's a new column
      columns[i] += `\tadd`;
    }
    if (i === columns.length - 1) {
      return { conn: result.conn, tables: result.tables, table: result.table };
    }
  }
}

function checkForTable(conn: any, tables: any, table: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'checkForTable';
    log.trace({ moduleName, methodName, table }, 'start');
    const tableName: any = createTableName(tables, table);
    const results: any[] = [];

    const sqlStatement: string = `
      select count(1) occurs
      from   INFORMATION_SCHEMA.TABLES
      where  table_name = @table_name
      `;
    const sqlRequest = new tds.Request(
      sqlStatement,
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, table, tableName, sqlerr });
          return reject(sqlerr);
        } else {
          log.info({ moduleName, methodName, table, tableName }, `${rowCount} rows`);
        }
      });

    log.trace({ moduleName, methodName, table }, `Setting table_name to ${tableName}`);
    sqlRequest.addParameter('table_name', tds.TYPES.VarChar, tableName);

    log.trace({ moduleName, methodName, table, sqlStatement });

    sqlRequest.on('row', (columns) => {
      log.trace({ moduleName, methodName, table }, `row`);
      results.push({ occurs: columns[0].value });
    });

    sqlRequest.on('requestCompleted', (rowCount: any, more: any, rows: any) => {
      log.trace({ moduleName, methodName, table, rowCount }, `requestCompleted`);
      return resolve({ conn, tables, table, results });
    });

    conn.execSql(sqlRequest);
  });
}

function createPrimaryKeyScript(tables: any, table: any): string {
  const methodName: string = 'createPrimaryKeyScript';
  log.trace({ moduleName, methodName, table }, `start`);
  const tableName: any = createTableName(tables, table);
  let sql: string =
      `alter table ${tableName} add\n` +
      `constraint  ${tableName}_PK\n` +
      `primary key (\n`;
  if (tables[table].fkColumns &&
      tables[table].fkColumns.length > 0) {
    for (let i = tables[table].fkColumns.length - 1; i > -1; i--) {
      const column = tables[table].fkColumns[i];
      const tokens = column.split(delimiter);
      sql += `${tokens[0].trim()},\n`;
    }
  }
  sql += `${tables[table].tablePk} );\n\n`;

  return sql;
}

function createRevisionKeyScript(tables: any, table: any): string {
  const methodName: string = 'createRevisionKeyScript';
  log.trace({ moduleName, methodName, table }, `start`);
  let sql: string = '';
  let hasId: boolean = false;
  let hasRev: boolean = false;
  if (!tables[table].parentTable) {
    for (const column of tables[table].columns) {
      const tokens = column.split(delimiter);
      if (tokens[0].indexOf(`ID `) === 0) {
        hasId = true;
      } else
      if (tokens[0].indexOf(`REV `) === 0) {
        hasRev = true;
      }
    }
  }
  if (hasId && hasRev) {
    const tableName: any = createTableName(tables, table);
    sql += `alter table ${tableName} add\n`;
    sql += `constraint  ${tableName}_UK\n`;
    sql += `unique (\n`;
    sql += `ID,\n`;
    sql += `REV );\n\n`;
  }

  return sql;
}

export function createTableName(tables: any, table: any): string {
  let result: string = tables[table].table;
  let parent: string = tables[table].parentName;
  for ( ; ; ) {
    if (parent) {
      result = `${tables[parent].table}_${result}`;
    } else {
      break;
    }
    parent = tables[parent].parentName;
  }
  return result.slice(0, nameLimit - 3);
}

export function createTableScript(conn: any, tables: any, table: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'createTableScript';
    log.trace({ moduleName, methodName, table }, `start`);
    const tableName: any = createTableName(tables, table);
    let sql: string = `create table ${tableName} (\n`;
    for (const column of tables[table].columns) {
      const tokens = column.split(delimiter);
      sql += `${tokens[0]}  `;
      if (tokens[0].indexOf(`ID `) === 0 ||
          tokens[0].indexOf(`${arrayIndex} `) === 0) {
        sql += `${tokens[1]}  NOT NULL,\n`;
      } else {
        sql += `${tokens[1].trim()},\n`;
      }
    }
    for (const column of tables[table].fkColumns) {
      const tokens = column.split(delimiter);
      sql += `${tokens[0]}  ${tokens[1]}  NOT NULL,\n`;
    }
    sql = sql.slice(0, sql.length - 2);
    sql += ');\n\n';

    sql += createPrimaryKeyScript(tables, table);
    sql += createRevisionKeyScript(tables, table);

    if (sql) {
      try {
        const filename: string = `.${path.sep}db${path.sep}` +
          `${tableName.toLowerCase()}.${moment().format('YYYYMMDDHHmmss')}.tab`;
        fs.writeFileSync(filename, sql);
      } catch (err) {
        const error: any = inspect(err);
        log.error({ moduleName, methodName, sql, error });
      }
    }
    return resolve({ conn, tables, table, sql });
  });
}

export function createTables(tables: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'createTables';
    log.trace({ moduleName, methodName }, `start`);

    let results: string = '';
    const tableKeys: any[] = [];
    for (const table in tables) {
      if (tables.hasOwnProperty(table)) {
        log.trace({ moduleName, methodName, table }, '0');
        tableKeys.push(table);
      }
    }
    let count: number = 0;
    for (const table of tableKeys) {
      connect(tables, table).then((result) => {
        log.trace({ moduleName, methodName, table }, 'Step 1');
        return checkForTable(result.conn, result.tables, result.table);
      }).then((result) => {
        log.trace({ moduleName, methodName, table, results: result.results }, 'Step 2');
        if (result.results[0].occurs === 0) {
          return createTableScript(result.conn, result.tables, result.table);
        } else {
          return { conn: result.conn, tables: result.tables, table: result.table, sql: '' };
        }
      }).then((result) => {
        log.trace({ moduleName, methodName, table, results: result.sql }, 'Step 3');
        return executeDDL(result.conn, result.tables, result.table, result.sql);
      }).then((result) => {
        log.trace({ moduleName, methodName, table, results: result.results }, 'Step 4');
        results += `${inspect(result.results)}\n`;
        result.conn.close();
        if (++count === tableKeys.length) {
          resolve(results);
        }
      }).catch((error) => {
        log.error({ moduleName, methodName, table, error: inspect(error).slice(0, 2000) });
        if (++count === tableKeys.length) {
          resolve(results);
        }
      });
    }
  });
}

function executeDDL(conn: any, tables: any, table: any, sql: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'executeDDL';
    log.trace({ moduleName, methodName, table, sql }, `start`);

    const results: any[] = [];
    if (sql) {
      const sqlRequest = new tds.Request(
        sql,
        (sqlerr: any, rowCount: any) => {
          if (sqlerr) {
            log.error({ moduleName, methodName, table, sql, sqlerr});
            return reject(sqlerr);
          } else {
            log.info({ moduleName, methodName, table, sql }, `${rowCount} rows`);
          }
        });

      log.trace({ moduleName, methodName, table, sql});

      sqlRequest.on('row', (columns: any) => {
        log.trace({ moduleName, methodName, table, columns }, `row`);
        results.push({ value: columns[0].value });
      });

      sqlRequest.on('requestCompleted', (rowCount: any, more: any, rows: any) => {
        log.trace({ moduleName, methodName, table, results }, `requestCompleted`);
        return resolve({ conn, tables, table, results });
      });

      conn.execSql(sqlRequest);
    } else {
      resolve({ conn, tables, table, results });
    }
  });
}

export function initializeLogger(loggerLog: Logger): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'initializeLogger';
    log = loggerLog;
    log.trace({ moduleName, methodName }, `logger set up!`);
    resolve(true);
  });
}
