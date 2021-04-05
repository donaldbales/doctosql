"use strict";
// metadata
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeLogger = exports.analyzeDocuments = exports.analyzeObject = exports.analyzeArray = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jTWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkb2NNZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsV0FBVzs7O0FBS1gsMENBQTBDO0FBQzFDLGlDQUFpQztBQUVqQyxNQUFNLFVBQVUsR0FBVyx3QkFBd0IsQ0FBQztBQUVwRCxJQUFJLEdBQVcsQ0FBQztBQUVoQixTQUFTLE9BQU8sQ0FBQyxVQUFlLEVBQUUsU0FBaUIsRUFBRSxNQUFXLEVBQUUsTUFBVztJQUMzRSxNQUFNLFVBQVUsR0FBVyxTQUFTLENBQUM7SUFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUUvQyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQzFCLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUN6RDtJQUVELElBQUksTUFBTTtRQUNOLE1BQU0sWUFBWSxLQUFLO1FBQ3ZCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3JCLG9DQUFvQztRQUNwQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN0QyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ1QsTUFBTSxDQUFDLENBQUMsQ0FBQyxZQUFZLE1BQU07Z0JBQzVCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7Z0JBQ2QsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDYixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2hCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ2xCO1NBQ0Y7UUFDRCxnQkFBZ0I7UUFD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