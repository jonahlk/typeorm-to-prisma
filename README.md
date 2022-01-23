# typeorm-to-prisma

CLI Tool to generate prisma.schema file from typeorm entities

## Installation

```
npm install typeorm-to-prisma
```

## Usage

```
generate-prisma -e "<pathToEntities>" -s "<pathToNewSchemaFile>"
```

The database connection can either be set in a `.env` file like:

```
POSTGRES_HOST=localhost
POSTGRES_USERNAME=username
POSTGRES_PASSWORD=password
POSTGRES_DB=database_name
```

or by passing the following flags:

```
-h <host> 
-u <dbUser> 
-p <dbPassowrd> 
-d <dbName>
```
