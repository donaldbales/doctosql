"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("../Logger");
const log = Logger_1.instance.log;
class Database {
    constructor(config) {
        const mysql = require('mysql');
        this.pool = mysql.createPool({
            connectionLimit: 10,
            database: config.options.database,
            host: config.server,
            password: config.password,
            port: config.options.port,
            user: config.userName
        });
        this.pool.on('error', (e) => log.error(`Database Error: ${e.message}`));
    }
    get connection() {
        log.trace('Acquire connection');
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, conn) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YWJhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJEYXRhYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLHNDQUErQztBQUUvQyxNQUFNLEdBQUcsR0FBRyxpQkFBTSxDQUFDLEdBQUcsQ0FBQztBQUV2QixNQUFxQixRQUFRO0lBRzNCLFlBQVksTUFBVztRQUNyQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLElBQUksR0FBSSxLQUFLLENBQUMsVUFBVSxDQUFDO1lBQzVCLGVBQWUsRUFBRyxFQUFFO1lBQ3BCLFFBQVEsRUFBVSxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVE7WUFDekMsSUFBSSxFQUFjLE1BQU0sQ0FBQyxNQUFNO1lBQy9CLFFBQVEsRUFBVSxNQUFNLENBQUMsUUFBUTtZQUNqQyxJQUFJLEVBQWMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJO1lBQ3JDLElBQUksRUFBYyxNQUFNLENBQUMsUUFBUTtTQUNsQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFRLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakYsQ0FBQztJQUVELElBQUksVUFBVTtRQUNaLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNoQyxPQUFPLElBQUksT0FBTyxDQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFFLENBQUMsR0FBUSxFQUFFLElBQVMsRUFBRSxFQUFFO2dCQUMvQyxJQUFJLEdBQUcsRUFBRTtvQkFDUCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNmLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNwQjtnQkFDRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBN0JELDJCQTZCQyJ9