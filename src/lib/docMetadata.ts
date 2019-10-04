// metadata

/* tslint:disable:no-console */

import Logger from 'bunyan';
import * as changeCase from 'change-case';
import * as moment from 'moment';

const moduleName: string = 'src/lib/docMetadata.js';

let log: Logger;

function analyze(attributes: any, attribute: string, object: any, parent: any) {
  const methodName: string = 'analyze';
  log.trace({ moduleName, methodName }, `start`);

  if (!attributes[attribute]) {
    attributes[attribute] = initializeAttributes(attribute);
  }

  if (object &&
      object instanceof Array &&
      object.length > 0) {
    // BEGIN INJECT AI: array index (ai)
    for (let i = 0; i < object.length; i++) {
      if (object[i] &&
          object[i] instanceof Object &&
         !object[i]._id &&
         !object[i].id &&
         !object[i].ai) {
        object[i].ai = i;
      }
    }
    // END INJECT AI
    attributes[attribute].dataType = 'array';
    if (object &&
        object.length &&
        object.length > attributes[attribute].maxLength) {
      attributes[attribute].maxLength = object.length;
    }
    if (parent) {
      attributes[attribute].parent = parent;
    }
    analyzeArray(attributes, attribute, object, parent);

  } else
  if (object &&
      object instanceof Object) {
    // BEGIN INJECT AI
    if (!object._id &&
        !object.id &&
        !object.ai) {
      object.ai = 0;
    }
    // END INJECT AI
    if (!attributes[attribute].dataType ||
         attributes[attribute].dataType !== 'array') {
      attributes[attribute].dataType = 'object';
    }
    if (object &&
        object.length &&
        object.length > attributes[attribute].maxLength) {
      attributes[attribute].maxLength = object.length;
    }
    if (parent) {
      attributes[attribute].parent = parent;
    }
    analyzeObject(attributes, attribute, object, parent);

  } else {
    const dataType: string = attributes[attribute].name === 'ai' ? 'int' : deriveDataType(object);
    if (dataType &&
        attributes[attribute].dataType === '') {
      attributes[attribute].dataType = dataType;
    }
    if (dataType &&
        attributes[attribute].dataType &&
        attributes[attribute].dataType !== dataType) {
      attributes[attribute].dataType = 'string';
    }
    if (object &&
        object.length &&
        object.length > attributes[attribute].maxLength) {
      attributes[attribute].maxLength = object.length;
    }
    if (parent) {
      attributes[attribute].parent = parent;
    }
  }
}

export function analyzeArray(attributes: any, attribute: string, objects: any[], parent: any) {
  const methodName: string = 'analyzeArray';
  log.trace({ moduleName, methodName }, `start`);

  for (const object of objects) {
    analyze(attributes[attribute].attributes, attribute, object, attributes[attribute]);
  }
}

export function analyzeObject(attributes: any, attribute: string, object: any, parent: any) {
  const methodName: string = 'analyzeObject';
  log.trace({ moduleName, methodName }, `start`);

  for (const objectAttribute in object) {
    if (object.hasOwnProperty(objectAttribute)) {
      analyze(attributes[attribute].attributes, objectAttribute, object[objectAttribute], attributes[attribute]);
    }
  }
}

export function analyzeDocuments(attribute: string, objects: any[]): Promise<any> {
  const methodName: string = 'analyzeDocuments';
  log.debug({ moduleName, methodName }, `start`);

  return new Promise((resolve, reject) => {
    const attributes: any = new Object();
    attributes[attribute] = initializeAttributes(attribute);
    attributes[attribute].dataType = 'array';

    analyze(attributes, attribute, objects, null);

    resolve(attributes);
  });
}

// TODO: This probably belongs in sqlMetadata.ts
function attributeNameToUpperSnake(attributeName: string): string {
  const upperSnaky: string = changeCase.snake(attributeName).toUpperCase();
  return upperSnaky;
}

function deriveDataType(object: any): string {
  const methodName: string = 'deriveDataType';
  log.trace({ moduleName, methodName }, `start`);

  let result: string = '';
  const too: string = typeof(object);
  if (!(too === 'undefined') && !(object === null)) {
    if (too === 'boolean' ||
       (too === 'object' && object instanceof Boolean)) {
      result = 'boolean';
    } else
    if (too === 'number' ||
       (too === 'object' && object instanceof Number) ||
       !isNaN(object)) {
      result = 'number';
    } else
    if ((too === 'object' && object instanceof Date) ||
        moment(object, moment.ISO_8601, true).isValid()) {
      result = 'date';
    } else
    if (too === 'string' ||
       (too === 'object' && object instanceof String)) {
      result = 'string';
    }
  }
  return result;
}

function initializeAttributes(name: string): any {
  const methodName: string = 'initializeAttributes';
  log.trace({ moduleName, methodName }, `start`);

/* tslint:disable:object-literal-sort-keys */

  const result = {
    dataType: '',
    maxLength: 0,
    name,
    parent: new Object(),
    upperSnake: attributeNameToUpperSnake(name),
    attributes: new Object()
  };
  return result;
}

export function initializeLogger(loggerLog: Logger): Promise<any> {
  return new Promise((resolve, reject) => {
    const methodName: string = 'initializeLogger';
    log = loggerLog;
    log.trace({ moduleName, methodName }, `logger set up!`);
    resolve(true);
  });
}
