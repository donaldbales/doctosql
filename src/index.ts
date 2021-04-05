// index

/* tslint:disable:no-console */

const DOCTOSQL_DB_TYPE: string = (process.env.DOCTOSQL_DB_TYPE as string) || 'sqlserver'

import * as doc from './lib/docMetadata';
import * as Logger from './lib/Logger';
import * as sql from './lib/sqlMetadata';

const ddl: any = require(`./lib/${DOCTOSQL_DB_TYPE}/sqlDDL`);
const dml: any = require(`./lib/${DOCTOSQL_DB_TYPE}/sqlDML`);

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

  await ddl.initializeLogger(log);
  const creates = await ddl.createTables(tables);
  const alters = await ddl.alterTables(tables);

  await dml.initializeLogger(log);

  await dml.initializeRevisions(tables);

  const merges = await dml.mergeDocs(tables, docs);

  log.info({ moduleName, methodName }, `Finished at ${new Date().toISOString()}.`);

  return { result: true };
}
