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
const _ = require("lodash");
const moment = require("moment");
const tds = require("tedious");
const Database_1 = require("./Database");
const inspect_1 = require("./inspect");
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
        pool = new Database_1.default(connectionConfig);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRE1MLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRE1MLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOzs7Ozs7Ozs7O0FBSVosNEJBQTRCO0FBQzVCLGlDQUFpQztBQUVqQywrQkFBK0I7QUFFL0IseUNBQWtDO0FBQ2xDLHVDQUFvQztBQUNwQyxxQ0FBMkM7QUFFM0MsNEJBQTRCO0FBQzVCLG1IQUFtSDtBQUVuSCxNQUFNLFVBQVUsR0FBVyxJQUFJLENBQUM7QUFDaEMsTUFBTSxTQUFTLEdBQVcsSUFBSSxDQUFDO0FBQy9CLE1BQU0sU0FBUyxHQUFXLEdBQUcsQ0FBQztBQUM5QixNQUFNLFVBQVUsR0FBVyxtQkFBbUIsQ0FBQztBQUUvQyxJQUFJLElBQWMsQ0FBQztBQUNuQixJQUFJLEdBQVcsQ0FBQztBQUVoQixJQUFJLFNBQVMsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUMvQyxJQUFJLGNBQWMsR0FBVyxFQUFFLENBQUM7QUFDaEMsNkJBQTBDLE1BQVc7O1FBQ25ELE1BQU0sVUFBVSxHQUFXLHFCQUFxQixDQUFDO1FBQ2pELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUMsSUFBSSxLQUFLLEdBQVcsRUFBRSxDQUFDO1FBQ3ZCLEtBQUssS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsRUFBRTtnQkFDN0IsY0FBYyxHQUFHLEtBQUssQ0FBQztnQkFDdkIsTUFBTTthQUNQO1NBQ0Y7UUFDRCxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBUyxFQUFFLEVBQUU7WUFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkQsT0FBTyxpQkFB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