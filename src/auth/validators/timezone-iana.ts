import {
  ValidationArguments,
  ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidIANATimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;
    return Intl.supportedValuesOf('timeZone').includes(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.value} must be a valid IANA timezone`;
  }
}


eslint/eslintrc, @eslint/js, @faker-js/faker, @nestjs/cli, @nestjs/schematics, @nestjs/testing, @react-email/preview-server, @testcontainers/postgresql, @types/express, @types/generate-password, @types/jest, @types/node, @types/passport-local, @types/react, @types/react-dom, @types/supertest, dotenv, eslint, eslint-config-prettier, eslint-plugin-prettier, fishery, globals, jest, prettier, prisma, react-email, source-map-support, supabase, supertest, testcontainers, ts-jest, ts-loader, ts-node, tsconfig-paths, typescript, typescript-eslint, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/mapped-types, @nestjs/passport, @nestjs/platform-express, @nestjs/swagger, @nestjs/typeorm, @prisma/adapter-pg, @prisma/client, @react-email/components, @react-email/render, @supabase/supabase-js, @types/moment-timezone, @types/nodemailer, class-transformer, class-validator, generate-password, jose, libphonenumber-js, moment-timezone, nodemailer, passport, pg, react, react-dom, reflect-metadata, rxjs, swagger-ui-express, typeorm, zeptomail
