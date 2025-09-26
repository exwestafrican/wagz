package io.wagz.statements.domain;

import io.wagz.statements.constants.TransactionType;
import java.math.BigDecimal;

public record LineItem(String description, BigDecimal amount, TransactionType transactionType) {
  public static LineItem ofSignedAmount(BigDecimal amount, String description) {
    // positive amount is credit(inflow) and negative amount is debit (outflow)
    return amount.compareTo(BigDecimal.ZERO) > 0
        ? new LineItem(description, amount.abs(), TransactionType.CREDIT)
        : new LineItem(description, amount.abs(), TransactionType.DEBIT);
  }

  public static LineItem of(
      BigDecimal amount, String description, TransactionType transactionType) {
    return new LineItem(description, amount, transactionType);
  }
}
