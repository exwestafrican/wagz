package io.wagz.statements.dto;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponse;

public record ApiErrorResponse(HttpStatusCode statusCode, ProblemDetail detail)
    implements ErrorResponse {

  @Override
  public HttpStatusCode getStatusCode() {
    return this.statusCode;
  }

  @Override
  public ProblemDetail getBody() {
    return this.detail;
  }
}
