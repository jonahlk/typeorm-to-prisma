<p align='center'>
    <img src="./logo.png">
</p>

# Prisma Schema Generator

CLI Tool to generate prisma.schema file from typeorm entities

You can now combine the power of two orm's with their own strengths and weaknesses.

While typeorm offers a beautiful way to define models/entities with their relations, the client lacks a bit of functionality and simplicity. That is where prisma comes into play. Its offers a super intuitive and easy way to query the data but its
model definition is limited to their schema.prisma file.

The biggest issue with prisma, at least in my opinion, is that their migration interface is not supporting many things. The whole migration interface is not very intuitive and you cant e.g. roll back migrations.

So with this little package you are now able to use (or keep your existing) typeorm entities and migrations, while quering the data with the prisma client.

It searches for all entities in your typeorm connection and converts them to the prisma.schema format which can then be used by the prisma client. It keeps all ManyToOne & OneToOne relations and automatically generates the inverted OneToMany
relation(s).

### Known Limitations

- Only tested/working with postgresql
- Not tested with ManyToMany relations
- When an entity references the same model twice, the generator is not able to generate the inverted relations. You will have to add the ManyToOne and OneToMany relations with the inverseSide manually.
- It's necessary to pass the postgres column type in the typeorm entity.

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
