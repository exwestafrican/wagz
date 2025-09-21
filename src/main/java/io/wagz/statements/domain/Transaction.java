package io.wagz.statements.domain;

import io.wagz.statements.constants.TransactionType;
import java.math.BigDecimal;

public record Transaction(String description, BigDecimal amount, TransactionType transactionType) {
  public static Transaction ofSignedAmount(BigDecimal amount, String description) {
    if (amount.compareTo(BigDecimal.ZERO)
        > 0) { // positive amount is credit and negative amount is debit
      return new Transaction(description, amount.abs(), TransactionType.CREDIT);
    } else {
      return new Transaction(description, amount.abs(), TransactionType.DEBIT);
    }
  }

  public static Transaction of(
      BigDecimal amount, String description, TransactionType transactionType) {
    return new Transaction(description, amount, transactionType);
  }
}
