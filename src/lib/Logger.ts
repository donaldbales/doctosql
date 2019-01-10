import * as Bunyan from 'bunyan';
import blackhole = require('bunyan-blackhole');
import * as _ from 'lodash';

export class Logger {
  public log: Bunyan;
  private properties: Bunyan.LoggerOptions;

  constructor(options: Bunyan.LoggerOptions) {
    const pkg = require('../../package');
    const opts = _.assign({}, options, { name: pkg.name });

    this.properties = opts;

    if (opts.disable === true || process.env.LOG_LEVEL === 'none') {
      this.properties.disabled = true;
      this.log = blackhole(opts.name);
    } else {
      this.log = Bunyan.createLogger(opts);
    }
  }
}

export let instance = new Logger({
  level: _.find(['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as Bunyan.LogLevel[],
    process.env.LOG_LEVEL || 'info'),
  name: '',
  stream: process.stdout
});
