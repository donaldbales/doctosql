import * as doctosql from '../src/index';
const entityName = 'TEST_DOCTO_SQL';
const docs: any[] = [
  {
    config: 'arbitrary_config_changed',
    id: 'some_id',
    rev: 'some_rev_changed_again'
  }
];

// To insert, or update, all
doctosql.load(entityName, docs);
