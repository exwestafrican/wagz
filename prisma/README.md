### Making DB Change
1. create a file `<model_name>.prisma`
2. update schema and run `pnpm format:schema`
3. generate migration using `pnpm prisma migrate dev --name change_table_name --create-only`
4. Check status of migration with `pnpm prisma migrate status`
5. Run `pnpm prisma migrate deploy` to update schema

### To Confirm schema locally run

1. `psql -h 127.0.0.1 -p 54322 -U postgres -d postgres` to connect as postgres user
2. enter password usually postgres
3. run `\dt` command


### Generate client with command:
1. `pnpm prisma generate`


### Known issues:
1. Adding a new column fails CI: The happen because fields in factory are not in sync fields in prisma ci. Go to the factory class of entity and update. Example [PR](https://github.com/exwestafrican/wagz/pull/287)