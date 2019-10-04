
import { instance as logger } from '../Logger';

const log = logger.log;

export default class Database {
  private pool: any;

  constructor(config: any) {
    const mysql = require('mysql');
    this.pool  = mysql.createPool({
      connectionLimit : 10,
      database        : config.options.database,
      host            : config.server,
      password        : config.password,
      port            : config.options.port,
      user            : config.userName
    });

    this.pool.on('error', (e: Error) => log.error(`Database Error: ${e.message}`));
  }

  get connection(): Promise<any> {
    log.trace('Acquire connection');
    return new Promise<any>((resolve, reject) => {
      this.pool.getConnection( (err: any, conn: any) => {
        if (err) {
          log.error(err);
          return reject(err);
        }
        return resolve(conn);
      });
    });
  }
}
