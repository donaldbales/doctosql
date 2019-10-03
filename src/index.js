"use strict";
// index
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:no-console */
const doc = require("./lib/docMetadata");
const Logger = require("./lib/Logger");
const ddl = require("./lib/sqlDDL");
const dml = require("./lib/sqlDML");
const sql = require("./lib/sqlMetadata");
const moduleName = 'src/index.js';
const DB_TYPE = process.env.DOCTOSQL_DB_TYPE || 'sqlserver';
function load(entityName, docs) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = `load`;
        const log = Logger.instance.log;
        const logLevel = process.env.DOCTOSQL_LOG_LEVEL ||
            process.env.LOG_LEVEL;
        if (logLevel) {
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
        log.info({ moduleName, methodName }, `Fininshed at ${new Date().toISOString()}.`);
        return { result: true };
    });
}
exports.load = load;
function incr(entityName, docs) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = `incr`;
        const log = Logger.instance.log;
        const logLevel = process.env.DOCTOSQL_LOG_LEVEL ||
            process.env.LOG_LEVEL;
        if (logLevel) {
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
        log.info({ moduleName, methodName }, `Fininshed at ${new Date().toISOString()}.`);
        return { result: true };
    });
}
exports.incr = incr;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsUUFBUTs7Ozs7Ozs7OztBQUVSLCtCQUErQjtBQUUvQix5Q0FBeUM7QUFDekMsdUNBQXVDO0FBQ3ZDLG9DQUFvQztBQUNwQyxvQ0FBb0M7QUFDcEMseUNBQXlDO0FBRXpDLE1BQU0sVUFBVSxHQUFXLGNBQWMsQ0FBQztBQUUxQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUEwQixJQUFJLFdBQVcsQ0FBQTtBQUVyRSxjQUEyQixVQUFrQixFQUFFLElBQVc7O1FBQ3hELE1BQU0sVUFBVSxHQUFXLE1BQU0sQ0FBQztRQUNsQyxNQUFNLEdBQUcsR0FBUSxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztRQUNyQyxNQUFNLFFBQVEsR0FBWSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUE2QjtZQUNoRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQW9CLENBQUM7UUFDcEMsSUFBSSxRQUFRLEVBQUU7WUFDWixHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3JCO1FBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxlQUFlLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWhGLE1BQU0sR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLE1BQU0sR0FBRyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRS9FLE1BQU0sR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVs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