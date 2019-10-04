"use strict";
// mysql
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRE1MLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRE1MLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxRQUFROzs7Ozs7Ozs7O0FBSVIsNEJBQTRCO0FBQzVCLGlDQUFpQztBQUVqQyx3Q0FBcUM7QUFDckMseUNBQWtDO0FBQ2xDLHFDQUEyQztBQUUzQyw0QkFBNEI7QUFDNUIsbUhBQW1IO0FBRW5ILE1BQU0sVUFBVSxHQUFXLElBQUksQ0FBQztBQUNoQyxNQUFNLFNBQVMsR0FBVyxJQUFJLENBQUM7QUFDL0IsTUFBTSxTQUFTLEdBQVcsR0FBRyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFXLG1CQUFtQixDQUFDO0FBRS9DLElBQUksSUFBYyxDQUFDO0FBQ25CLElBQUksR0FBVyxDQUFDO0FBRWhCLElBQUksU0FBUyxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQy9DLElBQUksY0FBYyxHQUFXLEVBQUUsQ0FBQztBQUNoQyw2QkFBMEMsTUFBVzs7UUFDbkQsTUFBTSxVQUFVLEdBQVcscUJBQXFCLENBQUM7UUFDakQsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMvQyxJQUFJLEtBQUssR0FBVyxFQUFFLENBQUM7UUFDdkIsS0FBSyxLQUFLLElBQUksTUFBTSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxFQUFFO2dCQUM3QixjQUFjLEdBQUcsS0FBSyxDQUFDO2dCQUN2QixNQUFNO2FBQ1A7U0FDRjtRQUNELE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFTLEVBQUUsRUFBRTtZQUN2QyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN2RCxPQUFPLGlCQUFpQixDQUFDLElBQUks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