"use strict";
// sqlServer
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeLogger = exports.createTables = exports.createTableScript = exports.alterTableScript = exports.alterTables = void 0;
const mysqlDDL = require("./mysql/sqlDDL");
const sqlserverDDL = require("./sqlserver/sqlDDL");
function alterTables(dbType, tables) {
    switch (dbType) {
        case 'mysql':
            return mysqlDDL.alterTables(tables);
        case 'sqlserver':
        default:
            return sqlserverDDL.alterTables(tables);
    }
}
exports.alterTables = alterTables;
function alterTableScript(dbType, conn, tables, table) {
    switch (dbType) {
        case 'mysql':
            return mysqlDDL.alterTableScript(conn, tables, table);
        case 'sqlserver':
        default:
            return sqlserverDDL.alterTableScript(conn, tables, table);
    }
}
exports.alterTableScript = alterTableScript;
function createTableScript(dbType, conn, tables, table) {
    switch (dbType) {
        case 'mysql':
            return mysqlDDL.createTableScript(conn, tables, table);
        case 'sqlserver':
        default:
            return sqlserverDDL.createTableScript(conn, tables, table);
    }
}
exports.createTableScript = createTableScript;
function createTables(dbType, tables) {
    switch (dbType) {
        case 'mysql':
            return mysqlDDL.createTables(tables);
        case 'sqlserver':
        default:
            return sqlserverDDL.createTables(tables);
    }
}
exports.createTables = createTables;
function initializeLogger(dbType, loggerLog) {
    switch (dbType) {
        case 'mysql':
            return mysqlDDL.initializeLogger(loggerLog);
        case 'sqlserver':
        default:
            return sqlserverDDL.initializeLogger(loggerLog);
    }
}
exports.initializeLogger = initializeLogger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRERMLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRERMLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOzs7QUFLWiwyQ0FBMkM7QUFDM0MsbURBQW1EO0FBRW5ELFNBQWdCLFdBQVcsQ0FBQyxNQUFjLEVBQUUsTUFBVztJQUNyRCxRQUFRLE1BQU0sRUFBRTtRQUNoQixLQUFLLE9BQU87WUFDVixPQUFPLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEMsS0FBSyxXQUFXLENBQUM7UUFDakI7WUFDRSxPQUFPLFlBQVksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDekM7QUFDSCxDQUFDO0FBUkQsa0NBUUM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxNQUFjLEVBQUUsSUFBUyxFQUFFLE1BQVcsRUFBRSxLQUFVO0lBQ2pGLFFBQVEsTUFBTSxFQUFFO1FBQ2hCLEtBQUssT0FBTztZQUNWLE9BQU8sUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsS0FBSyxXQUFXLENBQUM7UUFDakI7WUFDRSxPQUFPLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQzNEO0FBQ0gsQ0FBQztBQVJELDRDQVFDO0FBRUQsU0FBZ0IsaUJBQWlCLENBQUMsTUFBYyxFQUFFLElBQVMsRUFBRSxNQUFXLEVBQUUsS0FBVTtJQUNsRixRQUFRLE1BQU0sRUFBRTtRQUNoQixLQUFLLE9BQU87WUFDVixPQUFPLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pELEtBQUssV0FBVyxDQUFDO1FBQ2pCO1lBQ0UsT0FBTyxZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztLQUM1RDtBQUNILENBQUM7QUFSRCw4Q0FRQztBQUVELFNBQWdCLFlBQVksQ0FBQyxNQUFjLEVBQUUsTUFBVztJQUN0RCxRQUFRLE1BQU0sRUFBRTtRQUNoQixLQUFLLE9BQU87WUFDVixPQUFPLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkMsS0FBSyxXQUFXLENBQUM7UUFDakI7WUFDRSxPQUFPLFlBQVksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDMUM7QUFDSCxDQUFDO0FBUkQsb0NBUUM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxNQUFjLEVBQUUsU0FBaUI7SUFDaEUsUUFBUSxNQUFNLEVBQUU7UUFDaEIsS0FBSyxPQUFPO1lBQ1YsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUMsS0FBSyxXQUFXLENBQUM7UUFDakI7WUFDRSxPQUFPLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNqRDtBQUNILENBQUM7QUFSRCw0Q0FRQyJ9