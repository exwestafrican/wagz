export default class RequestUser {
  readonly email: string;

  constructor(email: string) {
    this.email = email;
  }

  static of(email: string) {
    return new RequestUser(email);
  }
}
