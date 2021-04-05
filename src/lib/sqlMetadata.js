"use strict";
// sqlServer
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDocumentMetadata = exports.sqlDataType = exports.initializeLogger = void 0;
const padEnd = require("string.prototype.padend");
// Sql Server Reserved Words
// https://docs.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-2017
const arrayIndex = 'AI';
const delimiter = `\t`;
const moduleName = 'src/lib/sqlMetadata.js';
let log;
function initializeLogger(loggerLog) {
    return new Promise((resolve, reject) => {
        const methodName = 'initializeLogger';
        log = loggerLog;
        log.debug({ moduleName, methodName }, `logger set up!`);
        resolve(true);
    });
}
exports.initializeLogger = initializeLogger;
function sqlDataType(dataType, maxLength) {
    const methodName = 'sqlDataType';
    log.trace({ moduleName, methodName }, `start`);
    let result = 'VARCHAR(100)';
    if (dataType === 'int') {
        result = 'INT';
    }
    else if (dataType === 'number') {
        // because JavaScript numbers are double precision floats
        result = 'VARCHAR(38)';
    }
    else if (dataType === 'date') {
        result = 'DATETIMEOFFSET';
    }
    else if (dataType === 'boolean') {
        result = 'INT';
    }
    else {
        if (maxLength <= 8) {
            result = 'VARCHAR(8)';
        }
        else if (maxLength <= 80) {
            result = 'VARCHAR(80)';
        }
        else if (maxLength <= 800) {
            result = 'VARCHAR(800)';
        }
        else if (maxLength <= 8000) {
            result = 'VARCHAR(8000)';
        }
        else if (maxLength <= 2147483647) {
            result = 'VARCHAR(MAX)';
        }
        else {
            throw new Error('2,147,483,647 characters is the maximum size allowed at this time');
        }
    }
    return result;
}
exports.sqlDataType = sqlDataType;
function findColumns(attributes, dotName) {
    const methodName = 'findColumns';
    log.trace({ moduleName, methodName }, `start`);
    const results = [];
    let found = false;
    for (const attribute in attributes) {
        if (attributes[attribute].dataType &&
            attributes[attribute].dataType !== 'array' &&
            attributes[attribute].dataType !== 'object' &&
            attributes[attribute].upperSnake &&
            attributes[attribute].upperSnake === 'ID') {
            found = true;
            break;
        }
    }
    for (const attribute in attributes) {
        if (attributes[attribute].dataType &&
            attributes[attribute].dataType !== 'array' &&
            attributes[attribute].dataType !== 'object') {
            if (found &&
                attributes[attribute].upperSnake === arrayIndex) {
                continue;
            }
            results.push(`${padEnd(attributes[attribute].upperSnake, 30, ' ')}${delimiter}` +
                `${padEnd(sqlDataType(attributes[attribute].dataType, attributes[attribute].maxLength), 30, ' ')}${delimiter}` +
                `${dotName}.${attributes[attribute].name}${delimiter}` +
                `${attributes[attribute].dataType}`);
        }
    }
    return results;
}
function findFkColumns(tables) {
    const methodName = 'findFkColumns';
    log.trace({ moduleName, methodName }, `start`);
    for (const table in tables) {
        if (tables.hasOwnProperty(table)) {
            const results = [];
            if (tables[table].parentName) {
                let start = tables[table].parentName;
                for (let i = 0; i < 99; i++) {
                    if (start &&
                        tables[start] &&
                        tables[start].name) {
                        let result;
                        result = `${tables[start].table}_`;
                        let pkColumn = '';
                        for (const column of tables[start].columns) {
                            if (column.indexOf(`ID `) === 0) {
                                pkColumn = `${column}`;
                            }
                        }
                        if (!pkColumn) {
                            for (const column of tables[start].columns) {
                                if (column.indexOf(`${arrayIndex} `) === 0) {
                                    pkColumn = `${column}`;
                                }
                            }
                        }
                        const tokens = pkColumn.split(delimiter);
                        result = `${(result + tokens[0]).slice(0, 30)}${delimiter}` +
                            `${tokens[1]}${delimiter}${tokens[2]}${delimiter}${tokens[3]}`;
                        results.push(result);
                        start = tables[start].parentName;
                    }
                }
            }
            tables[table].fkColumns = results;
        }
    }
}
let levelName = '';
function findTables(attributes, tables) {
    const methodName = 'findTables';
    log.trace({ moduleName, methodName }, `start`);
    const levelNameSaved = levelName;
    for (const attribute in attributes) {
        if (attributes.hasOwnProperty(attribute)) {
            if (attributes[attribute].name &&
                attributes[attribute].dataType &&
                attributes[attribute].dataType === 'object') {
                if (levelName &&
                    levelNameSaved &&
                    levelNameSaved.indexOf(attributes[attribute].name) === -1) {
                    levelName = `${levelName ? levelName + '.' : ''}${attributes[attribute].name}`;
                }
                else {
                    levelName = `${attributes[attribute].name}`;
                }
            }
            if (attributes[attribute].dataType &&
                attributes[attribute].dataType === 'object') {
                tables[attributes[attribute].name] = {
                    name: attributes[attribute].name,
                    table: `${attributes[attribute].upperSnake}`,
                    tablePk: arrayIndex
                };
                const name = tables[attributes[attribute].name];
                const result = findParentTable(attributes[attribute]);
                name.parentName = result.parentName;
                name.parentTable = result.parentTable;
                name.parentTablePk = result.parentTablePk;
                let parentDotName = `${name.parentName ? name.parentName + '.' : ''}${name.name}`;
                let start = name.parentName;
                for (let i = 0; i < 99; i++) {
                    if (start &&
                        tables[start] &&
                        tables[start].parentName) {
                        parentDotName = `${tables[start].parentName}.${parentDotName}`;
                        start = tables[start].parentName;
                    }
                    else {
                        break;
                    }
                }
                name.columns = findColumns(attributes[attribute].attributes, parentDotName);
                for (const column of name.columns) {
                    if (column.indexOf(`ID `) === 0) {
                        name.tablePk = 'ID';
                    }
                }
                name.columns.sort();
            }
            const attributesLength = attributes[attribute].attributes ?
                Object.keys(attributes[attribute].attributes).length : 0;
            if (attributesLength > 0) {
                findTables(attributes[attribute].attributes, tables);
            }
        }
    }
    levelName = levelNameSaved;
}
function findParentTable(attribute) {
    const methodName = 'findParentTable';
    log.trace({ moduleName, methodName }, `start`);
    const result = {
        parentName: '',
        parentTable: '',
        parentTablePk: ''
    };
    if (attribute.parent &&
        attribute.parent.name &&
        attribute.parent.name !== attribute.name &&
        attribute.parent.dataType &&
        attribute.parent.dataType === 'object') {
        result.parentName = attribute.parent.name;
        result.parentTable = `${attribute.parent.upperSnake}`;
        if (attribute.parent.attributes &&
            (attribute.parent.attributes.id ||
                attribute.parent.attributes._id)) {
            result.parentTablePk = `ID`;
        }
    }
    else if (attribute.parent &&
        attribute.parent.parent &&
        attribute.parent.parent.name &&
        attribute.parent.parent.name !== attribute.name &&
        attribute.parent.parent.dataType &&
        attribute.parent.parent.dataType === 'object') {
        result.parentName = attribute.parent.parent.name;
        result.parentTable = `${attribute.parent.parent.upperSnake}`;
        if (attribute.parent.parent.attributes &&
            (attribute.parent.parent.attributes.id ||
                attribute.parent.parent.attributes._id)) {
            result.parentTablePk = `ID`;
        }
    }
    else if (attribute.parent &&
        attribute.parent.parent &&
        attribute.parent.parent.parent &&
        attribute.parent.parent.parent.name &&
        attribute.patent.parent.parent.name !== attribute.name &&
        attribute.parent.parent.parent.dataType &&
        attribute.parent.parent.parent.dataType === 'object') {
        result.parentName = attribute.parent.parent.parent.name;
        result.parentTable = `${attribute.parent.parent.parent.upperSnake}`;
        if (attribute.parent.parent.attributes &&
            (attribute.parent.parent.attributes.id ||
                attribute.parent.parent.attributes._id)) {
            result.parentTablePk = `ID`;
        }
    }
    if (result.parentTable &&
        !result.parentTablePk) {
        result.parentTablePk = arrayIndex;
    }
    return result;
}
function analyzeDocumentMetadata(attributes) {
    const methodName = 'analyzeDocumentMetadata';
    log.trace({ moduleName, methodName }, `start`);
    const tables = {};
    findTables(attributes, tables);
    findFkColumns(tables);
    return tables;
}
exports.analyzeDocumentMetadata = analyzeDocumentMetadata;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsTWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzcWxNZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsWUFBWTs7O0FBS1osa0RBQWtEO0FBSWxELDRCQUE0QjtBQUM1QixtSEFBbUg7QUFFbkgsTUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDO0FBQ2hDLE1BQU0sU0FBUyxHQUFXLElBQUksQ0FBQztBQUMvQixNQUFNLFVBQVUsR0FBVyx3QkFBd0IsQ0FBQztBQUVwRCxJQUFJLEdBQVcsQ0FBQztBQUNoQixTQUFnQixnQkFBZ0IsQ0FBQyxTQUFpQjtJQUNoRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFXLGtCQUFrQixDQUFDO1FBQzlDLEdBQUcsR0FBRyxTQUFTLENBQUM7UUFDaEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFQRCw0Q0FPQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxRQUFnQixFQUFFLFNBQWlCO0lBQzdELE1BQU0sVUFBVSxHQUFXLGFBQWEsQ0FBQztJQUN6QyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRS9DLElBQUksTUFBTSxHQUFXLGNBQWMsQ0FBQztJQUNwQyxJQUFJLFFBQVEsS0FBSyxLQUFLLEVBQUU7UUFDdEIsTUFBTSxHQUFHLEtBQUssQ0FBQztLQUNoQjtTQUNELElBQUksUUFBUSxLQUFLLFFBQVEsRUFBRTtRQUN6Qix5REFBeUQ7UUFDekQsTUFBTSxHQUFHLGFBQWEsQ0FBQztLQUN4QjtTQUFNLElBQUksUUFBUSxLQUFLLE1BQU0sRUFB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