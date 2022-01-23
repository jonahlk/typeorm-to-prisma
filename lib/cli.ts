#! /usr/bin/env node
const { program } = require('commander');
const {generatePrismaSchemaFromEntities} = require('./index')

program.requiredOption('-e, --entities <path>', 'Path to entities')
program.option('-s, --schema-path <path>', 'Path for the schema file to be created')
program.showHelpAfterError();

const {POSTGRES_HOST, POSTGRES_USERNAME, POSTGRES_PASSWORD, POSTGRES_DB} = process.env

if(!POSTGRES_HOST) {
  program.requiredOption('-h, --db-host <key>', 'Database host ')
}
if(!POSTGRES_USERNAME) {
  program.requiredOption('-u, --db-username <key>', 'Database username')
}
if(!POSTGRES_PASSWORD) {
  program.requiredOption('-p, --db-password <key>', 'Database password')
}
if(!POSTGRES_DB) {
  program.requiredOption('-d, --db-database <key>', 'Database name')

}

program.parse(process.argv);
const options = program.opts()
const {entities, dbHost, dbUsername, dbPassword, dbDatabase, schemaPath} = options;

generatePrismaSchemaFromEntities(
  entities,
  dbHost || POSTGRES_HOST,
  dbUsername || POSTGRES_USERNAME,
  dbPassword || POSTGRES_PASSWORD,
  dbDatabase || POSTGRES_DB,
  schemaPath
)
.then(() => {
  console.log("The schema.prisma file has been generated successfully")
  process.exit(0)
})
.catch((err) => {
  console.error(err)
  process.exit(1)
})