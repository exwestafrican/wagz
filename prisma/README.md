### Making DB Change
1. create a file `<model_name>.prisma`
2. update schema and run `pnpm format:schema`
3. generate migration using `pnpx prisma migrate dev --name change_table_name`
4. Check status of migration with `pnpx prisma migrate status`
5. Run `pnpx prisma migrate deploy` to update schema

### To Confirm schema locally run

1. `psql -h 127.0.0.1 -p 54322 -U postgres -d postgres` to connect as postgres user
2. enter password usually postgres
3. run `\dt` command


### Generate client with command:
1. `pnpx prisma generate`


### Reverse table alteration via prisma:
1. Delete the prisma migration file that was created
2. Reverse changes you made to the prisma schema file
3. Run ‘pnpx prisma migrate reset’ to reset DB