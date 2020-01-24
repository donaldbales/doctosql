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
        sqlRequest.on('requestCompleted', (rowCount, more, rows) => {
            log.debug({ moduleName, methodName, table, rowCount }, `requestCompleted`);
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
        sqlRequest.on('requestCompleted', (rowCount, more, rows) => {
            log.trace({ moduleName, methodName, table, rowCount }, `requestCompleted`);
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
            revisions.get(id) === rev) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRE1MLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRE1MLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOzs7Ozs7Ozs7O0FBSVosNEJBQTRCO0FBQzVCLGlDQUFpQztBQUVqQywrQkFBK0I7QUFFL0IseUNBQWtDO0FBQ2xDLHVDQUFvQztBQUNwQyxxQ0FBMkM7QUFFM0MsNEJBQTRCO0FBQzVCLG1IQUFtSDtBQUVuSCxNQUFNLFVBQVUsR0FBVyxJQUFJLENBQUM7QUFDaEMsTUFBTSxTQUFTLEdBQVcsSUFBSSxDQUFDO0FBQy9CLE1BQU0sU0FBUyxHQUFXLEdBQUcsQ0FBQztBQUM5QixNQUFNLFVBQVUsR0FBVyxtQkFBbUIsQ0FBQztBQUUvQyxJQUFJLElBQWMsQ0FBQztBQUNuQixJQUFJLEdBQVcsQ0FBQztBQUVoQixJQUFJLFNBQVMsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUMvQyxJQUFJLGNBQWMsR0FBVyxFQUFFLENBQUM7QUFDaEMsNkJBQTBDLE1BQVc7O1FBQ25ELE1BQU0sVUFBVSxHQUFXLHFCQUFxQixDQUFDO1FBQ2pELEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0MsSUFBSSxLQUFLLEdBQVcsRUFBRSxDQUFDO1FBQ3ZCLEtBQUssS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsRUFBRTtnQkFDN0IsY0FBYyxHQUFHLEtBQUssQ0FBQztnQkFDdkIsTUFBTTthQUNQO1NBQ0Y7UUFDRCxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBUyxFQUFFLEVBQUU7WUFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkQsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQVksRUFBRSxFQUFFO1lBQ3ZCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZELFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDckMsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2pCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsaUJBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNyRixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FBQTtBQXBCRCxrREFvQkM7QUFFRCwyQkFBMkIsSUFBUyxFQUFFLE1BQVcsRUFBRSxLQUFhO0lBQzlELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsTUFBTSxVQUFVLEdBQVcsbUJBQW1CLENBQUM7UUFDL0MsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdEQsTUFBTSxTQUFTLEdBQVEsd0JBQWUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsTUFBTSxZQUFZLEdBQVc7OztlQUdsQixTQUFTOztPQUVqQixDQUFDO1FBQ0osTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUNoQyxZQUFZLEVBQ1osQ0FBQyxNQUFXLEVBQUUsUUFBYSxFQUFFLEVBQUU7WUFDN0IsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ3JELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3ZCO2lCQUFNO2dCQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLEdBQUcsUUFBUSxPQUFPLENBQUMsQ0FBQzthQUNqRTtRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUwsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRXRFLElBQUksTUFBVyxDQUFDO1FBQ2hCLE1BQU0sT0FBTyxHQUFVLEVBQUUsQ0FBQztRQUUxQixVQUFVLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQy9CLE1BQU0sRUFBRSxHQUFRLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDakMsTUFBTSxHQUFHLEdBQVEsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNsQyxNQUFNLEdBQUc7Z0JBQ1AsRUFBRTtnQkFDRixHQUFHO2FBQ0osQ0FBQztZQUNGLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFFSCxVQUFVLENBQUMsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUMsUUFBYSxFQUFFLElBQVMsRUFBRSxJQUFTLEVBQUUsRUFBRTtZQUN4RSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUMzRSxPQUFPLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELDBCQUFpQyxTQUFpQjtJQUNoRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFXLGtCQUFrQixDQUFDO1FBQzlDLEdBQUcsR0FBRyxTQUFTLENBQUM7UUFFaEIsMENBQTBDO1FBRTFDLElBQUksVUFBZSxDQUFDO1FBQ3BCLElBQUk7WUFDRixvRUFBb0U7WUFDcEUsVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUF5QixDQUFDLENBQUM7U0FDakU7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztTQUN4RDtRQUVELElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2hDLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0VBQW9FLENBQUMsQ0FBQztZQUNoRiw4Q0FBOEM7WUFDOUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqQjtRQUVELE1BQU0sYUFBYSxHQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzdDLG1CQUFtQjtRQUNuQixJQUFJLEdBQUcsSUFBSSxrQkFBUSxDQUFDO1lBQ2xCLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsYUFBYTtnQkFDN0IsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRO2dCQUM3QixPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksSUFBSSxJQUFJO2dCQUM3QixjQUFjLEVBQUUsS0FBSztnQkFDckIsY0FBYyxFQUFFLGFBQWE7Z0JBQzdCLGdDQUFnQyxFQUFFLEtBQUs7Z0JBQ3ZDLGNBQWMsRUFBRSxLQUFLO2FBQ3RCO1lBQ0QsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRO1lBQzdCLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTTtZQUN6QixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7U0FDOUIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUExQ0QsNENBMENDO0FBRUQsa0JBQ0UsSUFBUyxFQUNULE1BQVcsRUFDWCxLQUFhLEVBQ2IsR0FBUSxFQUNSLGFBQWtCLEVBQ2xCLFVBQW1CLEtBQUs7SUFDeEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxNQUFNLFVBQVUsR0FBVyxVQUFVLENBQUM7UUFDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMxRSxNQUFNLEVBQUUsR0FBVyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDckMsTUFBTSxTQUFTLEdBQVcsd0JBQWUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsSUFBSSxZQUFZLEdBQVcsY0FBYyxTQUFTLGNBQWMsQ0FBQztRQUNqRSxJQUFJLFVBQVUsR0FBVyxFQUFFLENBQUM7UUFDNUIsSUFBSSxjQUFjLEdBQVcsRUFBRSxDQUFDO1FBQ2hDLElBQUksVUFBVSxHQUFXLEVBQUUsQ0FBQztRQUM1QixJQUFJLE9BQU8sR0FBVyxFQUFFLENBQUM7UUFDekIsSUFBSSxNQUFNLEdBQVcsRUFBRSxDQUFDO1FBQ3hCLEtBQUssTUFBTSxNQUFNLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRTtZQUMxQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sVUFBVSxHQUFXLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM1QyxVQUFVLElBQUksR0FBRyxVQUFVLElBQUksQ0FBQztZQUNoQyxjQUFjLElBQUksS0FBSyxVQUFVLElBQUksQ0FBQztZQUN0QyxVQUFVLElBQUksSUFBSSxVQUFVLElBQUksQ0FBQztZQUNqQyxPQUFPLElBQUksS0FBSyxVQUFVLFFBQVEsVUFBVSxJQUFJLENBQUM7WUFDakQsSUFBSSxVQUFVLEtBQUssSUFBSTtnQkFDbkIsVUFBVSxLQUFLLFVBQVUsRUFBRTtnQkFDN0IsTUFBTSxJQUFJLEtBQUssVUFBVSxRQUFRLFVBQVUsT0FBTyxDQUFDO2FBQ3BEO1NBQ0Y7UUFDRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLEVBQUU7WUFDNUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2QyxNQUFNLFVBQVUsR0FBVyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDNUMsVUFBVSxJQUFJLEdBQUcsVUFBVSxJQUFJLENBQUM7WUFDaEMsY0FBYyxJQUFJLEtBQUssVUFBVSxJQUFJLENBQUM7WUFDdEMsVUFBVSxJQUFJLElBQUksVUFBVSxJQUFJLENBQUM7WUFDakMsT0FBTyxJQUFJLEtBQUssVUFBVSxRQUFRLFVBQVUsSUFBSSxDQUFDO1lBQ2pELE1BQU0sSUFBSSxLQUFLLFVBQVUsUUFBUSxVQUFVLE9BQU8sQ0FBQztTQUNwRDtRQUNELFVBQVUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM3RCxjQUFjLEdBQUcsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDekUsVUFBVSxHQUFHLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzdELE9BQU8sR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNwRCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFakQsWUFBWSxJQUFJLFlBQVksVUFBVSxhQUFhLFVBQVUsS0FBSyxDQUFDO1FBQ25FLFlBQVksSUFBSSxRQUFRLE1BQU0sS0FBSyxDQUFDO1FBQ3BDLFlBQVksSUFBSSxrQ0FBa0MsQ0FBQztRQUNuRCxZQUFZLElBQUksWUFBWSxVQUFVLGVBQWUsY0FBYyxLQUFLLENBQUM7UUFDekUsWUFBWSxJQUFJLG9CQUFvQixDQUFDO1FBQ3JDLFlBQVksSUFBSSxjQUFjLE9BQU8sR0FBRyxDQUFDO1FBRXpDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FDaEMsWUFBWSxFQUNaLENBQUMsTUFBVyxFQUFFLFFBQWEsRUFBRSxFQUFFO1lBQzdCLElBQUksTUFBTSxFQUFFO2dCQUNWLElBQUksT0FBTyxFQUFFO29CQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztpQkFDekQ7cUJBQU07b0JBQ0wsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO2lCQUMxRDtnQkFDRCxPQUFPLE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7YUFDdEQ7aUJBQU07Z0JBQ0wsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsRUFBRSxHQUFHLFFBQVEsT0FBTyxDQUFDLENBQUM7YUFDcEY7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVMLEtBQUssTUFBTSxNQUFNLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRTtZQUMxQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sT0FBTyxHQUFXLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN6QyxNQUFNLE9BQU8sR0FBVyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDekMsTUFBTSxjQUFjLEdBQVcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxRCxJQUFJLE9BQU8sR0FBVyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3ZCLE9BQU8sR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ2pFO1lBQ0QsSUFBSSxhQUFhLEVBQUU7Z0JBQ2pCLE9BQU8sR0FBRyxHQUFHLGFBQWEsSUFBSSxPQUFPLEVBQUUsQ0FBQzthQUN6QztZQUNELE1BQU0sUUFBUSxHQUFXLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQyxJQUFJLE9BQVksQ0FBQztZQUNqQixPQUFPLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xDLElBQUksU0FBaUIsQ0FBQztZQUN0QixTQUFTLEdBQUcsRUFBRSxDQUFDO1lBQ2YsSUFBSSxLQUFhLENBQUM7WUFDbEIsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNYLElBQUksS0FBVSxDQUFDO1lBQ2YsSUFBSTtnQkFDRixLQUFLLEdBQUcsWUFBWSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFFbkMsTUFBTSxHQUFHLEdBQVcsT0FBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLEdBQUcsS0FBSyxXQUFXLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtvQkFDekMsS0FBSyxHQUFHLElBQUksQ0FBQztvQkFDYix3Q0FBd0M7b0JBQ3hDLElBQUksT0FBTyxLQUFLLElBQUksRUFBRTt3QkFDcEIsT0FBTyxHQUFHLElBQUksQ0FBQzt3QkFDZixJQUFJLGFBQWEsRUFBRTs0QkFDakIsT0FBTyxHQUFHLEdBQUcsYUFBYSxJQUFJLE9BQU8sRUFBRSxDQUFDO3lCQUN6Qzt3QkFDRCxLQUFLLEdBQUcsWUFBWSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztxQkFDcEM7aUJBQ0Y7cUJBQ0QsSUFBSSxRQUFRLEtBQUssS0FBSyxFQUFFO29CQUN0QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO3dCQUNqQixLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO3FCQUN2Qjt5QkFBTTt3QkFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDO3FCQUNkO2lCQUNGO3FCQUNELElBQUksUUFBUSxLQUFLLFFBQVEsRUFBRTtvQkFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTt3QkFDakIsNEJBQTRCO3FCQUM3Qjt5QkFBTTt3QkFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDO3dCQUNiLDRCQUE0QjtxQkFDN0I7aUJBQ0Y7cUJBQ0QsSUFBSSxRQUFRLEtBQUssTUFBTSxFQUFFO29CQUN2QixNQUFNLE1BQU0sR0FBUSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2xDLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRTt3QkFDOUIsS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztxQkFDekI7eUJBQU07d0JBQ0wsS0FBSyxHQUFHLElBQUksQ0FBQztxQkFDZDtpQkFDRjtxQkFDRCxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7b0JBQzFCLElBQUksS0FBSyxLQUFLLEtBQUssSUFBSSxLQUFLLEtBQUssT0FBTyxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUU7d0JBQ3ZELEtBQUssR0FBRyxDQUFDLENBQUM7cUJBQ1g7eUJBQ0QsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxNQUFNLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTt3QkFDckQsS0FBSyxHQUFHLENBQUMsQ0FBQztxQkFDWDt5QkFBTTt3QkFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDO3FCQUNkO2lCQUNGO3FCQUNELElBQUksUUFBUSxLQUFLLFFBQVEsRUFBRTtvQkFDekIsSUFBSSxDQUFDLEtBQUssRUFBRTt3QkFDVixLQUFLLEdBQUcsSUFBSSxDQUFDO3FCQUNkO2lCQUNGO3FCQUFNO29CQUNMLEtBQUssR0FBRyxJQUFJLENBQUM7aUJBQ2Q7YUFDRjtZQUFDLE9BQU8sZUFBZSxFQUFFO2dCQUN4QixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7YUFDbEc7WUFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFFdkYsSUFBSSxPQUFPLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7Z0JBQ2pDLFVBQVUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQzthQUN4RTtpQkFBTTtnQkFDTCxVQUFVLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDbEQ7U0FDRjtRQUNELEtBQUssTUFBTSxNQUFNLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsRUFBRTtZQUM1QyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sT0FBTyxHQUFXLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN6QyxNQUFNLE9BQU8sR0FBVyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDekMsSUFBSSxPQUFPLEdBQVcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sVUFBVSxHQUFhLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEQsTUFBTSxTQUFTLEdBQVcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDNUQsTUFBTSxXQUFXLEdBQWEsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN2RCxJQUFJLFVBQVUsR0FBVyxFQUFFLENBQUM7WUFDNUIsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDM0IsT0FBTyxHQUFHLFNBQVMsQ0FBQzthQUNyQjtpQkFDRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUN6QixVQUFVLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLElBQUksYUFBYSxHQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDaEQsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssVUFBVSxFQUFFO3dCQUNqQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO3dCQUNsQixNQUFNO3FCQUNQO2lCQUNGO2dCQUNELElBQUksYUFBYSxHQUFHLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQztvQkFDdEMsV0FBVyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7b0JBQy9CLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ3hELE1BQU0sZ0JBQWdCLEdBQWEsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUMzRSxpRUFBaUU7b0JBQ2pFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDakMsT0FBTyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdEM7cUJBQU07b0JBQ0wsTUFBTSxnQkFBZ0IsR0FBYSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzNFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDakMsT0FBTyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdEM7YUFDRjtpQkFBTTtnQkFDTCxNQUFNLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO2FBQ25EO1lBQ0QsTUFBTSxRQUFRLEdBQVcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25DLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN4QyxJQUFJLEtBQVUsQ0FBQztZQUNmLElBQUk7Z0JBQ0YsS0FBSyxHQUFHLFlBQVksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBRW5DLE1BQU0sR0FBRyxHQUFXLE9BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxHQUFHLEtBQUssV0FBVyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7b0JBQ3pDLEtBQUssR0FBRyxJQUFJLENBQUM7aUJBQ2Q7cUJBQ0QsSUFBSSxRQUFRLEtBQUssS0FBSyxFQUFFO29CQUN0QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO3dCQUNqQixLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO3FCQUN2Qjt5QkFBTTt3QkFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDO3FCQUNkO2lCQUNGO3FCQUNELElBQUksUUFBUSxLQUFLLFFBQVEsRUFBRTtvQkFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTt3QkFDakIsNEJBQTRCO3FCQUM3Qjt5QkFBTTt3QkFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDO3FCQUNkO2lCQUNGO3FCQUNELElBQUksUUFBUSxLQUFLLE1BQU0sRUFBRTtvQkFDdkIsTUFBTSxNQUFNLEdBQVEsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNsQyxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUU7d0JBQzlCLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7cUJBQ3pCO3lCQUFNO3dCQUNMLEtBQUssR0FBRyxJQUFJLENBQUM7cUJBQ2Q7aUJBQ0Y7cUJBQ0QsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO29CQUMxQixJQUFJLEtBQUssS0FBSyxLQUFLLElBQUksS0FBSyxLQUFLLE9BQU8sSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFO3dCQUN2RCxLQUFLLEdBQUcsQ0FBQyxDQUFDO3FCQUNYO3lCQUNELElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLEtBQUssTUFBTSxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUU7d0JBQ3JELEtBQUssR0FBRyxDQUFDLENBQUM7cUJBQ1g7eUJBQU07d0JBQ0wsS0FBSyxHQUFHLElBQUksQ0FBQztxQkFDZDtpQkFDRjtxQkFDRCxJQUFJLFFBQVEsS0FBSyxRQUFRLEVBQUU7b0JBQ3pCLElBQUksQ0FBQyxLQUFLLEVBQUU7d0JBQ1YsS0FBSyxHQUFHLElBQUksQ0FBQztxQkFDZDtpQkFDRjtxQkFBTTtvQkFDTCxLQUFLLEdBQUcsSUFBSSxDQUFDO2lCQUNkO2FBQ0Y7WUFBQyxPQUFPLGVBQWUsRUFBRTtnQkFDeEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO2FBQ2xHO1lBQ0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBRXZGLElBQUksS0FBSyxJQUFJLE9BQU8sS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRTtnQkFDMUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDaEY7aUJBQU07Z0JBQ0wsVUFBVSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ2xEO1NBQ0Y7UUFFRCxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRXBHLElBQUksTUFBVyxDQUFDO1FBQ2hCLE1BQU0sT0FBTyxHQUFVLEVBQUUsQ0FBQztRQUUxQixVQUFVLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQy9CLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM3RCxNQUFNLEdBQUcsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFFSCxVQUFVLENBQUMsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUMsUUFBYSxFQUFFLElBQVMsRUFBRSxJQUFTLEVBQUUsRUFBRTtZQUN4RSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUMzRSxPQUFPLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxtQkFBeUIsSUFBUyxFQUFFLE1BQVcsRUFBRSxLQUFhLEVBQUUsR0FBUSxFQUFFLFVBQW1CLEtBQUs7O1FBQ2hHLE1BQU0sVUFBVSxHQUFXLFdBQVcsQ0FBQztRQUN2QyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUV0RCw0QkFBNEI7UUFDNUIsTUFBTSxFQUFFLEdBQVcsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sR0FBRyxHQUFXLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUN4QyxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2pCLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFZLEtBQUssR0FBRyxFQUFFO1lBQ3hDLElBQUksY0FBYyxLQUFLLEtBQUssRUFBRTtnQkFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQy9EO1lBQ0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztTQUM1QztRQUVELDJEQUEyRDtRQUMzRCxJQUFJLFFBQVEsR0FBYSxFQUFFLENBQUM7UUFDNUIsSUFBSSxPQUFPLEdBQVcsS0FBSyxDQUFDO1FBQzVCLElBQUksTUFBTSxHQUFXLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFDOUMsU0FBWTtZQUNWLElBQUksTUFBTSxFQUFFO2dCQUNWLE9BQU8sR0FBRyxHQUFHLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUM7YUFDcEM7aUJBQU07Z0JBQ0wsTUFBTTthQUNQO1NBQ0Y7UUFDRCx1Q0FBdUM7UUFDdkMsTUFBTSxTQUFTLEdBQVcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsRUFBRTtZQUNsQixPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUN4RDthQUFNO1lBQ0wsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNiLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDeEI7UUFDRCxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUNoRixnREFBZ0Q7UUFDaEQsSUFBSSxZQUFZLEdBQVcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDckQsTUFBTSxNQUFNLEdBQWEsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1QyxNQUFNLFlBQVksR0FBVyxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQztRQUNoRCxJQUFJLE9BQU8sSUFBSSxZQUFZLEdBQUcsQ0FBQyxFQUFFO1lBQy9CLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQztZQUNyQixJQUFJLEdBQUcsR0FBUSxFQUFFLENBQUM7WUFDbEIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7Z0JBQzFCLE1BQU0sR0FBRyxHQUFXLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQ3BDLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRTtvQkFDWCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO3dCQUM1QixHQUFHLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUM7d0JBQ2hDLEdBQUcsR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO3dCQUM3QixJQUFJLEdBQUcsSUFBSSxHQUFHLFlBQVksS0FBSyxFQUFFOzRCQUMvQixZQUFZLEVBQUUsQ0FBQzs0QkFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQ0FDbkMsTUFBTSxRQUFRLEdBQVcsR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7Z0NBQ3ZDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0NBQ3hCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQzs2QkFDcEU7eUJBQ0Y7NkJBQ0QsSUFBSSxHQUFHLElBQUksR0FBRyxZQUFZLE1BQU0sRUFBRTs0QkFDaEMsTUFBTSxTQUFTLEdBQVcsR0FBRyxHQUFHLEVBQUUsQ0FBQzs0QkFDbkMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDekIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO3lCQUN0RTtxQkFDRjtpQkFDRjtxQkFBTTtvQkFDTCxHQUFHLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDbkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO29CQUMzRCxHQUFHLEdBQUcsWUFBWSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDN0IsSUFBSSxHQUFHLElBQUksR0FBRyxZQUFZLEtBQUssRUFBRTt3QkFDL0IsWUFBWSxFQUFFLENBQUM7d0JBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7NEJBQ25DLE1BQU0sU0FBUyxHQUFXLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDOzRCQUN4QyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUN6QixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7eUJBQ3JFO3FCQUNGO3lCQUNELElBQUksR0FBRyxJQUFJLEdBQUcsWUFBWSxNQUFNLEVBQUU7d0JBQ2hDLE1BQU0sVUFBVSxHQUFXLEdBQUcsR0FBRyxFQUFFLENBQUM7d0JBQ3BDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7d0JBQzFCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztxQkFDdkU7aUJBQ0Y7YUFDRjtZQUNELDhCQUE4QjtZQUM5QixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQy9FLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQztZQUNqQyxLQUFLLE1BQU0sVUFBVSxJQUFJLFFBQVEsRUFBRTtnQkFDakMsTUFBTSxZQUFZLEdBQVcsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQzFELElBQUksWUFBWSxLQUFLLFlBQVksRUFBRTtvQkFDakMsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztpQkFDOUI7YUFDRjtZQUNELFFBQVEsR0FBRyxXQUFXLENBQUM7WUFDdkIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ2pFO1FBQ0Qsa0JBQWtCO1FBQ2xCLElBQUksTUFBTSxHQUFRLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLElBQUksS0FBSyxHQUFRLEVBQUUsQ0FBQztRQUNwQixLQUFLLE9BQU8sSUFBSSxRQUFRLEVBQUU7WUFDeEIsSUFBSSxPQUFPLEtBQUssRUFBRSxFQUFFO2dCQUNsQixLQUFLLEdBQUcsR0FBRyxDQUFDO2FBQ2I7aUJBQU0sSUFBSSxPQUFPLEVBQUU7Z0JBQ2xCLEtBQUssR0FBRyxZQUFZLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNMLE1BQU0sS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7YUFDNUM7WUFDRCxJQUFJLEtBQUs7Z0JBQ0wsS0FBSyxZQUFZLE1BQU0sRUFBRTtnQkFDM0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7Z0JBQ3pFLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekUsSUFBSTtvQkFDRixNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUM1RDtnQkFBQyxPQUFPLGFBQWEsRUFBRTtvQkFDdEIsSUFBSSxPQUFPLEVBQUU7d0JBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztxQkFDN0I7eUJBQU07d0JBQ0wsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztxQkFDOUI7aUJBQ0Y7YUFDRjtTQUNGO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztDQUFBO0FBRUQsa0JBQStCLE1BQVcsRUFBRSxHQUFRLEVBQUUsVUFBbUIsS0FBSzs7UUFDNUUsTUFBTSxVQUFVLEdBQVcsVUFBVSxDQUFDO1FBQ3RDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFL0MsTUFBTSxTQUFTLEdBQVUsRUFBRSxDQUFDO1FBQzVCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO1lBQzFCLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDaEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZELFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDdkI7U0FDRjtRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sS0FBSyxHQUFXLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQyxNQUFNLEdBQUcsR0FBVyxDQUFDLENBQUM7WUFDdEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUU3RCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBUyxFQUFFLEVBQUU7Z0JBQ3RELEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUN2RCxPQUFPLFNBQVMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDdEQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsa0JBQXVCLEVBQUUsRUFBRTtnQkFDbEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZELGtCQUFrQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQyxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxLQUFLLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM5QixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNoRCxPQUFPLE1BQU0sQ0FBQzthQUNmO1NBQ0Y7SUFDSCxDQUFDO0NBQUE7QUE5QkQsNEJBOEJDO0FBRUQsbUJBQWdDLE1BQVcsRUFBRSxJQUFXLEVBQUUsVUFBbUIsS0FBSzs7UUFDaEYsTUFBTSxVQUFVLEdBQVcsV0FBVyxDQUFDO1FBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFL0MsSUFBSSxNQUFvQixDQUFDO1FBRXpCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3BDLE1BQU0sR0FBRyxHQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixNQUFNLEdBQUcsR0FBVyxDQUFDLENBQUM7WUFDdEIsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDO1lBQ3JCLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRztnQkFDWixHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQzVCO2lCQUNELElBQUksR0FBRyxDQUFDLEVBQUUsRUFBRztnQkFDWCxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQzNCO1lBQ0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFaEUsTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFOUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3pCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ2hELE9BQU8sTUFBTSxDQUFDO2FBQ2Y7U0FDRjtJQUNILENBQUM7Q0FBQTtBQXpCRCw4QkF5QkM7QUFFRCx1QkFBdUIsUUFBZ0I7SUFDckMsTUFBTSxVQUFVLEdBQVcsZUFBZSxDQUFDO0lBQzNDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFL0MsSUFBSSxNQUFNLEdBQW9CLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO0lBQ2hELElBQUksUUFBUSxLQUFLLEtBQUssRUFBRTtRQUN0QixNQUFNLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7S0FDeEI7U0FDRCxJQUFJLFFBQVEsS0FBSyxRQUFRLEVBQUU7UUFDekIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO0tBQzVCO1NBQ0QsSUFBSSxRQUFRLEtBQUssTUFBTSxFQUFFO1FBQ3ZCLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQztLQUNuQztTQUNELElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtRQUMxQixpREFBaUQ7UUFDakQsTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0tBQ3hCO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELHNCQUFzQixJQUFTLEVBQUUsR0FBUTtJQUN2QyxNQUFNLFVBQVUsR0FBVyxjQUFjLENBQUM7SUFDMUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUUvQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBUyxFQUFFLElBQVMsRUFBRSxFQUFFO1FBQ3JELE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNsQyxDQUFDLEVBQUUsR0FBRyxJQUFJLElBQUksQ0FBRSxDQUFDO0FBQ25CLENBQUMifQ==