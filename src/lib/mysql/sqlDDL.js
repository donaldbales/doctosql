"use strict";
// sqlServer
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const moment = require("moment");
const path = require("path");
const inspect_1 = require("../inspect");
// Sql Server Reserved Words
// https://docs.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-2017
const arrayIndex = 'AI';
const delimiter = `\t`;
const nameLimit = 128;
const moduleName = 'src/lib/sqlDDL.js';
const tmpdir = process.env.TMPDIR || `.${path.sep}db`;
let log;
function alterTables(tables) {
    return new Promise((resolve, reject) => {
        const methodName = 'alterTables';
        log.trace({ moduleName, methodName }, `start`);
        let results = '';
        const tableKeys = [];
        for (const table in tables) {
            if (tables.hasOwnProperty(table)) {
                log.trace({ moduleName, methodName, table }, '0');
                tableKeys.push(table);
            }
        }
        let count = 0;
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
                results += `${inspect_1.inspect(result.results)}\n`;
                result.conn.close();
                if (++count === tableKeys.length) {
                    resolve(results);
                }
            }).catch((error) => {
                log.error({ moduleName, methodName, table, error: inspect_1.inspect(error).slice(0, 2000) });
                if (++count === tableKeys.length) {
                    resolve(results);
                }
            });
        }
    });
}
exports.alterTables = alterTables;
function alterTableScript(conn, tables, table) {
    return new Promise((resolve, reject) => {
        const methodName = 'alterTableScript';
        log.trace({ moduleName, methodName, table }, `start`);
        const tableName = createTableName(tables, table);
        let sql = '';
        const columns = tables[table].columns;
        for (const column of columns) {
            const tokens = column.split(delimiter);
            const columnName = tokens[0];
            const sqlDataType = tokens[1];
            const action = tokens[4];
            if (action === 'add') {
                sql += `alter table ${tableName} \n`;
                sql += `add ${columnName}  `;
                if (columnName.indexOf(`ID `) === 0 ||
                    columnName.indexOf(`${arrayIndex} `) === 0) {
                    sql += `${sqlDataType}  NOT NULL;\n`;
                }
                else {
                    sql += `${sqlDataType.trim()};\n`;
                }
            }
            else if (action === 'alter') {
                sql += `alter table ${tableName} \n`;
                sql += `alter column ${columnName}  `;
                if (columnName.indexOf(`ID `) === 0 ||
                    columnName.indexOf(`${arrayIndex} `) === 0) {
                    sql += `${sqlDataType}  NOT NULL;\n`;
                }
                else {
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
                const filename = `${tmpdir}${path.sep}` +
                    `${tableName.toLowerCase()}.${moment().format('YYYYMMDDHHmmss')}.alt`;
                fs.writeFileSync(filename, sql);
            }
            catch (err) {
                const error = inspect_1.inspect(err);
                log.error({ moduleName, methodName, sql, error });
            }
        }
        return resolve({ conn, tables, table, sql });
    });
}
exports.alterTableScript = alterTableScript;
function connect(tables, table) {
    const mysql = require('mysql');
    return new Promise((resolve, reject) => {
        const rdbms = JSON.parse(process.env.DOCTOSQL_RDBMS);
        const conn = mysql.createConnection({
            connectTimeout: 1800000,
            database: rdbms.database,
            host: rdbms.server,
            password: rdbms.password,
            port: rdbms.port || 3306,
            user: rdbms.userName
        });
        conn.connect((err) => {
            if (err) {
                console.error('error connecting: ' + err.stack);
                return reject(err);
            }
            console.log('connected as id ' + conn.threadId);
            return resolve({ conn, tables, table });
        });
    });
}
function checkForColumn(conn, tables, table, columnName) {
    return new Promise((resolve, reject) => {
        const methodName = 'checkForColumn';
        log.trace({ moduleName, methodName, table, columnName }, 'start');
        const sqlStatement = `
      select data_type,
             case when character_maximum_length = -1 then 2147483647 else character_maximum_length end
      from   INFORMATION_SCHEMA.COLUMNS
      where  table_name = ?
      and    column_name = ?
      `;
        const tableName = createTableName(tables, table);
        log.trace({ moduleName, methodName, table }, `Setting table_name to ${tableName}`);
        const sqlRequest = conn.query(sqlStatement, [tableName, columnName], (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, table, columnName, sqlerr });
                return reject(sqlerr);
            }
            else {
                log.info({ moduleName, methodName, table, columnName }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, table, tableName, columnName, sqlStatement });
        let result;
        const results = [];
        sqlRequest.on('fields', (columns) => {
            const sqlDataType = columns[0].value;
            const sqlMaxLength = columns[1].value;
            result = {
                sqlDataType,
                sqlMaxLength
            };
            log.trace({ moduleName, methodName, table, columnName, sqlDataType, sqlMaxLength }, `row`);
            results.push(result);
        });
        sqlRequest.on('result', (rowCount, more, rows) => {
            log.trace({ moduleName, methodName, table, rowCount }, `requestCompleted`);
            return resolve({ conn, tables, table, results });
        });
    });
}
function checkForColumns(conn, tables, table) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = 'checkForColumns';
        log.trace({ moduleName, methodName, table }, 'start');
        const columns = tables[table].columns;
        for (let i = 0; i < columns.length; i++) {
            const tokens = columns[i].split(delimiter);
            const columnName = tokens[0].trim();
            const sqlDataType = tokens[1].trim();
            let sqlMaxLength = -1;
            const from = sqlDataType.indexOf('(');
            const thru = sqlDataType.indexOf(')');
            if (from > -1 && thru > from) {
                sqlMaxLength = Number(sqlDataType.slice(from + 1, thru));
            }
            let result;
            try {
                result = yield checkForColumn(conn, tables, table, columnName);
            }
            catch (error) {
                log.error({ moduleName, methodName, error });
                return { conn: result.conn, tables: result.tables, table: result.table, error };
            }
            // Two things
            //  both are varchar and one is longer, longer wins
            //  one is varchar and the other is not, varchar wins
            if (result &&
                result.results[0] &&
                result.results[0].sqlDataType) {
                const existingType = result.results[0].sqlDataType.toUpperCase();
                const existingLength = result.results[0].sqlMaxLength;
                if (sqlDataType.indexOf('VARCHAR') === 0 &&
                    existingType.indexOf('VARCHAR') === 0) {
                    if (sqlMaxLength &&
                        existingLength &&
                        sqlMaxLength > existingLength) {
                        columns[i] += `\talter`;
                    }
                    else {
                        columns[i] += `\tOK`;
                    }
                }
                else if (sqlDataType.indexOf('VARCHAR') === 0 &&
                    existingType.indexOf('VARCHAR') === -1) {
                    columns[i] += `\talter`;
                }
                else {
                    columns[i] += `\tOK`;
                }
            }
            else {
                // It's a new column
                columns[i] += `\tadd`;
            }
            if (i === columns.length - 1) {
                return { conn: result.conn, tables: result.tables, table: result.table };
            }
        }
    });
}
function checkForTable(conn, tables, table) {
    return new Promise((resolve, reject) => {
        const methodName = 'checkForTable';
        log.trace({ moduleName, methodName, table }, 'start');
        const tableName = createTableName(tables, table);
        const results = [];
        const sqlStatement = `
      select count(1) occurs
      from   INFORMATION_SCHEMA.TABLES
      where  table_name = ?
      `;
        log.trace({ moduleName, methodName, table }, `Setting table_name to ${tableName}`);
        const sqlRequest = conn.query(sqlStatement, [tableName], (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, table, tableName, sqlerr });
                return reject(sqlerr);
            }
            else {
                log.info({ moduleName, methodName, table, tableName }, `${rowCount[0].occurs} rows`);
                results.push({ occurs: rowCount[0].occurs });
                return resolve({ conn, tables, table, results });
            }
        });
        log.trace({ moduleName, methodName, table, sqlStatement });
    });
}
function createPrimaryKeyScript(tables, table) {
    const methodName = 'createPrimaryKeyScript';
    log.trace({ moduleName, methodName, table }, `start`);
    const tableName = createTableName(tables, table);
    let sql = `alter table ${tableName} add\n` +
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
function createRevisionKeyScript(tables, table) {
    const methodName = 'createRevisionKeyScript';
    log.trace({ moduleName, methodName, table }, `start`);
    let sql = '';
    let hasId = false;
    let hasRev = false;
    if (!tables[table].parentTable) {
        for (const column of tables[table].columns) {
            const tokens = column.split(delimiter);
            if (tokens[0].indexOf(`ID `) === 0) {
                hasId = true;
            }
            else if (tokens[0].indexOf(`REV `) === 0) {
                hasRev = true;
            }
        }
    }
    if (hasId && hasRev) {
        const tableName = createTableName(tables, table);
        sql += `alter table ${tableName} add\n`;
        sql += `constraint  ${tableName}_UK\n`;
        sql += `unique (\n`;
        sql += `ID,\n`;
        sql += `REV );\n\n`;
    }
    return sql;
}
function createTableName(tables, table) {
    let result = tables[table].table;
    let parent = tables[table].parentName;
    for (;;) {
        if (parent) {
            result = `${tables[parent].table}_${result}`;
        }
        else {
            break;
        }
        parent = tables[parent].parentName;
    }
    return result.slice(0, nameLimit - 3);
}
exports.createTableName = createTableName;
function createTableScript(conn, tables, table) {
    return new Promise((resolve, reject) => {
        const methodName = 'createTableScript';
        log.trace({ moduleName, methodName, table }, `start`);
        const tableName = createTableName(tables, table);
        let sql = `create table ${tableName} (\n`;
        for (const column of tables[table].columns) {
            const tokens = column.split(delimiter);
            sql += `${tokens[0]}  `;
            if (tokens[0].indexOf(`ID `) === 0 ||
                tokens[0].indexOf(`${arrayIndex} `) === 0) {
                sql += `${tokens[1]}  NOT NULL,\n`;
            }
            else {
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
                const filename = `${tmpdir}${path.sep}` +
                    `${tableName.toLowerCase()}.${moment().format('YYYYMMDDHHmmss')}.tab`;
                fs.writeFileSync(filename, sql);
            }
            catch (err) {
                const error = inspect_1.inspect(err);
                log.error({ moduleName, methodName, sql, error });
            }
        }
        return resolve({ conn, tables, table, sql });
    });
}
exports.createTableScript = createTableScript;
function createTables(tables) {
    return new Promise((resolve, reject) => {
        const methodName = 'createTables';
        log.trace({ moduleName, methodName }, `start`);
        let results = '';
        const tableKeys = [];
        for (const table in tables) {
            if (tables.hasOwnProperty(table)) {
                log.trace({ moduleName, methodName, table }, '0');
                tableKeys.push(table);
            }
        }
        let count = 0;
        for (const table of tableKeys) {
            connect(tables, table).then((result) => {
                log.trace({ moduleName, methodName, table }, 'Step 1');
                return checkForTable(result.conn, result.tables, result.table);
            }).then((result) => {
                log.trace({ moduleName, methodName, table, results: result.results }, 'Step 2');
                if (result.results[0].occurs === 0) {
                    return createTableScript(result.conn, result.tables, result.table);
                }
                else {
                    return { conn: result.conn, tables: result.tables, table: result.table, sql: '' };
                }
            }).then((result) => {
                log.trace({ moduleName, methodName, table, results: result.sql }, 'Step 3');
                return executeDDL(result.conn, result.tables, result.table, result.sql);
            }).then((result) => {
                log.trace({ moduleName, methodName, table, results: result.results }, 'Step 4');
                results += `${inspect_1.inspect(result.results)}\n`;
                result.conn.close();
                if (++count === tableKeys.length) {
                    resolve(results);
                }
            }).catch((error) => {
                log.error({ moduleName, methodName, table, error: inspect_1.inspect(error).slice(0, 2000) });
                if (++count === tableKeys.length) {
                    resolve(results);
                }
            });
        }
    });
}
exports.createTables = createTables;
function executeDDL(conn, tables, table, sql) {
    return new Promise((resolve, reject) => {
        const methodName = 'executeDDL';
        log.trace({ moduleName, methodName, table, sql }, `start`);
        const results = [];
        if (sql) {
            const sqlRequest = conn.query(sql, (sqlerr, rowCount) => {
                if (sqlerr) {
                    log.error({ moduleName, methodName, table, sql, sqlerr });
                    return reject(sqlerr);
                }
                else {
                    log.info({ moduleName, methodName, table, sql }, `${rowCount} rows`);
                }
            });
            log.trace({ moduleName, methodName, table, sql });
            sqlRequest.on('fields', (columns) => {
                log.trace({ moduleName, methodName, table, columns }, `row`);
                results.push({ value: columns[0].value });
            });
            sqlRequest.on('result', (rowCount, more, rows) => {
                log.trace({ moduleName, methodName, table, results }, `requestCompleted`);
                return resolve({ conn, tables, table, results });
            });
        }
        else {
            resolve({ conn, tables, table, results });
        }
    });
}
function initializeLogger(loggerLog) {
    return new Promise((resolve, reject) => {
        const methodName = 'initializeLogger';
        log = loggerLog;
        log.trace({ moduleName, methodName }, `logger set up!`);
        resolve(true);
    });
}
exports.initializeLogger = initializeLogger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRERMLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRERMLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOzs7Ozs7Ozs7O0FBS1oseUJBQXlCO0FBQ3pCLGlDQUFpQztBQUNqQyw2QkFBNkI7QUFFN0Isd0NBQXFDO0FBRXJDLDRCQUE0QjtBQUM1QixtSEFBbUg7QUFFbkgsTUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDO0FBQ2hDLE1BQU0sU0FBUyxHQUFXLElBQUksQ0FBQztBQUMvQixNQUFNLFNBQVMsR0FBVyxHQUFHLENBQUM7QUFDOUIsTUFBTSxVQUFVLEdBQVcsbUJBQW1CLENBQUM7QUFDL0MsTUFBTSxNQUFNLEdBQVksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFpQixJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBRTFFLElBQUksR0FBVyxDQUFDO0FBRWhCLHFCQUE0QixNQUFXO0lBQ3JDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsTUFBTSxVQUFVLEdBQVcsYUFBYSxDQUFDO1FBQ3pDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0MsSUFBSSxPQUFPLEdBQVcsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sU0FBUyxHQUFVLEVBQUUsQ0FBQztRQUM1QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUMxQixJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2hDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNsRCxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3ZCO1NBQ0Y7UUFDRCxJQUFJLEtBQUssR0FBVyxDQUFD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