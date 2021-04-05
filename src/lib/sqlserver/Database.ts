import { ConnectionConfig } from 'tedious';
const ConnectionPool = require('./connection-pool');
const PooledConnection = require('./connection-pool').PoolConnection;

import { instance as logger } from '../Logger';

const log = logger.log;

export default class Database {
  private pool: any;

  constructor(config: ConnectionConfig) {
    this.pool = new ConnectionPool({ min: 1, max: 10, log: false }, config);
    this.pool.on('error', (e: Error) => log.error(`Database Error: ${e.message}`));
  }

  get connection(): Promise<any> {
    log.trace('Acquire connection');
    return new Promise<any>((resolve, reject) => {
      this.pool.acquire((err: any, conn: any) => {
        if (err) {
          log.error(err);
          return reject(err);
        }
        return resolve(conn);
      });
    });
  }
}
