"use strict";
// sqlServer
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
exports.initializeLogger = exports.createTables = exports.createTableScript = exports.createTableName = exports.alterTableScript = exports.alterTables = void 0;
const fs = require("fs");
const moment = require("moment");
const path = require("path");
const tds = require("tedious");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRERMLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRERMLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOzs7Ozs7Ozs7Ozs7QUFLWix5QkFBeUI7QUFDekIsaUNBQWlDO0FBQ2pDLDZCQUE2QjtBQUM3QiwrQkFBK0I7QUFFL0Isd0NBQXFDO0FBRXJDLDRCQUE0QjtBQUM1QixtSEFBbUg7QUFFbkgsTUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDO0FBQ2hDLE1BQU0sU0FBUyxHQUFXLElBQUksQ0FBQztBQUMvQixNQUFNLFNBQVMsR0FBVyxHQUFHLENBQUM7QUFDOUIsTUFBTSxVQUFVLEdBQVcsbUJBQW1CLENBQUM7QUFDL0MsTUFBTSxNQUFNLEdBQVksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFpQixJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBRTFFLElBQUksR0FBVyxDQUFDO0FBRWhCLFNBQWdCLFdBQVcsQ0FBQyxNQUFXO0lBQ3JDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsTUFBTSxVQUFVLEdBQVcsYUFBYSxDQUFDO1FBQ3pDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0MsSUFBSSxPQUFPLEdBQVcsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sU0FBUyxHQUFVLEVBQUUsQ0FBQztRQUM1QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUMxQixJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2hDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNsRCxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3ZCO1NBQ0Y7UUFDRCxJQUFJLEtBQUssR0FBVyxDQUFDLENBQUM7UUFDdEIsS0FBSyxNQUFNLEtBQUssSUFBSSxTQUFTLEVBQUU7WUFDN0IsT0FBTyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZELE9BQU8sZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUN2RCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUN2RCxPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFD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