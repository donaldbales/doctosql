"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConnectionPool = require('./connection-pool');
const PooledConnection = require('./connection-pool').PoolConnection;
const Logger_1 = require("../Logger");
const log = Logger_1.instance.log;
class Database {
    constructor(config) {
        this.pool = new ConnectionPool({ min: 1, max: 10, log: false }, config);
        this.pool.on('error', (e) => log.error(`Database Error: ${e.message}`));
    }
    get connection() {
        log.trace('Acquire connection');
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
exports.default = Database;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YWJhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJEYXRhYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUMsY0FBYyxDQUFDO0FBRXJFLHNDQUErQztBQUUvQyxNQUFNLEdBQUcsR0FBRyxpQkFBTSxDQUFDLEdBQUcsQ0FBQztBQUV2QixNQUFxQixRQUFRO0lBRzNCLFlBQVksTUFBd0I7UUFDbEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLGNBQWMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBUSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDWixHQUFHLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDaEMsT0FBTyxJQUFJLE9BQU8sQ0FBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQVEsRUFBRSxJQUFTLEVBQUUsRUFBRTtnQkFDeEMsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDZixPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDcEI7Z0JBQ0QsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXBCRCwyQkFvQkMifQ==