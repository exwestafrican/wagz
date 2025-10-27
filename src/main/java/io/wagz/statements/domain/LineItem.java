package io.wagz.statements.domain;

import io.wagz.statements.constants.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;

public record LineItem(
    String description, BigDecimal amount, TransactionType transactionType, LocalDate date) {
  public static LineItem ofSignedAmount(BigDecimal amount, String description, LocalDate date) {
    // positive amount is credit(inflow) and negative amount is debit (outflow)
    return amount.compareTo(BigDecimal.ZERO) > 0
        ? new LineItem(description, amount.abs(), TransactionType.CREDIT, date)
        : new LineItem(description, amount.abs(), TransactionType.DEBIT, date);
  }

  public static LineItem of(
      BigDecimal amount, String description, TransactionType transactionType, LocalDate date) {
    return new LineItem(description, amount, transactionType, date);
  }
}
