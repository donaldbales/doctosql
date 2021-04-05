"use strict";
// sqlServer
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3FsRERMLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3FsRERMLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxZQUFZOztBQUtaLDJDQUEyQztBQUMzQyxtREFBbUQ7QUFFbkQscUJBQTRCLE1BQWMsRUFBRSxNQUFXO0lBQ3JELFFBQVEsTUFBTSxFQUFFO1FBQ2hCLEtBQUssT0FBTztZQUNWLE9BQU8sUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxLQUFLLFdBQVcsQ0FBQztRQUNqQjtZQUNFLE9BQU8sWUFBWSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUN6QztBQUNILENBQUM7QUFSRCxrQ0FRQztBQUVELDBCQUFpQyxNQUFjLEVBQUUsSUFBUyxFQUFFLE1BQVcsRUFBRSxLQUFVO0lBQ2pGLFFBQVEsTUFBTSxFQUFFO1FBQ2hCLEtBQUssT0FBTztZQUNWLE9BQU8sUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsS0FBSyxXQUFXLENBQUM7UUFDakI7WUFDRSxPQUFPLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQzNEO0FBQ0gsQ0FBQztBQVJELDRDQVFDO0FBRUQsMkJBQWtDLE1BQWMsRUFBRSxJQUFTLEVBQUUsTUFBVyxFQUFFLEtBQVU7SUFDbEYsUUFBUSxNQUFNLEVBQUU7UUFDaEIsS0FBSyxPQUFPO1lBQ1YsT0FBTyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6RCxLQUFLLFdBQVcsQ0FBQztRQUNqQjtZQUNFLE9BQU8sWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDNUQ7QUFDSCxDQUFDO0FBUkQsOENBUUM7QUFFRCxzQkFBNkIsTUFBYyxFQUFFLE1BQVc7SUFDdEQsUUFBUSxNQUFNLEVBQUU7UUFDaEIsS0FBSyxPQUFPO1lBQ1YsT0FBTyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZDLEtBQUssV0FBVyxDQUFDO1FBQ2pCO1lBQ0UsT0FBTyxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQzFDO0FBQ0gsQ0FBQztBQVJELG9DQVFDO0FBRUQsMEJBQWlDLE1BQWMsRUFBRSxTQUFpQjtJQUNoRSxRQUFRLE1BQU0sRUFBRTtRQUNoQixLQUFLLE9BQU87WUFDVixPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxLQUFLLFdBQVcsQ0FBQztRQUNqQjtZQUNFLE9BQU8sWUFBWSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ2pEO0FBQ0gsQ0FBQztBQVJELDRDQVFDIn0=