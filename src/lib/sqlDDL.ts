// sqlServer

/* tslint:disable:no-console */

import Logger from 'bunyan';
import * as mysqlDDL from './mysql/sqlDDL';
import * as sqlserverDDL from './sqlserver/sqlDDL';

export function alterTables(dbType: string, tables: any): Promise<any> {
  switch (dbType) {
  case 'mysql':
    return mysqlDDL.alterTables(tables);
  case 'sqlserver':
  default:
    return sqlserverDDL.alterTables(tables);
  }
}

export function alterTableScript(dbType: string, conn: any, tables: any, table: any): Promise<any> {
  switch (dbType) {
  case 'mysql':
    return mysqlDDL.alterTableScript(conn, tables, table);
  case 'sqlserver':
  default:
    return sqlserverDDL.alterTableScript(conn, tables, table);
  }
}

export function createTableScript(dbType: string, conn: any, tables: any, table: any): Promise<any> {
  switch (dbType) {
  case 'mysql':
    return mysqlDDL.createTableScript(conn, tables, table);
  case 'sqlserver':
  default:
    return sqlserverDDL.createTableScript(conn, tables, table);
  }
}

export function createTables(dbType: string, tables: any): Promise<any> {
  switch (dbType) {
  case 'mysql':
    return mysqlDDL.createTables(tables);
  case 'sqlserver':
  default:
    return sqlserverDDL.createTables(tables);
  }
}

export function initializeLogger(dbType: string, loggerLog: Logger): Promise<any> {
  switch (dbType) {
  case 'mysql':
    return mysqlDDL.initializeLogger(loggerLog);
  case 'sqlserver':
  default:
    return sqlserverDDL.initializeLogger(loggerLog);
  }
}
