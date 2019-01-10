import { ConnectionConfig } from 'tedious';
import * as ConnectionPool from 'tedious-connection-pool';
import { PooledConnection } from 'tedious-connection-pool';

import { instance as logger } from './Logger';

const log = logger.log;

export default class Database {
  private pool: ConnectionPool;

  constructor(config: ConnectionConfig) {
    this.pool = new ConnectionPool({ min: 1, max: 10, log: false }, config);
    this.pool.on('error', (e: Error) => log.error(`Database Error: ${e.message}`));
  }

  get connection(): Promise<PooledConnection> {
    log.trace('Acquire connection');
    return new Promise<PooledConnection>((resolve, reject) => {
      this.pool.acquire((err, conn) => {
        if (err) {
          log.error(err);
          return reject(err);
        }
        return resolve(conn);
      });
    });
  }
}
