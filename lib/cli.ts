#! /usr/bin/env node
const {program} = require('commander');
const {generatePrismaSchemaFromEntities} = require('./index');
require('dotenv').config({path: `.env`});

program.requiredOption('-e, --entities <path>', 'Path to entities');
program.option('-s, --schema-path <path>', 'Path for the schema file to be created');
program.showHelpAfterError();

const {POSTGRESQL_HOST, POSTGRESQL_USERNAME, POSTGRESQL_PASSWORD, POSTGRESQL_DB} = process.env;

if (!POSTGRESQL_HOST) {
  program.requiredOption('-h, --db-host <key>', 'Database host ');
}
if (!POSTGRESQL_USERNAME) {
  program.requiredOption('-u, --db-username <key>', 'Database username');
}
if (!POSTGRESQL_PASSWORD) {
  program.requiredOption('-p, --db-password <key>', 'Database password');
}
if (!POSTGRESQL_DB) {
  program.requiredOption('-d, --db-database <key>', 'Database name');

}

program.parse(process.argv);
const options = program.opts()
const {entities, dbHost, dbUsername, dbPassword, dbDatabase, schemaPath} = options;

generatePrismaSchemaFromEntities(
  entities,
  dbHost || POSTGRESQL_HOST,
  dbUsername || POSTGRESQL_USERNAME,
  dbPassword || POSTGRESQL_PASSWORD,
  dbDatabase || POSTGRESQL_DB,
  schemaPath,
)
.then(() => {
  console.log("The schema.prisma file has been generated successfully")
  process.exit(0)
})
.catch((err) => {
  console.error(err)
  process.exit(1)
})