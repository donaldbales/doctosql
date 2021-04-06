"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const ConnectionPool = require('./connection-pool');
const PooledConnection = require('./connection-pool').PoolConnection;
const Logger_1 = require("../Logger");
const log = Logger_1.instance.log;
class Database {
    constructor(config = {}) {
        this.pool = new ConnectionPool({ min: 1, max: 10, log: false }, config);
        this.pool.on('error', (e) => log.error(`Database Error: ${e.message}`));
    }
    get connection() {
        log.info('Acquire connection');
        return new Promise((resolve, reject) => {
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
exports.Database = Database;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YWJhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJEYXRhYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUNwRCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQztBQUVyRSxzQ0FBK0M7QUFFL0MsTUFBTSxHQUFHLEdBQUcsaUJBQU0sQ0FBQyxHQUFHLENBQUM7QUFFdkIsTUFBYSxRQUFRO0lBR25CLFlBQVksU0FBMkIsRUFBRTtRQUN2QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksY0FBYyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFRLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakYsQ0FBQztJQUVELElBQUksVUFBVTtRQUNaLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMvQixPQUFPLElBQUksT0FBTyxDQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBUSxFQUFFLElBQVMsRUFBRSxFQUFFO2dCQUN4QyxJQUFJLEdBQUcsRUFBRTtvQkFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNmLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNwQjtnQkFDRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBcEJELDRCQW9CQyJ9