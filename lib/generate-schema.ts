import * as fs from 'fs';
import {ModelDefinition} from 'typeorm-to-json/dist/types';
import {generateBlankSpaces, postgresToPrismaTypeMapping} from './helpers';
import * as crypto from 'crypto';
import {v4 as uuidv4} from 'uuid';


export const generatePrismaSchema = (models: ModelDefinition[], schemaPath?: string, makeCompanyIdOptional = false) => {
  const prismaSchema = [];

  prismaSchema.push(`generator client {\n  provider = "prisma-client-js"\n  previewFeatures = ["interactiveTransactions"]\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n`);
  for (const _model of models) {

    const longestFieldNameLength = _model.fields.reduce((acc, field) => field.name.length > acc ? field.name.length : acc, 0);
    const longestRelationNameLength = _model.relations.reduce((acc, relation) => relation.name.length > acc ? relation.name.length : acc, 0);
    const longestRelationTypeLength = _model.relations.reduce((acc, relation) => relation.referencedModel.length > acc ? relation.referencedModel.length : acc, 0);

    const longestFieldTypeLength = _model.fields.reduce((acc, field) => {
      const mappedType = postgresToPrismaTypeMapping[field.dbType as any];
      if (!mappedType) {
        throw new Error(`Unknown type ${field.dbType}, please check your entity file or add to postgres mapping.`);
      }
      if (mappedType.length > acc) {
        return mappedType.length;
      }
      return acc;
    }, 0);

    const longestPropertyLength = longestFieldNameLength > longestRelationNameLength ? longestFieldNameLength : longestRelationNameLength;
    const longestTypeLength = longestFieldTypeLength > longestRelationTypeLength ? longestFieldTypeLength : longestRelationTypeLength;

    const prismaFields: string[] = [];
    for (const _field of _model.fields) {
      let mappedType = postgresToPrismaTypeMapping[_field.dbType as unknown as string] || _field.dbType;
      if (_field.isArray) {
        mappedType += '[]';
      }
      const blankSpacesAfterProperty = generateBlankSpaces(longestPropertyLength, _field.name.length);
      const blankSpacesAfterType = generateBlankSpaces(longestTypeLength, mappedType.length);

      const prismaMap = `@map("${_field.dbColumnName}")`;
      const prismaUnique = `@unique`;
      const prismaPrimary = `@id`;
      const prismaGenerated = `@default(dbgenerated())`;
      const isOptional = !_field.isPrimary && !mappedType.includes('[]') && (_field.isNullable || _model.type === 'view' || (_field.name === 'companyId' && makeCompanyIdOptional));
      prismaFields.push(`  ${_field.name}${blankSpacesAfterProperty}${mappedType}${isOptional ? '?' : ''}${blankSpacesAfterType}${prismaMap}  ${_field.isPrimary ? prismaPrimary : _field.isUnique ? prismaUnique : ''} ${_field.isGenerated ? prismaGenerated : ''}`);
    }

    const prismaRelations: string[] = [];
    const referencedModels = _model.relations.map(relation => relation.referencedModel);

    const uniqueElements = new Set(referencedModels);
    const referencedModelsWithMultipleRelations = referencedModels.filter(item => {
      if (uniqueElements.has(item)) {
        uniqueElements.delete(item);
      } else {
        return item;
      }
    });

    for (const _relation of _model.relations) {

      const blankSpacesAfterProperty = generateBlankSpaces(longestPropertyLength, _relation.name.length);
      const showRelationName = referencedModelsWithMultipleRelations.includes(_relation.referencedModel);
      const randomConstraintName = `, map: "${uuidv4()}_fk"`;
      const constraintHash = `, map: "${crypto.createHash('md5').update(`${_relation.type}_${_relation.referencedModel}_${_relation.fields}`).digest('hex')}_fk"`;
      
      console.log(constraintHash);

      if (['many-to-one'].includes(_relation.type)) {
        const blankSpacesAfterType = generateBlankSpaces(longestTypeLength, _relation.referencedModel.length);
        const relationKey = `name: "${_relation.name}", `;
        const relationDefinition = `@relation(${showRelationName ? relationKey : ''}references: [${_relation.references}], fields: [${_relation.fields}]${constraintHash})`;
        prismaRelations.push(`  ${_relation.name}${blankSpacesAfterProperty}${_relation.referencedModel}?${blankSpacesAfterType}${relationDefinition}`);
      }

      if (['one-to-many'].includes(_relation.type)) {
        const blankSpacesAfterType = generateBlankSpaces(longestTypeLength, _relation.referencedModel.length + 2);
        const relationKey = `name: "${_relation.key}"`;
        const showModelAsArray = _relation.type === 'one-to-one' ? '?' : '[]';
        prismaRelations.push(`  ${_relation.name}${blankSpacesAfterProperty}${_relation.referencedModel}${showModelAsArray}${blankSpacesAfterType}${showRelationName ? `@relation(${relationKey})` : ''}`);
      }

      if (['one-to-one'].includes(_relation.type)) {
        const blankSpacesAfterType = generateBlankSpaces(longestTypeLength, _relation.referencedModel.length);
        const relationKey = `name: "${_relation.key}"`;
        const fields = !!_relation.fields.length ? `, fields: [${_relation.fields}]` : '';
        const references = !!_relation.fields.length ? `, references: [${_relation.references}]` : '';
        const relationDefinition = `@relation(${relationKey}${fields}${references}${constraintHash})`;
        prismaRelations.push(`  ${_relation.name}${blankSpacesAfterProperty}${_relation.referencedModel}?${blankSpacesAfterType}${relationDefinition}`);
      }
    }

    const uniqueConstraints = _model.constraints.filter(constraint => constraint.type === 'unique');

    const prismaUniqueConstraints: string[] = [];
    for (const _uniqueConstraint of uniqueConstraints) {
      const columns = _uniqueConstraint.columns.map(column => column.name).join(', ');
      prismaUniqueConstraints.push(`  @@unique([${columns}], map: "${_uniqueConstraint.name}")`);
    }

    const primaryConstraint = _model.constraints.find(constraint => constraint.type === 'primary');

    const prismaPrimaryKey = `  @@id([${primaryConstraint?.columns.map(x => x.name).join(', ')}])`;
    const prismaMap = `  @@map("${_model.tableName}")`;
    const blockAttributes = [primaryConstraint ? prismaPrimaryKey : '', ...prismaUniqueConstraints, prismaMap];
    const modelRow = `model ${_model.name} {\n${prismaFields.join('\n')}\n\n${prismaRelations.join('\n')}\n${blockAttributes.join('\n')}\n}\n`;
    prismaSchema.push(modelRow);
  }
  fs.writeFileSync(schemaPath ? `${schemaPath}/schema.prisma` : `./schema.prisma`, prismaSchema.join('\n'));
};
