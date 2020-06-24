import test from 'ava';
import * as logger from '../../../src/lib/Logger';

const loggerInstance: any = logger.instance;

test('Logger - ', (t) => {
  t.true(loggerInstance instanceof Object);
});
