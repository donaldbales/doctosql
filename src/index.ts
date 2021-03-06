// index

/* tslint:disable:no-console */

import * as doc from './lib/docMetadata';
import { inspect } from './lib/inspect';
import * as Logger from './lib/Logger';
import * as ddl from './lib/sqlDDL';
import * as dml from './lib/sqlDML';
import * as sql from './lib/sqlMetadata';

const moduleName: string = 'src/index.js';

export async function load(entityName: string, docs: any[], logger: any = null): Promise<any> {
  const methodName: string = `load`;
  const log: any = logger == null ? Logger.instance.log : logger;
  const logLevel: string = (process.env.DOCTOSQL_LOG_LEVEL as string) ||
    (process.env.LOG_LEVEL as string);
  if (log.level && logLevel) {
    log.level(logLevel);
  }
  log.info({ moduleName, methodName }, `Starting at ${new Date().toISOString()}`);

  await doc.initializeLogger(log);
  const attrs = await doc.analyzeDocuments(entityName.toLocaleLowerCase(), docs);

  await sql.initializeLogger(log);
  const tables = sql.analyzeDocumentMetadata(attrs);

  await ddl.initializeLogger(log);
  const creates = await ddl.createTables(tables);
  const alters = await ddl.alterTables(tables);

  await dml.initializeLogger(log);

  const merges = await dml.mergeDocs(tables, docs);

  log.info({ moduleName, methodName }, `Fininshed at ${new Date().toISOString()}.`);

  return { result: true };
}

export async function incr(entityName: string, docs: any[], logger: any = null): Promise<any> {
  const methodName: string = `incr`;
  const log: any = logger == null ? Logger.instance.log : logger;
  const logLevel: string = (process.env.DOCTOSQL_LOG_LEVEL as string) ||
    (process.env.LOG_LEVEL as string);
  if (log.level && logLevel) {
    log.level(logLevel);
  }
  log.info({ moduleName, methodName }, `Starting at ${new Date().toISOString()}`);

  await doc.initializeLogger(log);
  const attrs = await doc.analyzeDocuments(entityName.toLocaleLowerCase(), docs);

  await sql.initializeLogger(log);
  const tables = sql.analyzeDocumentMetadata(attrs);

  await ddl.initializeLogger(log);
  const creates = await ddl.createTables(tables);
  const alters = await ddl.alterTables(tables);

  await dml.initializeLogger(log);

  await dml.initializeRevisions(tables);

  const merges = await dml.mergeDocs(tables, docs);

  log.info({ moduleName, methodName }, `Fininshed at ${new Date().toISOString()}.`);

  return { result: true };
}
