import * as fs from 'fs';
import {ModelDefinition} from 'typeorm-to-json/dist/types';
import {generateBlankSpaces, postgresToPrismaTypeMapping} from './helpers';


export const generatePrismaSchema = (models: ModelDefinition[], schemaPath?: string) => {
  const prismaSchema = [];

  prismaSchema.push(`generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n`);
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
      const mappedType = postgresToPrismaTypeMapping[_field.dbType as unknown as string] || _field.dbType;

      const blankSpacesAfterProperty = generateBlankSpaces(longestPropertyLength, _field.name.length);
      const blankSpacesAfterType = generateBlankSpaces(longestTypeLength, mappedType.length);

      const prismaMap = `@map("${_field.dbColumnName}")`;
      const prismaUnique = `@unique`;
      const prismaPrimary = `@id`;
      const isOptional = !_field.isPrimary && (_field.isNullable || _model.type === 'view') && !mappedType.includes('[]');
      prismaFields.push(`  ${_field.name}${blankSpacesAfterProperty}${mappedType}${isOptional ? '?' : ''}${blankSpacesAfterType}${prismaMap}  ${_field.isPrimary ? prismaPrimary : _field.isUnique ? prismaUnique : ''}`);
    }

    const prismaRelations: string[] = [];
    const referencedModels = _model.relations.map(relation => relation.referencedModel);

    const uniqueElements = new Set(referencedModels);
    const referencedModelsWithMultipleRelations = referencedModels.filter(item => {
      if (uniqueElements.has(item)) {
        uniqueElements.delete(item);
      }
      else {
        return item;
      }
    });

    for (const _relation of _model.relations) {
      const blankSpacesAfterProperty = generateBlankSpaces(longestPropertyLength, _relation.name.length);
      const showRelationName = referencedModelsWithMultipleRelations.includes(_relation.referencedModel);
      if (['many-to-one'].includes(_relation.type)) {
        const blankSpacesAfterType = generateBlankSpaces(longestTypeLength, _relation.referencedModel.length);
        const relationKey = `name: "${_relation.name}", `;
        const relationDefinition = `@relation(${showRelationName ? relationKey : ''}references: [${_relation.references}], fields: [${_relation.fields}])`;
        prismaRelations.push(`  ${_relation.name}${blankSpacesAfterProperty}${_relation.referencedModel}?${blankSpacesAfterType}${relationDefinition}`);
      }
      if (['one-to-many', 'one-to-one'].includes(_relation.type)) {
        const blankSpacesAfterType = generateBlankSpaces(longestTypeLength, _relation.referencedModel.length + 2);
        const relationKey = `name: "${_relation.key}"`;
        const showModelAsArray = _relation.type === 'one-to-one' ? '?' : '[]';
        prismaRelations.push(`  ${_relation.name}${blankSpacesAfterProperty}${_relation.referencedModel}${showModelAsArray}${blankSpacesAfterType}${showRelationName ? `@relation(${relationKey})` : ''}`);
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
