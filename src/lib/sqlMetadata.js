"use strict";
// sqlServer
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsTWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzcWxNZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsWUFBWTs7QUFLWixrREFBa0Q7QUFJbEQsNEJBQTRCO0FBQzVCLG1IQUFtSDtBQUVuSCxNQUFNLFVBQVUsR0FBVyxJQUFJLENBQUM7QUFDaEMsTUFBTSxTQUFTLEdBQVcsSUFBSSxDQUFDO0FBQy9CLE1BQU0sVUFBVSxHQUFXLHdCQUF3QixDQUFDO0FBRXBELElBQUksR0FBVyxDQUFDO0FBQ2hCLDBCQUFpQyxTQUFpQjtJQUNoRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFXLGtCQUFrQixDQUFDO1FBQzlDLEdBQUcsR0FBRyxTQUFTLENBQUM7UUFDaEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFQRCw0Q0FPQztBQUVELHFCQUE0QixRQUFnQixFQUFFLFNBQWlCO0lBQzdELE1BQU0sVUFBVSxHQUFXLGFBQWEsQ0FBQztJQUN6QyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRS9DLElBQUksTUFBTSxHQUFXLGNBQWMsQ0FBQztJQUNwQyxJQUFJLFFBQVEsS0FBSyxLQUFLLEVBQUU7UUFDdEIsTUFBTSxHQUFHLEtBQUssQ0FBQztLQUNoQjtTQUNELElBQUksUUFBUSxLQUFLLFFBQVEsRUFBRTtRQUN6Qix5REFBeUQ7UUFDekQsTUFBTSxHQUFHLGFBQWEsQ0FBQztLQUN4QjtTQUFNLElBQUksUUFBUSxLQUFLLE1BQU0sRUFBRTtRQUM5QixNQUFNLEdBQUcsZ0JB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