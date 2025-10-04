package io.wagz.statements.domain;

import io.wagz.statements.constants.TransactionType;
import java.math.BigDecimal;

public record LineItem(String description, BigDecimal amount, TransactionType transactionType, BigDecimal balance) {
  public static LineItem ofSignedAmount(BigDecimal amount, String description, BigDecimal balance) {
    // positive amount is credit(inflow) and negative amount is debit (outflow)
    return amount.compareTo(BigDecimal.ZERO) > 0
        ? new LineItem(description, amount.abs(), TransactionType.CREDIT, balance)
        : new LineItem(description, amount.abs(), TransactionType.DEBIT, balance);
  }

  public static LineItem of(
      BigDecimal amount, String description, TransactionType transactionType, BigDecimal balance) {
    return new LineItem(description, amount, transactionType, balance);
  }
}