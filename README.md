# doctosql
Javascript Document to Relational Database Integration

## Release

1.0.0 Only support for SQL Server. Added unit tests using AVA

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

NOTE: Each document must have an id or _id, and a rev or _rev attributes.

## Support

Supports Node versions 8 - 12. Node version 14 breaks one of the dependent packages.

Feel free to email don@donaldbales.com with and complaints and questions.

Look at the todo.txt docu,ment for what I'm working on next.
