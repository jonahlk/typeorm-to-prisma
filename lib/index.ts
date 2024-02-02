import {createConnection} from 'typeorm';
import {generateObjectFromTypeormEntities} from 'typeorm-to-json';
import {generatePrismaSchema} from './generate-schema';

export const generatePrismaSchemaFromEntities = async (
  pathToEntities: string,
  pgHost: string,
  pgUsername: string,
  pgPassword: string,
  pgDb: string,
  schemaPath?: string,
  makeCompanyIdOptional?: boolean,
) => {
  const typeorm = await createConnection({
    type: 'postgres',
    host: pgHost,
    username: pgUsername,
    password: pgPassword,
    database: pgDb,
    entities: [pathToEntities],
  });

  const models = await generateObjectFromTypeormEntities(typeorm);
  console.log(`Generating Prisma File for ${models.length} models...`);
  generatePrismaSchema(models, schemaPath, makeCompanyIdOptional);
};
