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
const tds = require("tedious");
const inspect_1 = require("./inspect");
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
    return new Promise((resolve, reject) => {
        const rdbms = JSON.parse(process.env.DOCTOSQL_RDBMS);
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
                console.error(`***err=${inspect_1.inspect(err)}`);
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
function checkForColumn(conn, tables, table, columnName) {
    return new Promise((resolve, reject) => {
        const methodName = 'checkForColumn';
        log.trace({ moduleName, methodName, table, columnName }, 'start');
        const sqlStatement = `
      select data_type,
             case when character_maximum_length = -1 then 2147483647 else character_maximum_length end
      from   INFORMATION_SCHEMA.COLUMNS
      where  table_name = @table_name
      and    column_name = @column_name
      `;
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, table, columnName, sqlerr });
                return reject(sqlerr);
            }
            else {
                log.info({ moduleName, methodName, table, columnName }, `${rowCount} rows`);
            }
        });
        const tableName = createTableName(tables, table);
        log.trace({ moduleName, methodName, table }, `Setting table_name to ${tableName}`);
        sqlRequest.addParameter('table_name', tds.TYPES.VarChar, tableName);
        sqlRequest.addParameter('column_name', tds.TYPES.VarChar, columnName);
        log.trace({ moduleName, methodName, table, tableName, columnName, sqlStatement });
        let result;
        const results = [];
        sqlRequest.on('row', (columns) => {
            const sqlDataType = columns[0].value;
            const sqlMaxLength = columns[1].value;
            result = {
                sqlDataType,
                sqlMaxLength
            };
            log.trace({ moduleName, methodName, table, columnName, sqlDataType, sqlMaxLength }, `row`);
            results.push(result);
        });
        sqlRequest.on('requestCompleted', (rowCount, more, rows) => {
            log.trace({ moduleName, methodName, table, rowCount }, `requestCompleted`);
            return resolve({ conn, tables, table, results });
        });
        conn.execSql(sqlRequest);
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
      where  table_name = @table_name
      `;
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, table, tableName, sqlerr });
                return reject(sqlerr);
            }
            else {
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
        sqlRequest.on('requestCompleted', (rowCount, more, rows) => {
            log.trace({ moduleName, methodName, table, rowCount }, `requestCompleted`);
            return resolve({ conn, tables, table, results });
        });
        conn.execSql(sqlRequest);
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
            const sqlRequest = new tds.Request(sql, (sqlerr, rowCount) => {
                if (sqlerr) {
                    log.error({ moduleName, methodName, table, sql, sqlerr });
                    return reject(sqlerr);
                }
                else {
                    log.info({ moduleName, methodName, table, sql }, `${rowCount} rows`);
                }
            });
            log.trace({ moduleName, methodName, table, sql });
            sqlRequest.on('row', (columns) => {
                log.trace({ moduleName, methodName, table, columns }, `row`);
                results.push({ value: columns[0].value });
            });
            sqlRequest.on('requestCompleted', (rowCount, more, rows) => {
                log.trace({ moduleName, methodName, table, results }, `requestCompleted`);
                return resolve({ conn, tables, table, results });
            });
            conn.execSql(sqlRequest);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRERMLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRERMLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOzs7Ozs7Ozs7O0FBS1oseUJBQXlCO0FBQ3pCLGlDQUFpQztBQUNqQyw2QkFBNkI7QUFFN0IsK0JBQStCO0FBRy9CLHVDQUFvQztBQUVwQyw0QkFBNEI7QUFDNUIsbUhBQW1IO0FBRW5ILE1BQU0sVUFBVSxHQUFXLElBQUksQ0FBQztBQUNoQyxNQUFNLFNBQVMsR0FBVyxJQUFJLENBQUM7QUFDL0IsTUFBTSxTQUFTLEdBQVcsR0FBRyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFXLG1CQUFtQixDQUFDO0FBQy9DLE1BQU0sTUFBTSxHQUFZLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBaUIsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztBQUUxRSxJQUFJLEdBQVcsQ0FBQztBQUVoQixxQkFBNEIsTUFBVztJQUNyQyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFXLGFBQWEsQ0FBQztRQUN6QyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLElBQUksT0FBTyxHQUFXLEVBQUUsQ0FBQztRQUN6QixNQUFNLFNBQVMsR0FBVSxFQUFFLENBQUM7UUFDNUIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDMUIsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNoQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDbEQsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN2QjtTQUNGO1FBQ0QsSUFBSSxL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