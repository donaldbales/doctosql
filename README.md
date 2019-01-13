# doctosql
Javascript Document to Relational Data Integration

## Configuration

Environment Variables

DOCTOSQL_LOG_LEVEL=a bunyan log level: trace | debug | info | warn | error | fatal 

DOCTOSQL_RDBMS='a tedious connection document'
  
For example: 
```
  {
    "userName":"myUsername",
    "password":"myPassword",
    "server":"myServer.database.windows.net",
    "database":"myDatabase"
  }
```

## Installation

Using npm:
```shell
$ npm i --save doctosql
```

In Node.js:
```js
var doctosql = require('doctosql');
var entityName = 'TABLE_NAME';
var docs = [
  <one or more similar documents...>,
]

// To insert, or update, all
doctosql.load(tablePrefix, docs);
// or
// To insert, or update, skipping those with same revision
doctosql.incr(tablePrefix, docs);
```
