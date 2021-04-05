// index

/* tslint:disable:no-console */

import * as doc from './lib/docMetadata';
import * as Logger from './lib/Logger';
import * as ddl from './lib/sqlDDL';
import * as dml from './lib/sqlDML';
import * as sql from './lib/sqlMetadata';

const moduleName: string = 'src/index.js';

<<<<<<< HEAD
export async function load(entityName: string, docs: any[], logger: any = null): Promise<any> {
=======
const DB_TYPE = process.env.DOCTOSQL_DB_TYPE as string || 'sqlserver'

export async function load(entityName: string, docs: any[]): Promise<any> {
>>>>>>> hackathon-2019
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

  await ddl.initializeLogger(DB_TYPE, log);
  const creates = await ddl.createTables(DB_TYPE, tables);
  const alters = await ddl.alterTables(DB_TYPE, tables);

  await dml.initializeLogger(DB_TYPE, log);

  const merges = await dml.mergeDocs(DB_TYPE, tables, docs);

  log.info({ moduleName, methodName }, `Finished at ${new Date().toISOString()}.`);

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

  await ddl.initializeLogger(DB_TYPE, log);
  const creates = await ddl.createTables(DB_TYPE, tables);
  const alters = await ddl.alterTables(DB_TYPE, tables);

  await dml.initializeLogger(DB_TYPE, log);

  await dml.initializeRevisions(DB_TYPE, tables);

  const merges = await dml.mergeDocs(DB_TYPE, tables, docs);

  log.info({ moduleName, methodName }, `Finished at ${new Date().toISOString()}.`);

  return { result: true };
}
