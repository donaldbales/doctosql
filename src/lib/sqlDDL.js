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
const tds = require("tedious");
const inspect_1 = require("./inspect");
// Sql Server Reserved Words
// https://docs.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-2017
const arrayIndex = 'AI';
const delimiter = `\t`;
const nameLimit = 128;
const moduleName = 'src/lib/sqlDDL.js';
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
                sql += `add ${columnName}`;
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
                sql += `alter column ${columnName}`;
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
            fs.writeFileSync(`./db/${tableName.toLowerCase()}.${moment().format('YYYYMMDDHHmmss')}.alt`, sql);
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
            fs.writeFileSync(`./db/${tableName.toLowerCase()}.${moment().format('YYYYMMDDHHmmss')}.tab`, sql);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRERMLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRERMLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOzs7Ozs7Ozs7O0FBS1oseUJBQXlCO0FBQ3pCLGlDQUFpQztBQUVqQywrQkFBK0I7QUFHL0IsdUNBQW9DO0FBRXBDLDRCQUE0QjtBQUM1QixtSEFBbUg7QUFFbkgsTUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDO0FBQ2hDLE1BQU0sU0FBUyxHQUFXLElBQUksQ0FBQztBQUMvQixNQUFNLFNBQVMsR0FBVyxHQUFHLENBQUM7QUFDOUIsTUFBTSxVQUFVLEdBQVcsbUJBQW1CLENBQUM7QUFFL0MsSUFBSSxHQUFXLENBQUM7QUFFaEIscUJBQTRCLE1BQVc7SUFDckMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxNQUFNLFVBQVUsR0FBVyxhQUFhLENBQUM7UUFDekMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMvQyxJQUFJLE9BQU8sR0FBVyxFQUFFLENBQUM7UUFDekIsTUFBTSxTQUFTLEdBQVUsRUFBRSxDQUFDO1FBQzVCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO1lBQzFCLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDaEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ2xELFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDdkI7U0FDRjtRQUNELElBQUksS0FBSyxHQUFXLENBQUMsQ0FBQztRQUN0QixLQUFLLE1BQU0sS0FBSyxJQUFJLFNBQVMsRUFBRTtZQUM3QixPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFD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