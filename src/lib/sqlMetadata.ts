// sqlServer

/* tslint:disable:no-console */

import Logger from 'bunyan';
import * as padEnd from 'string.prototype.padend';

import { inspect } from './inspect';

// Sql Server Reserved Words
// https://docs.microsoft.com/en-us/sql/t-sql/language-elements/reserved-keywords-transact-sql?view=sql-server-2017

const arrayIndex: string = 'AI';
const delimiter: string = `\t`;
const moduleName: string = 'src/lib/sqlMetadata.js';

let log: Logger;
export function initializeLogger(loggerLog: Logger): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'initializeLogger';
    log = loggerLog;
    log.debug({ moduleName, methodName }, `logger set up!`);
    resolve(true);
  });
}

export function sqlDataType(dataType: string, maxLength: number): string {
  const methodName: string = 'sqlDataType';
  log.trace({ moduleName, methodName }, `start`);

  let result: string = 'VARCHAR(100)';
  if (dataType === 'int') {
    result = 'INT';
  } else
  if (dataType === 'number') {
    // because JavaScript numbers are double precision floats
    result = 'VARCHAR(38)';
  } else if (dataType === 'date') {
    result = 'DATETIMEOFFSET';
  } else if (dataType === 'boolean') {
    result = 'INT';
  } else {
    if (maxLength <= 8) {
      result = 'VARCHAR(8)';
    } else if (maxLength <= 80) {
      result = 'VARCHAR(80)';
    } else if (maxLength <= 800) {
      result = 'VARCHAR(800)';
    } else if (maxLength <= 8000) {
      result = 'VARCHAR(8000)';
    } else if (maxLength <= 2147483647) {
      result = 'VARCHAR(MAX)';
    } else {
      throw new Error(
        '2,147,483,647 characters is the maximum size allowed at this time');
    }
  }
  return result;
}

function findColumns(attributes: any, dotName: string): any[] {
  const methodName: string = 'findColumns';
  log.trace({ moduleName, methodName }, `start`);

  const results: any[] = [];
  let found: boolean = false;
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
      results.push(
        `${padEnd(attributes[attribute].upperSnake, 30, ' ')}${delimiter}` +
        `${padEnd(sqlDataType(attributes[attribute].dataType,
                       attributes[attribute].maxLength), 30, ' ')}${delimiter}` +
        `${dotName}.${attributes[attribute].name}${delimiter}` +
        `${attributes[attribute].dataType}`
      );
    }
  }
  return results;
}

function findFkColumns(tables: any) {
  const methodName: string = 'findFkColumns';
  log.trace({ moduleName, methodName }, `start`);

  for (const table in tables) {
    if (tables.hasOwnProperty(table)) {
      const results: any[] = [];
      if (tables[table].parentName) {
        let start: string = tables[table].parentName;
        for (let i = 0; i < 99; i++) {
          if (start &&
              tables[start] &&
              tables[start].name) {
            let result: string;
            result = `${tables[start].table}_`;
            let pkColumn: string = '';
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
            const tokens: string[] = pkColumn.split(delimiter);
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

let levelName: string = '';
function findTables(attributes: any, tables: any) {
  const methodName: string = 'findTables';
  log.trace({ moduleName, methodName }, `start`);

  const levelNameSaved: string = levelName;

  for (const attribute in attributes) {
    if (attributes.hasOwnProperty(attribute)) {
      if (attributes[attribute].name &&
          attributes[attribute].dataType &&
          attributes[attribute].dataType === 'object') {
        if (levelName &&
            levelNameSaved &&
            levelNameSaved.indexOf(attributes[attribute].name) === -1) {
          levelName = `${levelName ? levelName + '.' : ''}${attributes[attribute].name}`;
        } else {
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
        const name: any = tables[attributes[attribute].name];
        const result: any = findParentTable(attributes[attribute]);
        name.parentName = result.parentName;
        name.parentTable = result.parentTable;
        name.parentTablePk = result.parentTablePk;

        let parentDotName: string = `${name.parentName ? name.parentName + '.' : ''}${name.name}`;
        let start: string = name.parentName;
        for (let i = 0; i < 99; i++) {
          if (start &&
              tables[start] &&
              tables[start].parentName) {
            parentDotName = `${tables[start].parentName}.${parentDotName}`;
            start = tables[start].parentName;
          } else {
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
      const attributesLength: number =
        attributes[attribute].attributes ?
        Object.keys(attributes[attribute].attributes).length : 0;
      if (attributesLength > 0) {
        findTables(attributes[attribute].attributes, tables);
      }
    }
  }
  levelName = levelNameSaved;
}

function findParentTable(attribute: any): any {
  const methodName: string = 'findParentTable';
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
      attribute.parent.dataType === 'object'  ) {
    result.parentName = attribute.parent.name;
    result.parentTable = `${attribute.parent.upperSnake}`;
    if (attribute.parent.attributes &&
       (attribute.parent.attributes.id ||
        attribute.parent.attributes._id)) {
      result.parentTablePk = `ID`;
    }
  } else
  if (attribute.parent &&
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
  } else
  if (attribute.parent &&
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

export function analyzeDocumentMetadata(attributes: any): any {
  const methodName: string = 'analyzeDocumentMetadata';
  log.trace({ moduleName, methodName }, `start`);

  const tables: any = {};

  findTables(attributes, tables);
  findFkColumns(tables);

  return tables;
}
