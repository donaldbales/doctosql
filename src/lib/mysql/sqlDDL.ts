// sqlServer

/* tslint:disable:no-console */

import Logger from 'bunyan';
import * as fs from 'fs';
import * as moment from 'moment';
import * as path from 'path';

import { inspect } from '../inspect';

// Sql Server Reserved Words
// https://docs.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-2017

const arrayIndex: string = 'AI';
const delimiter: string = `\t`;
const nameLimit: number = 128;
const moduleName: string = 'src/lib/sqlDDL.js';
const tmpdir: string = (process.env.TMPDIR as string) || `.${path.sep}db`;

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
        const filename: string = `${tmpdir}${path.sep}` +
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
  const mysql = require('mysql');
  return new Promise((resolve, reject) => {
    const rdbms: any = JSON.parse(process.env.DOCTOSQL_RDBMS as string);

    const conn = mysql.createConnection({
      connectTimeout: 1800000,
      database: rdbms.database,
      host: rdbms.server,
      password: rdbms.password,
      port: rdbms.port || 3306,
      user: rdbms.userName
    });

    conn.connect((err: any) => {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return reject(err);
      }

      console.log('connected as id ' + conn.threadId);
      return resolve({ conn, tables, table });
    });
  });
}

function checkForColumn(conn: any, tables: any, table: string, columnName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'checkForColumn';
    const results: any[] = [];
    log.trace({ moduleName, methodName, table, columnName }, 'start');
    const sqlStatement: string = `
      select data_type,
             case when character_maximum_length = -1 then 2147483647 else character_maximum_length end
      from   INFORMATION_SCHEMA.COLUMNS
      where  table_name = ?
      and    column_name = ?
      `;

    const tableName: any = createTableName(tables, table);
    log.trace({ moduleName, methodName, table }, `Setting table_name to ${tableName}`);
    const sqlRequest = conn.query(
      sqlStatement,
      [tableName, columnName],
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, table, columnName, sqlerr });
          return reject(sqlerr);
        } else {
          log.info({ moduleName, methodName, table, columnName }, `${rowCount} rows`);
          results.push({ occurs: rowCount });
          return resolve({ conn, tables, table, results });
        }
      }
    );

    log.trace({ moduleName, methodName, table, tableName, columnName, sqlStatement });
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
      where  table_name = ?
      `;

    log.trace({ moduleName, methodName, table }, `Setting table_name to ${tableName}`);
    const sqlRequest = conn.query(
      sqlStatement,
      [tableName],
      (sqlerr: any, rowCount: any) => {
        if (sqlerr) {
          log.error({ moduleName, methodName, table, tableName, sqlerr });
          return reject(sqlerr);
        } else {
          log.info({ moduleName, methodName, table, tableName }, `${rowCount[0].occurs} rows`);
          results.push({ occurs: rowCount[0].occurs });
          return resolve({ conn, tables, table, results });
        }
      }
    );

    log.trace({ moduleName, methodName, table, sqlStatement });
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
        const filename: string = `${tmpdir}${path.sep}` +
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
      const sqlRequest = conn.query(
        sql,
        (sqlerr: any, rowCount: any) => {
          if (sqlerr) {
            log.error({ moduleName, methodName, table, sql, sqlerr});
            return reject(sqlerr);
          } else {
            log.info({ moduleName, methodName, table, sql }, `${rowCount} rows`);
            results.push({ occurs: rowCount });
            return resolve({ conn, tables, table, results });
          }
        }
      );

      log.trace({ moduleName, methodName, table, sql});
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
