"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const DOCTOSQL_DB_TYPE = process.env.DOCTOSQL_DB_TYPE || 'sqlserver';
const Database = require(`../../../src/lib/${DOCTOSQL_DB_TYPE}/Database`);
ava_1.default('Database - ', (t) => {
    t.true(Database instanceof Object);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YWJhc2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkRhdGFiYXNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw2QkFBdUI7QUFFdkIsTUFBTSxnQkFBZ0IsR0FBWSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUEyQixJQUFJLFdBQVcsQ0FBQTtBQUN4RixNQUFNLFFBQVEsR0FBUSxPQUFPLENBQUMsb0JBQW9CLGdCQUFnQixXQUFXLENBQUMsQ0FBQztBQUUvRSxhQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7SUFDeEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLFlBQVksTUFBTSxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMifQ==