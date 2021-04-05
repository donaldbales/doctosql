import test from 'ava';

const DOCTOSQL_DB_TYPE: string = (process.env.DOCTOSQL_DB_TYPE as string) || 'sqlserver'
const Database: any = require(`../../../src/lib/${DOCTOSQL_DB_TYPE}/Database`);

test('Database - ', (t) => {
  t.true(Database instanceof Object);
});
