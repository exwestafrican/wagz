export default class ItemAlreadyExistsInDb extends Error {
  constructor(message: string) {
    super(message);
  }
}
