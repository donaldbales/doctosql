// index

/* tslint:disable:no-console */

import * as doc from './lib/docMetadata';
import { inspect } from './lib/inspect';
import * as Logger from './lib/Logger';
import * as ddl from './lib/sqlDDL';
import * as dml from './lib/sqlDML';
import * as sql from './lib/sqlMetadata';

const moduleName: string = 'src/index.js';

export async function load(application: string, docs: any[]): Promise<any> {
  const methodName: string = `full`;
  const log: any = Logger.instance.log;
  const logLevel: string = (process.env.DOCTOSQL_LOG_LEVEL as string) || (process.env.LOG_LEVEL as string);
  if (logLevel) {
    log.level(logLevel);
  }
  log.info({ moduleName, methodName }, `Starting at ${new Date().toISOString()}`);

  await doc.initializeLogger(log);
  const attrs = await doc.analyzeDocuments(application.toLocaleLowerCase(), docs);

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
