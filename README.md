<p style="text-align: center">
    <img src="./logo.png" alt="logo">
</p>

# Prisma Schema Generator

CLI Tool to generate a `schema.prisma` file from TypeORM entities.

You can now combine the power of two ORM's with their own strengths and weaknesses.

While TypeORM offers a beautiful way to define models/entities with their relations, the client lacks a bit of functionality and simplicity. That is where prisma comes into play. It offers a super intuitive and easy way to query the data but its
model definition is limited to their `schema.prisma` file.

The biggest issue with Prisma is the lack of a robust migration interface lacking several key features, notably database migration rollbacks.

With this package, you are now able to use (or keep your existing) TypeORM entities and migrations, and then query the data with the Prisma Client.

This tool searches for all entities in your TypeORM connection and converts them to the Prisma schema format which can then be used by the Prisma client. It keeps all ManyToOne & OneToOne relations and automatically generates the inverted OneToMany
relation(s).

### Known Limitations

- Only tested/working with PostgreSQL
- Not tested with ManyToMany relations
- When an entity references the same model twice, the generator is not able to generate the inverted relations. You will have to add the ManyToOne and OneToMany relations with the inverseSide manually.
- It's necessary to pass the Postgres column type in the TypeORM entity.

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

## Example

This typeorm entity:

```typescript
@Unique(['email'])
@Entity('users')
export class User {
  @PrimaryGeneratedColumn({name: 'id', type: 'integer'})
  id: number;

  @Column('integer', {name: 'company_id'})
  companyId: number;

  @Column('character varying', {name: 'first_name', nullable: true, length: 255})
  firstName: string | null;

  @Column('character varying', {name: 'last_name', nullable: true, length: 255})
  lastName: string | null;

  @Column('character varying', {name: 'email', length: 255})
  email: string;

  @ManyToOne(() => Company, company => company.users)
  @JoinColumn([{name: 'company_id', referencedColumnName: 'id'}])
  company: Company;
}
```

would be transformed to:

```prisma
model User {
  id                Int       @id @map("id")
  companyId         Int       @map("company_id")
  firstName         String?   @map("first_name")
  lastName          String?   @map("last_name")
  email             String    @map("email")
  
  company           Company?  @relation(name: "company", references: [id], fields: [companyId])

  @@unique([email])
  @@map("users")
}
```
