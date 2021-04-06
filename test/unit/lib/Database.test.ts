import test from 'ava';

const DOCTOSQL_DATABASE: string = (process.env.DOCTOSQL_DATABASE as string) || 'sqlserver'
const Database: any = require(`../../../src/lib/${DOCTOSQL_DATABASE}/Database`);

test('Database - ', (t) => {
  t.true(Database instanceof Object);
});
