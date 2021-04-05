import * as doctosql from '../src/index';
const entityName = 'TEST_DOCTO_SQL';
const docs: any[] = [
  {
    complex_object: {
      good_stuff: 'good stuff value 1',
      more_stuff: 'more stuff value 1'
    },
    config: 'config 1',
    id: 'id1',
    rev: 'rev1-1'
  },
  {
    complex_object: {
      good_stuff: 'good stuff value 2',
      more_stuff: 'more stuff value 2'
    },
    config: 'config 2',
    id: 'id2',
    rev: 'rev2-1'
  },
  {
    complex_object: {
      good_stuff: 'good stuff value 3',
      more_stuff: 'more stuff value 3'
    },
    config: 'config 3',
    id: 'id3',
    rev: 'rev3-1'
  }
];

// To insert, or update, all
doctosql.load(entityName, docs);
// doctosql.incr(entityName, docs);
