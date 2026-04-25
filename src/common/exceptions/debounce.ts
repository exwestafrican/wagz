export default class DebounceException extends Error {
  constructor(message: string) {
    super(message);
  }
}
