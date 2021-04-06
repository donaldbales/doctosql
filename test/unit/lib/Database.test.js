"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const DOCTOSQL_DATABASE = process.env.DOCTOSQL_DATABASE || 'sqlserver';
const Database = require(`../../../src/lib/${DOCTOSQL_DATABASE}/Database`);
ava_1.default('Database - ', (t) => {
    t.true(Database instanceof Object);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YWJhc2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkRhdGFiYXNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw2QkFBdUI7QUFFdkIsTUFBTSxpQkFBaUIsR0FBWSxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUE0QixJQUFJLFdBQVcsQ0FBQTtBQUMxRixNQUFNLFFBQVEsR0FBUSxPQUFPLENBQUMsb0JBQW9CLGlCQUFpQixXQUFXLENBQUMsQ0FBQztBQUVoRixhQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7SUFDeEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLFlBQVksTUFBTSxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMifQ==