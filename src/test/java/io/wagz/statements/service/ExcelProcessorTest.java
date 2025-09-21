package io.wagz.statements.service;

import static org.junit.jupiter.api.Assertions.*;

import io.wagz.statements.constants.TransactionType;
import io.wagz.statements.domain.Transaction;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

@ExtendWith(MockitoExtension.class)
class ExcelProcessorTest {

  private ExcelProcessor processor = new ExcelProcessor();

  @Test
  @DisplayName("User can get bank statement with transactions")
  void canConvertToBankStatement() throws IOException {

    Resource stateFile = new ClassPathResource("statement/simple statement.xlsx");
    var statement = processor.process(stateFile.getFile());
    assertEquals(
        List.of(
            Transaction.of(
                BigDecimal.valueOf(50.0), "To pocket EUR Holidays from EUR", TransactionType.DEBIT),
            Transaction.of(BigDecimal.valueOf(25.0), "Transfer to RAYMOND", TransactionType.DEBIT),
            Transaction.of(BigDecimal.valueOf(50.0), "Transfer from ABAH", TransactionType.CREDIT),
            Transaction.of(BigDecimal.valueOf(60.0), "An Post", TransactionType.DEBIT),
            Transaction.of(BigDecimal.valueOf(18.98), "Domino's pizza", TransactionType.DEBIT),
            Transaction.of(
                BigDecimal.valueOf(0.01), "To pocket EUR Savings from EUR", TransactionType.DEBIT),
            Transaction.of(
                BigDecimal.valueOf(1.0), "To pocket EUR Savings from EUR", TransactionType.DEBIT),
            Transaction.of(
                BigDecimal.valueOf(910.0), "To pocket EUR Rise from EUR", TransactionType.DEBIT),
            Transaction.of(BigDecimal.valueOf(50.0), "Pocket Withdrawal", TransactionType.CREDIT),
            Transaction.of(BigDecimal.valueOf(20.0), "Transfer from SEWA", TransactionType.CREDIT),
            Transaction.of(
                BigDecimal.valueOf(64.0), "Transfer from FAVOUR", TransactionType.CREDIT)),
        statement.transaction());
  }
}
