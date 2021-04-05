"use strict";
// mysql
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
exports.mergeDocs = exports.mergeDoc = exports.initializeLogger = exports.initializeRevisions = void 0;
const _ = require("lodash");
const moment = require("moment");
const inspect_1 = require("../inspect");
const Database_1 = require("./Database");
const sqlDDL_1 = require("./sqlDDL");
// Sql Server Reserved Words
// https://docs.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-2017
const arrayIndex = 'AI';
const delimiter = `\t`;
const nameLimit = 128;
const moduleName = 'src/lib/sqlDML.js';
let pool;
let log;
let revisions = new Map();
let revisionsTable = '';
function initializeRevisions(tables) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = 'initializeRevisions';
        log.trace({ moduleName, methodName }, `start`);
        let table = '';
        for (table in tables) {
            if (!tables[table].parentName) {
                revisionsTable = table;
                break;
            }
        }
        yield pool.connection.then((conn) => {
            log.trace({ moduleName, methodName, table }, 'Step 1');
            return checkForRevisions(conn, tables, table);
        }).then((results) => {
            log.trace({ moduleName, methodName, table }, 'Step 2');
            revisions = new Map(results.results);
            return results.conn.release();
        }).catch((error) => {
            log.error({ moduleName, methodName, table, error: inspect_1.inspect(error).slice(0, 2000) });
        });
    });
}
exports.initializeRevisions = initializeRevisions;
function checkForRevisions(conn, tables, table) {
    // Note: This is never called in the MySQL case....
    return new Promise((resolve, reject) => {
        const methodName = 'checkForRevisions';
        log.trace({ moduleName, methodName, table }, 'start');
        const tableName = sqlDDL_1.createTableName(tables, table);
        const sqlStatement = `
      select ID,
             REV
      from   ${tableName}
      order by ID
      `;
        log.trace({ moduleName, methodName, table, tableName, sqlStatement });
        const results = [];
        const sqlRequest = conn.query(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, table, sqlerr });
                return reject(sqlerr);
            }
            else {
                log.info({ moduleName, methodName, table }, `${rowCount.length} rows`);
                for (const row of rowCount) {
                    results.push({
                        id: row.ID,
                        rev: row.REV
                    });
                }
                return resolve({ conn, tables, table, results });
            }
        });
    });
}
function initializeLogger(loggerLog) {
    return new Promise((resolve, reject) => {
        const methodName = 'initializeLogger';
        log = loggerLog;
        // for now, throw connection pool in here.
        let connection;
        try {
            // grab the environment variable with the database connection string
            connection = JSON.parse(process.env.DOCTOSQL_RDBMS);
        }
        catch (e) {
            log.fatal('DOCTOSQL_RDBMS is not a valid JSON string');
        }
        if (!_.isPlainObject(connection)) {
            log.fatal('Invalid database connection string.  Check value of DOCTOSQL_RDBMS');
            // App cannot start without a database, so die
            process.exit(1);
        }
        const thirtyMinutes = 30 * 60 * 1000;
        // Global instances
        pool = new Database_1.default({
            options: {
                connectTimeout: thirtyMinutes,
                database: connection.database,
                encrypt: true,
                port: connection.port || 1433,
                readOnlyIntent: false,
                requestTimeout: thirtyMinutes,
                rowCollectionOnRequestCompletion: false,
                useColumnNames: false
            },
            password: connection.password,
            server: connection.server,
            userName: connection.userName
        });
        log.trace({ moduleName, methodName }, `logger set up!`);
        resolve(true);
    });
}
exports.initializeLogger = initializeLogger;
function mergeRow(conn, tables, table, doc, parentJsonKey, evented = false) {
    return new Promise((resolve, reject) => {
        const methodName = 'mergeRow';
        log.trace({ moduleName, methodName, table, doc, parentJsonKey }, 'start');
        const id = doc._id || doc.id;
        const tableName = sqlDDL_1.createTableName(tables, table);
        let sqlStatement = `insert into ${tableName} (`;
        let columnList = '';
        let valuesList = '';
        let setList = '';
        for (const column of tables[table].columns) {
            const tokens = column.split(delimiter);
            const columnName = tokens[0].trim();
            columnList += `${columnName}, `;
            valuesList += '?, ';
            setList += `${columnName} = ?, `;
        }
        for (const column of tables[table].fkColumns) {
            const tokens = column.split(delimiter);
            const columnName = tokens[0].trim();
            columnList += `${columnName}, `;
            valuesList += '?, ';
            setList += `${columnName} = ?, `;
        }
        columnList = `${columnList.slice(0, columnList.length - 2)}`;
        valuesList = `${valuesList.slice(0, valuesList.length - 2)}`;
        setList = `${setList.slice(0, setList.length - 2)}`;
        sqlStatement += `${columnList}) values (${valuesList}) on duplicate key update ${setList}`;
        const params = [];
        for (const column of tables[table].columns) {
            const tokens = column.split(delimiter);
            const sqlName = tokens[0].trim();
            const sqlType = tokens[1].trim();
            const lastIndexOfDot = tokens[2].lastIndexOf('.');
            let jsonKey = tokens[2];
            if (lastIndexOfDot > -1) {
                jsonKey = tokens[2].slice(lastIndexOfDot + 1, tokens[2].length);
            }
            if (parentJsonKey) {
                jsonKey = `${parentJsonKey}.${jsonKey}`;
            }
            const dataType = tokens[3];
            let precision;
            precision = 36;
            let scale;
            scale = 17;
            let value;
            try {
                value = resolveValue(jsonKey, doc);
                const tov = typeof (value);
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
                }
                else if (dataType === 'int') {
                    if (!isNaN(value)) {
                        value = Number(value);
                    }
                    else {
                        value = null;
                    }
                }
                else if (dataType === 'number') {
                    if (!isNaN(value)) {
                        // don't mess with the value
                    }
                    else {
                        value = null;
                        // tdsType = tds.TYPES.Null;
                    }
                }
                else if (dataType === 'date') {
                    const parsed = moment(value);
                    if (parsed && parsed.isValid()) {
                        value = parsed.toDate();
                    }
                    else {
                        value = null;
                    }
                }
                else if (dataType === 'boolean') {
                    if (value === false || value === 'false' || value === 0) {
                        value = 0;
                    }
                    else if (value === true || value === 'true' || value === 1) {
                        value = 1;
                    }
                    else {
                        value = null;
                    }
                }
                else if (dataType === 'string') {
                    if (!value) {
                        value = null;
                    }
                }
                else {
                    value = null;
                }
            }
            catch (conversionError) {
                log.error({ moduleName, methodName, table, column: sqlName, jsonKey, conversionError });
            }
            log.trace({ moduleName, methodName, table, column: sqlName, jsonKey, value });
            params.push(value);
        }
        for (const column of tables[table].fkColumns) {
            const tokens = column.split(delimiter);
            const sqlName = tokens[0].trim();
            const sqlType = tokens[1].trim();
            let jsonKey = tokens[2];
            const childParts = jsonKey.split('.');
            const childPart = childParts[childParts.length - 1];
            const parentParts = parentJsonKey.split('.');
            let parentPart = '';
            if (childParts.length === 2) {
                jsonKey = childPart;
            }
            else if (childParts.length > 2) {
                parentPart = childParts[childParts.length - 2];
                let childInParent = -1;
                for (let i = parentParts.length - 1; i > -1; i--) {
                    if (parentParts[i] === parentPart) {
                        childInParent = i;
                        break;
                    }
                }
                if (childInParent < parentParts.length - 1 &&
                    parentParts[childInParent + 1] &&
                    !Number.isNaN(Number(parentParts[childInParent + 1]))) {
                    const parentChildParts = parentParts.slice(0, childInParent + 2);
                    // console.log(`slicing childInParent + 1: ${parentChildParts}`);
                    parentChildParts.push(childPart);
                    jsonKey = parentChildParts.join('.');
                }
                else {
                    const parentChildParts = parentParts.slice(0, childInParent + 1);
                    parentChildParts.push(childPart);
                    jsonKey = parentChildParts.join('.');
                }
            }
            else {
                throw Error('Something is seriously wrong here.');
            }
            const dataType = tokens[3];
            let value;
            try {
                value = resolveValue(jsonKey, doc);
                const tov = typeof (value);
                if (tov === 'undefined' || value === null) {
                    value = null;
                }
                else if (dataType === 'int') {
                    if (!isNaN(value)) {
                        value = Number(value);
                    }
                    else {
                        value = null;
                    }
                }
                else if (dataType === 'number') {
                    if (!isNaN(value)) {
                        // don't mess with the value
                    }
                    else {
                        value = null;
                    }
                }
                else if (dataType === 'date') {
                    const parsed = moment(value);
                    if (parsed && parsed.isValid()) {
                        value = parsed.toDate();
                    }
                    else {
                        value = null;
                    }
                }
                else if (dataType === 'boolean') {
                    if (value === false || value === 'false' || value === 0) {
                        value = 0;
                    }
                    else if (value === true || value === 'true' || value === 1) {
                        value = 1;
                    }
                    else {
                        value = null;
                    }
                }
                else if (dataType === 'string') {
                    if (!value) {
                        value = null;
                    }
                }
                else {
                    value = null;
                }
            }
            catch (conversionError) {
                log.error({ moduleName, methodName, table, column: sqlName, jsonKey, conversionError });
            }
            log.trace({ moduleName, methodName, table, column: sqlName, jsonKey, value });
            params.push(value);
        }
        log.trace({ moduleName, methodName, table, sqlStatement, sqlStatementLength: sqlStatement.length });
        const results = [];
        // Here we specify value parameters twice, in the same order, in our SQL update statement...
        const allParams = params.concat(params);
        const sqlRequest = conn.query(sqlStatement, allParams, (sqlerr, rowCount) => {
            if (sqlerr) {
                if (evented) {
                    log.warn({ moduleName, methodName, table, id, sqlerr });
                }
                else {
                    log.error({ moduleName, methodName, table, id, sqlerr });
                }
                return reject({ sqlerr, table, doc, parentJsonKey });
            }
            else {
                log.info({ moduleName, methodName, table, id, parentJsonKey }, `${rowCount.affectedRows} rows`);
                results.push({ occurs: rowCount.affectedRows });
                return resolve({ conn, tables, table, doc, parentJsonKey });
            }
        });
    });
}
function mergeRows(conn, tables, table, doc, evented = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = 'mergeRows';
        log.trace({ moduleName, methodName, table }, `start`);
        // Check the id and revision
        const id = doc._id || doc.id;
        const rev = doc._rev || doc.rev;
        if (revisions.has(id) &&
            revisions.get(id) >= rev) {
            if (revisionsTable === table) {
                log.info({ moduleName, methodName, table, id }, `no change.`);
            }
            return { conn, tables, table, doc, i: -2 };
        }
        // build an initial address with no consideration of arrays
        let jsonKeys = [];
        let jsonKey = table;
        let parent = tables[table].parentName;
        for (;;) {
            if (parent) {
                jsonKey = `${parent}.${jsonKey}`;
                parent = tables[parent].parentName;
            }
            else {
                break;
            }
        }
        // drop the root table from the address
        const jsonKeyIO = jsonKey.indexOf('.');
        if (jsonKeyIO > -1) {
            jsonKey = jsonKey.slice(jsonKeyIO + 1, jsonKey.length);
        }
        else {
            jsonKey = '';
            jsonKeys.push(jsonKey);
        }
        log.trace({ moduleName, methodName, table, jsonKey }, `not considering arrays`);
        // build addresses with consideration for arrays
        let maxKeyLength = jsonKey.split('.').length;
        const tokens = jsonKey.split('.');
        const tokensLength = tokens.length || 0;
        if (jsonKey && tokensLength > 0) {
            let key = '';
            let val = '';
            for (const token of tokens) {
                const jkl = jsonKeys.length;
                if (jkl > 0) {
                    for (let k = 0; k < jkl; k++) {
                        key = `${jsonKeys[k]}.${token}`;
                        val = resolveValue(key, doc);
                        if (val && val instanceof Array) {
                            maxKeyLength++;
                            for (let i = 0; i < val.length; i++) {
                                const arrayKey = `${key}.${i}`;
                                jsonKeys.push(arrayKey);
                                log.trace({ moduleName, methodName, table, arrayKey }, `an array`);
                            }
                        }
                        else if (val && val instanceof Object) {
                            const objectKey = `${key}`;
                            jsonKeys.push(objectKey);
                            log.trace({ moduleName, methodName, table, objectKey }, `an object`);
                        }
                    }
                }
                else {
                    key += `.${token}`;
                    key = key.startsWith('.') ? key.slice(1, key.length) : key;
                    val = resolveValue(key, doc);
                    if (val && val instanceof Array) {
                        maxKeyLength++;
                        for (let i = 0; i < val.length; i++) {
                            const arrayKey2 = `${key}.${i}`;
                            jsonKeys.push(arrayKey2);
                            log.trace({ moduleName, methodName, table, arrayKey2 }, `an array`);
                        }
                    }
                    else if (val && val instanceof Object) {
                        const objectKey2 = `${key}`;
                        jsonKeys.push(objectKey2);
                        log.trace({ moduleName, methodName, table, objectKey2 }, `an object`);
                    }
                }
            }
            // get rid of parent addresses
            log.trace({ moduleName, methodName, table, jsonKeys, maxKeyLength }, `before`);
            const newJsonKeys = [];
            for (const newJsonKey of jsonKeys) {
                const newKeyLength = newJsonKey.split('.').length;
                if (newKeyLength === maxKeyLength) {
                    newJsonKeys.push(newJsonKey);
                }
            }
            jsonKeys = newJsonKeys;
            log.trace({ moduleName, methodName, table, jsonKeys }, `after`);
        }
        // apply addresses
        let result = new Promise((r) => { r({ conn, tables, table, doc, i: -1 }); });
        let value = '';
        for (jsonKey of jsonKeys) {
            if (jsonKey === '') {
                value = doc;
            }
            else if (jsonKey) {
                value = resolveValue(jsonKey, doc);
            }
            else {
                throw Error('This should never happen!!!');
            }
            if (value &&
                value instanceof Object) {
                log.trace({ moduleName, methodName, jsonKey, value }, `It's an object.`);
                result = new Promise((r) => { r({ conn, tables, table, doc, i: -1 }); });
                try {
                    result = yield mergeRow(conn, tables, table, doc, jsonKey);
                }
                catch (mergeRowError) {
                    if (evented) {
                        console.warn(mergeRowError);
                    }
                    else {
                        console.error(mergeRowError);
                    }
                }
            }
        }
        return result;
    });
}
function mergeDoc(tables, doc, evented = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = 'mergeDoc';
        log.trace({ moduleName, methodName }, `start`);
        const tableKeys = [];
        for (const table in tables) {
            if (tables.hasOwnProperty(table)) {
                log.trace({ moduleName, methodName, table }, 'Step 0');
                tableKeys.push(table);
            }
        }
        for (let i = 0; i < tableKeys.length; i++) {
            const table = tableKeys[i];
            const eye = i;
            log.trace({ moduleName, methodName, table, i: eye }, `loop`);
            const result = yield pool.connection.then((conn) => {
                log.trace({ moduleName, methodName, table }, 'Step 1');
                return mergeRows(conn, tables, table, doc, evented);
            }).then((intermediateResult) => {
                log.trace({ moduleName, methodName, table }, 'Step 2');
                intermediateResult.conn.release();
            });
            if (i === tableKeys.length - 1) {
                log.trace({ moduleName, methodName }, `return`);
                return result;
            }
        }
    });
}
exports.mergeDoc = mergeDoc;
function mergeDocs(tables, docs, evented = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = 'mergeDocs';
        log.trace({ moduleName, methodName }, `start`);
        let result;
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            const eye = i;
            let slc = '';
            if (doc._id) {
                slc = doc._id.slice(0, 13);
            }
            else if (doc.id) {
                slc = doc.id.slice(0, 13);
            }
            log.trace({ moduleName, methodName, doc: slc, i: eye }, `loop`);
            result = yield mergeDoc(tables, doc, evented);
            if (i === docs.length - 1) {
                log.trace({ moduleName, methodName }, `return`);
                return result;
            }
        }
    });
}
exports.mergeDocs = mergeDocs;
function resolveValue(path, obj) {
    const methodName = 'resolveValue';
    log.trace({ moduleName, methodName }, `start`);
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : null;
    }, obj || self);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRE1MLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRE1MLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxRQUFROzs7Ozs7Ozs7Ozs7QUFJUiw0QkFBNEI7QUFDNUIsaUNBQWlDO0FBRWpDLHdDQUFxQztBQUNyQyx5Q0FBa0M7QUFDbEMscUNBQTJDO0FBRTNDLDRCQUE0QjtBQUM1QixtSEFBbUg7QUFFbkgsTUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDO0FBQ2hDLE1BQU0sU0FBUyxHQUFXLElBQUksQ0FBQztBQUMvQixNQUFNLFNBQVMsR0FBVyxHQUFHLENBQUM7QUFDOUIsTUFBTSxVQUFVLEdBQVcsbUJBQW1CLENBQUM7QUFFL0MsSUFBSSxJQUFjLENBQUM7QUFDbkIsSUFBSSxHQUFXLENBQUM7QUFFaEIsSUFBSSxTQUFTLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7QUFDL0MsSUFBSSxjQUFjLEdBQVcsRUFBRSxDQUFDO0FBQ2hDLFNBQXNCLG1CQUFtQixDQUFDLE1BQVc7O1FBQ25ELE1BQU0sVUFBVSxHQUFXLHFCQUFxQixDQUFDO1FBQ2pELEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0MsSUFBSSxLQUFLLEdBQVcsRUFBRSxDQUFDO1FBQ3ZCLEtBQUssS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsRUFBRTtnQkFDN0IsY0FBYyxHQUFHLEtBQUssQ0FBQztnQkFDdkIsTUFBTTthQUNQO1NBQ0Y7UUFDRCxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBUyxFQUFFLEVBQUU7WUFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkQsT0FBTyxpQkFB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