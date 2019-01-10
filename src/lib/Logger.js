"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bunyan = require("bunyan");
const blackhole = require("bunyan-blackhole");
const _ = require("lodash");
class Logger {
    constructor(options) {
        const pkg = require('../../package');
        const opts = _.assign({}, options, { name: pkg.name });
        this.properties = opts;
        if (opts.disable === true || process.env.LOG_LEVEL === 'none') {
            this.properties.disabled = true;
            this.log = blackhole(opts.name);
        }
        else {
            this.log = Bunyan.createLogger(opts);
        }
    }
}
exports.Logger = Logger;
exports.instance = new Logger({
    level: _.find(['trace', 'debug', 'info', 'warn', 'error', 'fatal'], process.env.LOG_LEVEL || 'info'),
    name: '',
    stream: process.stdout
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiTG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaUNBQWlDO0FBQ2pDLDhDQUErQztBQUMvQyw0QkFBNEI7QUFFNUI7SUFJRSxZQUFZLE9BQTZCO1FBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNyQyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFFdkQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFFdkIsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLElBQUksSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsS0FBSyxNQUFNLEVBQUU7WUFDN0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNqQzthQUFNO1lBQ0wsSUFBSSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3RDO0lBQ0gsQ0FBQztDQUNGO0FBakJELHdCQWlCQztBQUVVLFFBQUEsUUFBUSxHQUFHLElBQUksTUFBTSxDQUFDO0lBQy9CLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQXNCLEVBQ3JGLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLE1BQU0sQ0FBQztJQUNsQyxJQUFJLEVBQUUsRUFBRTtJQUNSLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtDQUN2QixDQUFDLENBQUMifQ==