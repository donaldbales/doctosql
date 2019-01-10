"use strict";
// metadata
Object.defineProperty(exports, "__esModule", { value: true });
const changeCase = require("change-case");
const moment = require("moment");
const moduleName = 'src/lib/docMetadata.js';
let log;
function analyze(attributes, attribute, object, parent) {
    const methodName = 'analyze';
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
    }
    else if (object &&
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
    }
    else {
        const dataType = attributes[attribute].name === 'ai' ? 'int' : deriveDataType(object);
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
function analyzeArray(attributes, attribute, objects, parent) {
    const methodName = 'analyzeArray';
    log.trace({ moduleName, methodName }, `start`);
    for (const object of objects) {
        analyze(attributes[attribute].attributes, attribute, object, attributes[attribute]);
    }
}
exports.analyzeArray = analyzeArray;
function analyzeObject(attributes, attribute, object, parent) {
    const methodName = 'analyzeObject';
    log.trace({ moduleName, methodName }, `start`);
    for (const objectAttribute in object) {
        if (object.hasOwnProperty(objectAttribute)) {
            analyze(attributes[attribute].attributes, objectAttribute, object[objectAttribute], attributes[attribute]);
        }
    }
}
exports.analyzeObject = analyzeObject;
function analyzeDocuments(attribute, objects) {
    const methodName = 'analyzeDocuments';
    log.debug({ moduleName, methodName }, `start`);
    return new Promise((resolve, reject) => {
        const attributes = new Object();
        attributes[attribute] = initializeAttributes(attribute);
        attributes[attribute].dataType = 'array';
        analyze(attributes, attribute, objects, null);
        resolve(attributes);
    });
}
exports.analyzeDocuments = analyzeDocuments;
// TODO: This probably belongs in sqlMetadata.ts
function attributeNameToUpperSnake(attributeName) {
    const upperSnaky = changeCase.snake(attributeName).toUpperCase();
    return upperSnaky;
}
function deriveDataType(object) {
    const methodName = 'deriveDataType';
    log.trace({ moduleName, methodName }, `start`);
    let result = '';
    const too = typeof (object);
    if (!(too === 'undefined') && !(object === null)) {
        if (too === 'boolean' ||
            (too === 'object' && object instanceof Boolean)) {
            result = 'boolean';
        }
        else if (too === 'number' ||
            (too === 'object' && object instanceof Number) ||
            !isNaN(object)) {
            result = 'number';
        }
        else if ((too === 'object' && object instanceof Date) ||
            moment(object, moment.ISO_8601, true).isValid()) {
            result = 'date';
        }
        else if (too === 'string' ||
            (too === 'object' && object instanceof String)) {
            result = 'string';
        }
    }
    return result;
}
function initializeAttributes(name) {
    const methodName = 'initializeAttributes';
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
function initializeLogger(loggerLog) {
    return new Promise((resolve, reject) => {
        const methodName = 'initializeLogger';
        log = loggerLog;
        log.trace({ moduleName, methodName }, `logger set up!`);
        resolve(true);
    });
}
exports.initializeLogger = initializeLogger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jTWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkb2NNZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsV0FBVzs7QUFLWCwwQ0FBMEM7QUFFMUMsaUNBQWlDO0FBSWpDLE1BQU0sVUFBVSxHQUFXLHdCQUF3QixDQUFDO0FBRXBELElBQUksR0FBVyxDQUFDO0FBRWhCLGlCQUFpQixVQUFlLEVBQUUsU0FBaUIsRUFBRSxNQUFXLEVBQUUsTUFBVztJQUMzRSxNQUFNLFVBQVUsR0FBVyxTQUFTLENBQUM7SUFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUUvQyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQzFCLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUN6RDtJQUVELElBQUksTUFBTTtRQUNOLE1BQU0sWUFBWSxLQUFLO1FBQ3ZCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3JCLG9DQUFvQztRQUNwQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN0QyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ1QsTUFBTSxDQUFDLENBQUMsQ0FBQyxZQUFZLE1BQU07Z0JBQzVCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7Z0JBQ2QsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDYixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2hCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ2xCO1NBQ0Y7UUFDRCxnQkFBZ0I7UUFDaEIsVUFBVSxD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