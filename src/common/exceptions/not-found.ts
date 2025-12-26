export default class NotFoundInDb extends Error {
  constructor(message: string) {
    super(message);
  }
}
