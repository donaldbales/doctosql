"use strict";
// sqlServer
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
exports.mergeDocs = exports.mergeDoc = exports.initializeLogger = exports.initializeRevisions = void 0;
const mysqlDML = require("./mysql/sqlDML");
const sqlserverDML = require("./sqlserver/sqlDML");
function initializeRevisions(dbType, tables) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (dbType) {
            case 'mysql':
                return mysqlDML.initializeRevisions(tables);
            case 'sqlserver':
            default:
                return sqlserverDML.initializeRevisions(tables);
        }
    });
}
exports.initializeRevisions = initializeRevisions;
function initializeLogger(dbType, loggerLog) {
    switch (dbType) {
        case 'mysql':
            return mysqlDML.initializeLogger(loggerLog);
        case 'sqlserver':
        default:
            return sqlserverDML.initializeLogger(loggerLog);
    }
}
exports.initializeLogger = initializeLogger;
function mergeDoc(dbType, tables, doc, evented = false) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (dbType) {
            case 'mysql':
                return mysqlDML.mergeDoc(tables, doc, evented);
            case 'sqlserver':
            default:
                return sqlserverDML.mergeDoc(tables, doc, evented);
        }
    });
}
exports.mergeDoc = mergeDoc;
function mergeDocs(dbType, tables, docs, evented = false) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (dbType) {
            case 'mysql':
                return mysqlDML.mergeDocs(tables, docs, evented);
            case 'sqlserver':
            default:
                return sqlserverDML.mergeDocs(tables, docs, evented);
        }
    });
}
exports.mergeDocs = mergeDocs;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRE1MLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRE1MLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOzs7Ozs7Ozs7Ozs7QUFLWiwyQ0FBMkM7QUFDM0MsbURBQW1EO0FBRW5ELFNBQXNCLG1CQUFtQixDQUFDLE1BQWMsRUFBRSxNQUFXOztRQUNuRSxRQUFRLE1BQU0sRUFBRTtZQUNoQixLQUFLLE9BQU87Z0JBQ1YsT0FBTyxRQUFRLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUMsS0FBSyxXQUFXLENBQUM7WUFDakI7Z0JBQ0UsT0FBTyxZQUFZLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDakQ7SUFDSCxDQUFDO0NBQUE7QUFSRCxrREFRQztBQUVELFNBQWdCLGdCQUFnQixDQUFDLE1BQWMsRUFBRSxTQUFpQjtJQUNoRSxRQUFRLE1BQU0sRUFBRTtRQUNoQixLQUFLLE9BQU87WUFDVixPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM3QyxLQUFLLFdBQVcsQ0FBQztRQUNqQjtZQUNFLE9BQU8sWUFBWSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ2pEO0FBQ0gsQ0FBQztBQVJELDRDQVFDO0FBRUQsU0FBc0IsUUFBUSxDQUFDLE1BQWMsRUFBRSxNQUFXLEVBQUUsR0FBUSxFQUFFLFVBQW1CLEtBQUs7O1FBQzVGLFFBQVEsTUFBTSxFQUFFO1lBQ2hCLEtBQUssT0FBTztnQkFDVixPQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNqRCxLQUFLLFdBQVcsQ0FBQztZQUNqQjtnQkFDRSxPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNwRDtJQUNILENBQUM7Q0FBQTtBQVJELDRCQVFDO0FBRUQsU0FBc0IsU0FBUyxDQUFDLE1BQWMsRUFBRSxNQUFXLEVBQUUsSUFBVyxFQUFFLFVBQW1CLEtBQUs7O1FBQ2hHLFFBQVEsTUFBTSxFQUFFO1lBQ2hCLEtBQUssT0FBTztnQkFDVixPQUFPLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNuRCxLQUFLLFdBQVcsQ0FBQztZQUNqQjtnQkFDRSxPQUFPLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUN0RDtJQUNILENBQUM7Q0FBQTtBQVJELDhCQVFDIn0=