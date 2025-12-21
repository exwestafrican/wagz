export class AccountExistsException extends Error {
  constructor(message: string) {
    super(message);
  }
}
