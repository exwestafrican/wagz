export class Permission {
  readonly name: string;
  readonly description: string;
  readonly code: string;

  constructor(name: string, description: string, code: string) {
    this.name = name;
    this.description = description;
    this.code = code;
  }

  static of(name: string, description: string, code: string) {
    return new Permission(name, description, code);
  }

  equals(other: Permission): boolean {
    return this.code === other.code;
  }

  toString(): string {
    return `Permission(${this.code})`;
  }
}
