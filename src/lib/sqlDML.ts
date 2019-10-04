// sqlServer

/* tslint:disable:no-console */

import Logger from 'bunyan';
import * as mysqlDML from './mysql/sqlDML';
import * as sqlserverDML from './sqlserver/sqlDML';

export async function initializeRevisions(dbType: string, tables: any): Promise<any> {
  switch (dbType) {
  case 'mysql':
    return mysqlDML.initializeRevisions(tables);
  case 'sqlserver':
  default:
    return sqlserverDML.initializeRevisions(tables);
  }
}

export function initializeLogger(dbType: string, loggerLog: Logger): Promise<any> {
  switch (dbType) {
  case 'mysql':
    return mysqlDML.initializeLogger(loggerLog)
  case 'sqlserver':
  default:
    return sqlserverDML.initializeLogger(loggerLog);
  }
}

export async function mergeDoc(dbType: string, tables: any, doc: any, evented: boolean = false): Promise<any> {
  switch (dbType) {
  case 'mysql':
    return mysqlDML.mergeDoc(tables, doc, evented);
  case 'sqlserver':
  default:
    return sqlserverDML.mergeDoc(tables, doc, evented);
  }
}

export async function mergeDocs(dbType: string, tables: any, docs: any[], evented: boolean = false): Promise<any> {
  switch (dbType) {
  case 'mysql':
    return mysqlDML.mergeDocs(tables, docs, evented);
  case 'sqlserver':
  default:
    return sqlserverDML.mergeDocs(tables, docs, evented);
  }
}
