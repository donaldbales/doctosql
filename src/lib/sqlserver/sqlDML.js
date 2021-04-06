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
exports.mergeDocs = exports.mergeDoc = exports.initializeLogger = exports.initializeRevisions = void 0;
const _ = require("lodash");
const moment = require("moment");
const tds = require("tedious");
const Database_1 = require("./Database");
const inspect_1 = require("../inspect");
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
        log.info({ moduleName, methodName }, `start`);
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
    return new Promise((resolve, reject) => {
        const methodName = 'checkForRevisions';
        log.info({ moduleName, methodName, table }, 'start');
        const tableName = sqlDDL_1.createTableName(tables, table);
        const sqlStatement = `
      select ID,
             REV
      from   ${tableName}
      order by ID
      `;
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
            if (sqlerr) {
                log.error({ moduleName, methodName, table, sqlerr });
                return reject(sqlerr);
            }
            else {
                log.info({ moduleName, methodName, table }, `${rowCount} rows`);
            }
        });
        log.trace({ moduleName, methodName, table, tableName, sqlStatement });
        let result;
        const results = [];
        sqlRequest.on('row', (columns) => {
            const id = columns[0].value;
            const rev = columns[1].value;
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
function initializeLogger(loggerLog) {
    return new Promise((resolve, reject) => {
        const methodName = 'initializeLogger';
        log = loggerLog;
        // for now, throw connection pool in here.
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
        // Global instances
        pool = new Database_1.Database(connectionConfig);
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
        let sqlStatement = `merge into ${tableName} as t using `;
        let columnList = '';
        let sDotColumnList = '';
        let valuesList = '';
        let setList = '';
        let onList = '';
        for (const column of tables[table].columns) {
            const tokens = column.split(delimiter);
            const columnName = tokens[0].trim();
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
            const columnName = tokens[0].trim();
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
        const sqlRequest = new tds.Request(sqlStatement, (sqlerr, rowCount) => {
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
                log.info({ moduleName, methodName, table, id, parentJsonKey }, `${rowCount} rows`);
            }
        });
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
            let tdsType;
            tdsType = parameterType(dataType);
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
                log.error({ moduleName, methodName, table, column: sqlName, tdsType, jsonKey, conversionError });
            }
            log.trace({ moduleName, methodName, table, column: sqlName, tdsType, jsonKey, value });
            if (tdsType === tds.TYPES.Decimal) {
                sqlRequest.addParameter(sqlName, tdsType, value, { precision, scale });
            }
            else {
                sqlRequest.addParameter(sqlName, tdsType, value);
            }
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
            const tdsType = parameterType(dataType);
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
                log.error({ moduleName, methodName, table, column: sqlName, tdsType, jsonKey, conversionError });
            }
            log.trace({ moduleName, methodName, table, column: sqlName, tdsType, jsonKey, value });
            if (value && tdsType === tds.TYPES.Decimal) {
                sqlRequest.addParameter(sqlName, tdsType, value, { precision: 36, scale: 17 });
            }
            else {
                sqlRequest.addParameter(sqlName, tdsType, value);
            }
        }
        log.trace({ moduleName, methodName, table, sqlStatement, sqlStatementLength: sqlStatement.length });
        let result;
        const results = [];
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
function mergeRows(conn, tables, table, doc, evented = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = 'mergeRows';
        log.trace({ moduleName, methodName, table }, `start`);
        // Check the id and revision
        const id = doc._id || doc.id;
        const rev = doc._rev || doc.rev;
        if (revisions.has(id) &&
            revisions.get(id) == rev) {
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
function parameterType(dataType) {
    const methodName = 'parameterType';
    log.trace({ moduleName, methodName }, `start`);
    let result = tds.TYPES.VarChar;
    if (dataType === 'int') {
        result = tds.TYPES.Int;
    }
    else if (dataType === 'number') {
        result = tds.TYPES.VarChar;
    }
    else if (dataType === 'date') {
        result = tds.TYPES.DateTimeOffset;
    }
    else if (dataType === 'boolean') {
        // console.log(`********** dataType is boolean`);
        result = tds.TYPES.Int;
    }
    return result;
}
function resolveValue(path, obj) {
    const methodName = 'resolveValue';
    log.trace({ moduleName, methodName }, `start`);
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : null;
    }, obj || self);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRE1MLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRE1MLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOzs7Ozs7Ozs7Ozs7QUFJWiw0QkFBNEI7QUFDNUIsaUNBQWlDO0FBRWpDLCtCQUErQjtBQUUvQix5Q0FBc0M7QUFDdEMsd0NBQXFDO0FBQ3JDLHFDQUEyQztBQUUzQyw0QkFBNEI7QUFDNUIsbUhBQW1IO0FBRW5ILE1BQU0sVUFBVSxHQUFXLElBQUksQ0FBQztBQUNoQyxNQUFNLFNBQVMsR0FBVyxJQUFJLENBQUM7QUFDL0IsTUFBTSxTQUFTLEdBQVcsR0FBRyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFXLG1CQUFtQixDQUFDO0FBRS9DLElBQUksSUFBYyxDQUFDO0FBQ25CLElBQUksR0FBVyxDQUFDO0FBRWhCLElBQUksU0FBUyxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQy9DLElBQUksY0FBYyxHQUFXLEVBQUUsQ0FBQztBQUNoQyxTQUFzQixtQkFBbUIsQ0FBQyxNQUFXOztRQUNuRCxNQUFNLFVBQVUsR0FBVyxxQkFBcUIsQ0FBQztRQUNqRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzlDLElBQUksS0FBSyxHQUFXLEVBQUUsQ0FBQztRQUN2QixLQUFLLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLEVBQUU7Z0JBQzdCLGNBQWMsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLE1BQU07YUFDUDtTQUNGO1FBQ0QsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFO1lBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lB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