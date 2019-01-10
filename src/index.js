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
function load(application, docs) {
    return __awaiter(this, void 0, void 0, function* () {
        const methodName = `load`;
        const log = Logger.instance.log;
        const logLevel = process.env.DOCTOSQL_LOG_LEVEL || process.env.LOG_LEVEL;
        if (logLevel) {
            log.level(logLevel);
        }
        log.info({ moduleName, methodName }, `Starting at ${new Date().toISOString()}`);
        yield doc.initializeLogger(log);
        const attrs = yield doc.analyzeDocuments(application.toLocaleLowerCase(), docs);
        yield sql.initializeLogger(log);
        const tables = sql.analyzeDocumentMetadata(attrs);
        yield ddl.initializeLogger(log);
        const creates = yield ddl.createTables(tables);
        const alters = yield ddl.alterTables(tables);
        yield dml.initializeLogger(log);
        const merges = yield dml.mergeDocs(tables, docs);
        log.info({ moduleName, methodName }, `Fininshed at ${new Date().toISOString()}.`);
        return { result: true };
    });
}
exports.load = load;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsUUFBUTs7Ozs7Ozs7OztBQUVSLCtCQUErQjtBQUUvQix5Q0FBeUM7QUFFekMsdUNBQXVDO0FBQ3ZDLG9DQUFvQztBQUNwQyxvQ0FBb0M7QUFDcEMseUNBQXlDO0FBRXpDLE1BQU0sVUFBVSxHQUFXLGNBQWMsQ0FBQztBQUUxQyxjQUEyQixXQUFtQixFQUFFLElBQVc7O1FBQ3pELE1BQU0sVUFBVSxHQUFXLE1BQU0sQ0FBQztRQUNsQyxNQUFNLEdBQUcsR0FBUSxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztRQUNyQyxNQUFNLFFBQVEsR0FBWSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUE2QixJQUFLLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBb0IsQ0FBQztRQUN6RyxJQUFJLFFBQVEsRUFBRTtZQUNaLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDckI7UUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLGVBQWUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFaEYsTUFBTSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFaEYsTUFBTSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRWxELE1BQU0sR0FBRyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sT0FBTyxHQUFHLE1BQU0sR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQyxNQUFNLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0MsTUFBTSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVqRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLGdCQUFnQixJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUVsRixPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO0lBQzFCLENBQUM7Q0FBQTtBQTFCRCxvQkEwQkMifQ==