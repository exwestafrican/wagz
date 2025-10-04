package io.wagz.statements.Exceptions;

import java.io.IOException;

public class FileTooLargeException extends IOException {
  public FileTooLargeException(String message) {
    super(message);
  }
}
