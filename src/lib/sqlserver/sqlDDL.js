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
const _ = require("lodash");
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
        const conn = new tds.Connection(connectionConfig);
        conn.on('connect', (err) => {
            if (err) {
                console.error(`***err=${inspect_1.inspect(err)}`);
                return reject(err);
            }
            return resolve({ conn, tables, table });
        });
        conn.on('error', (err) => {
            console.error(err);
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
        sqlRequest.on('requestCompleted', () => {
            log.trace({ moduleName, methodName, table }, `requestCompleted`);
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
        sqlRequest.on('requestCompleted', () => {
            log.trace({ moduleName, methodName, table }, `requestCompleted`);
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
            sqlRequest.on('requestCompleted', () => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRERMLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRERMLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOzs7Ozs7Ozs7Ozs7QUFJWiw0QkFBNEI7QUFDNUIseUJBQXlCO0FBQ3pCLGlDQUFpQztBQUNqQyw2QkFBNkI7QUFFN0IsK0JBQStCO0FBRy9CLHdDQUFxQztBQUVyQyw0QkFBNEI7QUFDNUIsbUhBQW1IO0FBRW5ILE1BQU0sVUFBVSxHQUFXLElBQUksQ0FBQztBQUNoQyxNQUFNLFNBQVMsR0FBVyxJQUFJLENBQUM7QUFDL0IsTUFBTSxTQUFTLEdBQVcsR0FBRyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFXLG1CQUFtQixDQUFDO0FBQy9DLE1BQU0sTUFBTSxHQUFZLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBaUIsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztBQUUxRSxJQUFJLEdBQVcsQ0FBQztBQUVoQixTQUFnQixXQUFXLENBQUMsTUFBVztJQUNyQyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFXLGFBQWEsQ0FBQztRQUN6QyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLElBQUksT0FBTyxHQUFXLEVBQUUsQ0FBQztRQUN6QixNQUFNLFNBQVMsR0FBVSxFQUFFLENBQUM7UUFDNUIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDMUIsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNoQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDbEQsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN2QjtTQUNGO1FBQ0QsSUFBSSxLQUFLLEdBQVcsQ0FBQyxDQUFDO1FBQ3RCLEtBQUssTUFBTSxLQUFLLElBQUksU0FBUyxFQUFFO1lBQzdCLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ3JDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUN2RCxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25FLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDdkQsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDdkQsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDdkQsT0FBTyxJQUFJLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxFQUFFLEtBQUssS0FBSyxTQUFTLENBQUMsTUFBTSxFQUFFO29CQUNoQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ2xCO1lBQ0gsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2pCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsaUJBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkYsSUFBSSxFQUFFLEtBQUssS0FBSyxTQUFTLENBQUMsTUFBTSxFQUFFO29CQUNoQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ2xCO1lBQ0gsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXRDRCxrQ0FzQ0M7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFTLEVBQUUsTUFBVyxFQUFFLEtBQVU7SUFDakUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxNQUFNLFVBQVUsR0FBVyxrQkFBa0IsQ0FBQztRQUM5QyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RCxNQUFNLFNBQVMsR0FBUSxlQUFlLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQztRQUNyQixNQUFNLE9BQU8sR0FBVSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQzdDLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO1lBQzVCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdkMsTUFBTSxVQUFVLEdBQVcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sV0FBVyxHQUFXLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLE1BQU0sR0FBVyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsSUFBSSxNQUFNLEtBQUssS0FBSyxFQUFFO2dCQUNwQixHQUFHLElBQUksZUFBZSxTQUFTLEtBQUssQ0FBQztnQkFDckMsR0FBRyxJQUFJLE9BQU8sVUFBVSxJQUFJLENBQUM7Z0JBQzdCLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO29CQUMvQixVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQzlDLEdBQUcsSUFBSSxHQUFHLFdBQVcsZUFBZSxDQUFDO2lCQUN0QztxQkFBTTtvQkFDTCxHQUFHLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztpQkFDbkM7YUFDRjtpQkFDRCxJQUFJLE1BQU0sS0FBSyxPQUFPLEVBQUU7Z0JBQ3RCLEdBQUcsSUFBSSxlQUFlLFNBQVMsS0FBSyxDQUFDO2dCQUNyQyxHQUFHLElBQUksZ0JBQWdCLFVBQVUsSUFBSSxDQUFDO2dCQUN0QyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztvQkFDL0IsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLFVBQVUsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUM5QyxHQUFHLElBQUksR0FBRyxXQUFXLGVBQWUsQ0FBQztpQkFDdEM7cUJBQU07b0JBQ0wsR0FBRyxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7aUJBQ25DO2FBQ0Y7U0FDRjtRQUNEOzs7OztVQUtFO1FBRUYsSUFBSSxHQUFHLEVBQUU7WUFDUCxJQUFJO2dCQUNGLE1BQU0sUUFBUSxHQUFXLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQzdDLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7Z0JBQ3hFLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ2pDO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ1osTUFBTSxLQUFLLEdBQVEsaUJBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDaEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7YUFDbkQ7U0FDRjtRQUNELE9BQU8sT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFwREQsNENBb0RDO0FBRUQsU0FBUyxPQUFPLENBQUMsTUFBVyxFQUFFLEtBQVU7SUFDdEMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUVyQyxJQUFJLEtBQVUsQ0FBQztRQUNmLElBQUk7WUFDRixvRUFBb0U7WUFDcEUsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUF5QixDQUFDLENBQUM7U0FDNUQ7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztTQUN4RDtRQUVELElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzNCLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0VBQW9FLENBQUMsQ0FBQztZQUNoRiw4Q0FBOEM7WUFDOUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqQjtRQUVELE1BQU0sUUFBUSxHQUFXLEtBQUssQ0FBQyxRQUFRLENBQUM7UUFDeEMsTUFBTSxRQUFRLEdBQVcsS0FBSyxDQUFDLFFBQVEsQ0FBQztRQUN4QyxNQUFNLE1BQU0sR0FBVyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQ3BDLE1BQU0sUUFBUSxHQUFXLEtBQUssQ0FBQyxRQUFRLENBQUM7UUFDeEMsTUFBTSxjQUFjLEdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxlQUFlO1FBQ3JFLE1BQU0sY0FBYyxHQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsa0JBQWtCO1FBQzFFLE1BQU0sSUFBSSxHQUFXLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRXpDLE1BQU0sZ0JBQWdCLEdBQXlCO1lBQzdDLGNBQWMsRUFBRTtnQkFDZCxPQUFPLEVBQUU7b0JBQ1AsUUFBUTtvQkFDUixRQUFRO2lCQUNUO2dCQUNELElBQUksRUFBRSxTQUFTO2FBQ2hCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLGNBQWM7Z0JBQ2QsUUFBUTtnQkFDUixrREFBa0Q7Z0JBQ2xELE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUk7Z0JBQ0osY0FBYzthQUNmO1lBQ0QsTUFBTTtTQUNQLENBQUM7UUFFRixNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUVsRCxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3pCLElBQUksR0FBRyxFQUFFO2dCQUNQLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxpQkFBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDcEI7WUFDRCxPQUFPLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDdkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLElBQVMsRUFBRSxNQUFXLEVBQUUsS0FBYSxFQUFFLFVBQWtCO0lBQy9FLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsTUFBTSxVQUFVLEdBQVcsZ0JBQWdCLENBQUM7UUFDNUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sWUFBWSxHQUFXOzs7Ozs7T0FNMUIsQ0FBQztRQUNKLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FDaEMsWUFBWSxFQUNaLENBQUMsTUFBVyxFQUFFLFFBQWEsRUFBRSxFQUFFO1lBQzdCLElBQUksTUFBTSxFQUFFO2dCQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDakUsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDdkI7aUJBQU07Z0JBQ0wsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFLEdBQUcsUUFBUSxPQUFPLENBQUMsQ0FBQzthQUM3RTtRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUwsTUFBTSxTQUFTLEdBQVEsZUFBZSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0RCxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSx5QkFBeUIsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUNuRixVQUFVLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNwRSxVQUFVLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUV0RSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRWxGLElBQUksTUFBVyxDQUFDO1FBQ2hCLE1BQU0sT0FBTyxHQUFVLEVBQUUsQ0FBQztRQUUxQixVQUFVLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQy9CLE1BQU0sV0FBVyxHQUFRLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDMUMsTUFBTSxZQUFZLEdBQVEsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUMzQyxNQUFNLEdBQUc7Z0JBQ1AsV0FBVztnQkFDWCxZQUFZO2FBQ2IsQ0FBQztZQUNGLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNGLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFFSCxVQUFVLENBQUMsRUFBRSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtZQUNyQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQ2pFLE9BQU8sT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBZSxlQUFlLENBQUMsSUFBUyxFQUFFLE1BQVcsRUFBRSxLQUFhOztRQUNsRSxNQUFNLFVBQVUsR0FBVyxpQkFBaUIsQ0FBQztRQUM3QyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RCxNQUFNLE9BQU8sR0FBVSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQzdDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sTUFBTSxHQUFhLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDckQsTUFBTSxVQUFVLEdBQVcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzVDLE1BQU0sV0FBVyxHQUFXLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QyxJQUFJLFlBQVksR0FBVyxDQUFDLENBQUMsQ0FBQztZQUM5QixNQUFNLElBQUksR0FBVyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sSUFBSSxHQUFXLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDOUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxHQUFHLElBQUksRUFBRTtnQkFDNUIsWUFBWSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUMxRDtZQUVELElBQUksTUFBVyxDQUFDO1lBQ2hCLElBQUk7Z0JBQ0YsTUFBTSxHQUFHLE1BQU0sY0FBYyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQ2hFO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2QsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDN0MsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO2FBQ2pGO1lBRUQsYUFBYTtZQUNiLG1EQUFtRDtZQUNuRCxxREFBcUQ7WUFDckQsSUFBSSxNQUFNO2dCQUNOLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNqQixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRTtnQkFDakMsTUFBTSxZQUFZLEdBQVcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3pFLE1BQU0sY0FBYyxHQUFXLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO2dCQUM5RCxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztvQkFDcEMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ3pDLElBQUksWUFBWTt3QkFDWixjQUFjO3dCQUNkLFlBQVksR0FBRyxjQUFjLEVBQUU7d0JBQ2pDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUM7cUJBQ3pCO3lCQUFNO3dCQUNMLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUM7cUJBQ3RCO2lCQUNGO3FCQUNELElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO29CQUNwQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO29CQUMxQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDO2lCQUN6QjtxQkFBTTtvQkFDTCxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDO2lCQUN0QjthQUNGO2lCQUFNO2dCQUNMLG9CQUFvQjtnQkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQzthQUN2QjtZQUNELElBQUksQ0FBQyxLQUFLLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUMxRTtTQUNGO0lBQ0gsQ0FBQztDQUFBO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBUyxFQUFFLE1BQVcsRUFBRSxLQUFhO0lBQzFELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsTUFBTSxVQUFVLEdBQVcsZUFBZSxDQUFDO1FBQzNDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELE1BQU0sU0FBUyxHQUFRLGVBQWUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsTUFBTSxPQUFPLEdBQVUsRUFBRSxDQUFDO1FBRTFCLE1BQU0sWUFBWSxHQUFXOzs7O09BSTFCLENBQUM7UUFDSixNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQ2hDLFlBQVksRUFDWixDQUFDLE1BQVcsRUFBRSxRQUFhLEVBQUUsRUFBRTtZQUM3QixJQUFJLE1BQU0sRUFBRTtnQkFDVixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ2hFLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3ZCO2lCQUFNO2dCQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRSxHQUFHLFFBQVEsT0FBTyxDQUFDLENBQUM7YUFDNUU7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVMLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLHlCQUF5QixTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ25GLFVBQVUsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXBFLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRTNELFVBQVUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDL0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDcEQsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUVILFVBQVUsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1lBQ3JDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDakUsT0FBTyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLE1BQVcsRUFBRSxLQUFVO0lBQ3JELE1BQU0sVUFBVSxHQUFXLHdCQUF3QixDQUFDO0lBQ3BELEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3RELE1BQU0sU0FBUyxHQUFRLGVBQWUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdEQsSUFBSSxHQUFHLEdBQ0gsZUFBZSxTQUFTLFFBQVE7UUFDaEMsZUFBZSxTQUFTLE9BQU87UUFDL0IsaUJBQWlCLENBQUM7SUFDdEIsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUztRQUN2QixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzVELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2QyxHQUFHLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztTQUNqQztLQUNGO0lBQ0QsR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sU0FBUyxDQUFDO0lBRXpDLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQUMsTUFBVyxFQUFFLEtBQVU7SUFDdEQsTUFBTSxVQUFVLEdBQVcseUJBQXlCLENBQUM7SUFDckQsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdEQsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDO0lBQ3JCLElBQUksS0FBSyxHQUFZLEtBQUssQ0FBQztJQUMzQixJQUFJLE1BQU0sR0FBWSxLQUFLLENBQUM7SUFDNUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLEVBQUU7UUFDOUIsS0FBSyxNQUFNLE1BQU0sSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFO1lBQzFDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdkMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDbEMsS0FBSyxHQUFHLElBQUksQ0FBQzthQUNkO2lCQUNELElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ25DLE1BQU0sR0FBRyxJQUFJLENBQUM7YUFDZjtTQUNGO0tBQ0Y7SUFDRCxJQUFJLEtBQUssSUFBSSxNQUFNLEVBQUU7UUFDbkIsTUFBTSxTQUFTLEdBQVEsZUFBZSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0RCxHQUFHLElBQUksZUFBZSxTQUFTLFFBQVEsQ0FBQztRQUN4QyxHQUFHLElBQUksZUFBZSxTQUFTLE9BQU8sQ0FBQztRQUN2QyxHQUFHLElBQUksWUFBWSxDQUFDO1FBQ3BCLEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDZixHQUFHLElBQUksWUFBWSxDQUFDO0tBQ3JCO0lBRUQsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQsU0FBZ0IsZUFBZSxDQUFDLE1BQVcsRUFBRSxLQUFVO0lBQ3JELElBQUksTUFBTSxHQUFXLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDekMsSUFBSSxNQUFNLEdBQVcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQztJQUM5QyxTQUFZO1FBQ1YsSUFBSSxNQUFNLEVBQUU7WUFDVixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1NBQzlDO2FBQU07WUFDTCxNQUFNO1NBQ1A7UUFDRCxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQztLQUNwQztJQUNELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFaRCwwQ0FZQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLElBQVMsRUFBRSxNQUFXLEVBQUUsS0FBVTtJQUNsRSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFXLG1CQUFtQixDQUFDO1FBQy9DLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RELE1BQU0sU0FBUyxHQUFRLGVBQWUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsSUFBSSxHQUFHLEdBQVcsZ0JBQWdCLFNBQVMsTUFBTSxDQUFDO1FBQ2xELEtBQUssTUFBTSxNQUFNLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRTtZQUMxQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZDLEdBQUcsSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3hCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO2dCQUM5QixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzdDLEdBQUcsSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNMLEdBQUcsSUFBSSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO2FBQ2pDO1NBQ0Y7UUFDRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLEVBQUU7WUFDNUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2QyxHQUFHLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUM7U0FDbEQ7UUFDRCxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNuQyxHQUFHLElBQUksUUFBUSxDQUFDO1FBRWhCLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0MsR0FBRyxJQUFJLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU5QyxJQUFJLEdBQUcsRUFBRTtZQUNQLElBQUk7Z0JBQ0YsTUFBTSxRQUFRLEdBQVcsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDN0MsR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztnQkFDeEUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDakM7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDWixNQUFNLEtBQUssR0FBUSxpQkFBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQzthQUNuRDtTQUNGO1FBQ0QsT0FBTyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQy9DLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXRDRCw4Q0FzQ0M7QUFFRCxTQUFnQixZQUFZLENBQUMsTUFBVztJQUN0QyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFXLGNBQWMsQ0FBQztRQUMxQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRS9DLElBQUksT0FBTyxHQUFXLEVBQUUsQ0FBQztRQUN6QixNQUFNLFNBQVMsR0FBVSxFQUFFLENBQUM7UUFDNUIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDMUIsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNoQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDbEQsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN2QjtTQUNGO1FBQ0QsSUFBSSxLQUFLLEdBQVcsQ0FBQyxDQUFDO1FBQ3RCLEtBQUssTUFBTSxLQUFLLElBQUksU0FBUyxFQUFFO1lBQzdCLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ3JDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUN2RCxPQUFPLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqQixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDaEYsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7b0JBQ2xDLE9BQU8saUJBQWlCLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDcEU7cUJBQU07b0JBQ0wsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQztpQkFDbkY7WUFDSCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDakIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzVFLE9BQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDakIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ2hGLE9BQU8sSUFBSSxHQUFHLGlCQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3BCLElBQUksRUFBRSxLQUFLLEtBQUssU0FBUyxDQUFDLE1BQU0sRUFBRTtvQkFDaEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUNsQjtZQUNILENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNqQixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGlCQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ25GLElBQUksRUFBRSxLQUFLLEtBQUssU0FBUyxDQUFDLE1BQU0sRUFBRTtvQkFDaEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUNsQjtZQUNILENBQUMsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUEzQ0Qsb0NBMkNDO0FBRUQsU0FBUyxVQUFVLENBQUMsSUFBUyxFQUFFLE1BQVcsRUFBRSxLQUFVLEVBQUUsR0FBVztJQUNqRSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFXLFlBQVksQ0FBQztRQUN4QyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFM0QsTUFBTSxPQUFPLEdBQVUsRUFBRSxDQUFDO1FBQzFCLElBQUksR0FBRyxFQUFFO1lBQ1AsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUNoQyxHQUFHLEVBQ0gsQ0FBQyxNQUFXLEVBQUUsUUFBYSxFQUFFLEVBQUU7Z0JBQzdCLElBQUksTUFBTSxFQUFFO29CQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztvQkFDMUQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7aUJBQ3ZCO3FCQUFNO29CQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLFFBQVEsT0FBTyxDQUFDLENBQUM7aUJBQ3RFO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFTCxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUVsRCxVQUFVLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQVksRUFBRSxFQUFFO2dCQUNwQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzdELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDNUMsQ0FBQyxDQUFDLENBQUM7WUFFSCxVQUFVLENBQUMsRUFBRSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtnQkFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBQzFFLE9BQU8sT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNuRCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDMUI7YUFBTTtZQUNMLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7U0FDM0M7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxTQUFpQjtJQUNoRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFXLGtCQUFrQixDQUFDO1FBQzlDLEdBQUcsR0FBRyxTQUFTLENBQUM7UUFDaEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFQRCw0Q0FPQyJ9