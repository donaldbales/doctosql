"use strict";
// index
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
exports.incr = exports.load = void 0;
/* tslint:disable:no-console */
const doc = require("./lib/docMetadata");
const Logger = require("./lib/Logger");
const ddl = require("./lib/sqlDDL");
const dml = require("./lib/sqlDML");
const sql = require("./lib/sqlMetadata");
const moduleName = 'src/index.js';
const DB_TYPE = process.env.DOCTOSQL_DB_TYPE || 'sqlserver';
function load(entityName, docs, logger = null) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = `load`;
        const log = logger == null ? Logger.instance.log : logger;
        const logLevel = process.env.DOCTOSQL_LOG_LEVEL ||
            process.env.LOG_LEVEL;
        if (log.level && logLevel) {
            log.level(logLevel);
        }
        log.info({ moduleName, methodName }, `Starting at ${new Date().toISOString()}`);
        yield doc.initializeLogger(log);
        const attrs = yield doc.analyzeDocuments(entityName.toLocaleLowerCase(), docs);
        yield sql.initializeLogger(log);
        const tables = sql.analyzeDocumentMetadata(attrs);
        yield ddl.initializeLogger(DB_TYPE, log);
        const creates = yield ddl.createTables(DB_TYPE, tables);
        const alters = yield ddl.alterTables(DB_TYPE, tables);
        yield dml.initializeLogger(DB_TYPE, log);
        const merges = yield dml.mergeDocs(DB_TYPE, tables, docs);
        log.info({ moduleName, methodName }, `Finished at ${new Date().toISOString()}.`);
        return { result: true };
    });
}
exports.load = load;
function incr(entityName, docs, logger = null) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = `incr`;
        const log = logger == null ? Logger.instance.log : logger;
        const logLevel = process.env.DOCTOSQL_LOG_LEVEL ||
            process.env.LOG_LEVEL;
        if (log.level && logLevel) {
            log.level(logLevel);
        }
        log.info({ moduleName, methodName }, `Starting at ${new Date().toISOString()}`);
        yield doc.initializeLogger(log);
        const attrs = yield doc.analyzeDocuments(entityName.toLocaleLowerCase(), docs);
        yield sql.initializeLogger(log);
        const tables = sql.analyzeDocumentMetadata(attrs);
        yield ddl.initializeLogger(DB_TYPE, log);
        const creates = yield ddl.createTables(DB_TYPE, tables);
        const alters = yield ddl.alterTables(DB_TYPE, tables);
        yield dml.initializeLogger(DB_TYPE, log);
        yield dml.initializeRevisions(DB_TYPE, tables);
        const merges = yield dml.mergeDocs(DB_TYPE, tables, docs);
        log.info({ moduleName, methodName }, `Finished at ${new Date().toISOString()}.`);
        return { result: true };
    });
}
exports.incr = incr;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsUUFBUTs7Ozs7Ozs7Ozs7O0FBRVIsK0JBQStCO0FBRS9CLHlDQUF5QztBQUN6Qyx1Q0FBdUM7QUFDdkMsb0NBQW9DO0FBQ3BDLG9DQUFvQztBQUNwQyx5Q0FBeUM7QUFFekMsTUFBTSxVQUFVLEdBQVcsY0FBYyxDQUFDO0FBRTFDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQTBCLElBQUksV0FBVyxDQUFBO0FBRXJFLFNBQXNCLElBQUksQ0FBQyxVQUFrQixFQUFFLElBQVcsRUFBRSxTQUFjLElBQUk7O1FBQzVFLE1BQU0sVUFBVSxHQUFXLE1BQU0sQ0FBQztRQUNsQyxNQUFNLEdBQUcsR0FBUSxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQy9ELE1BQU0sUUFBUSxHQUFZLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQTZCO1lBQ2hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBb0IsQ0FBQztRQUNwQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLElBQUksUUFBUSxFQUFFO1lBQ3pCLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDckI7UUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLGVBQWUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFaEYsTUFBTSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFL0UsTUFBTSxH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