package io.wagz.statements.domain;

import io.wagz.statements.Json.BankStatementJson;
import java.util.List;

public record BankStatement(List<LineItem> lineItems) {

  public BankStatementJson toResponse() {
    return BankStatementJson.of(lineItems);
  }
}
