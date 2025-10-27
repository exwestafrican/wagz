// package io.wagz.statements.service;
//
// import static org.junit.jupiter.api.Assertions.*;
//
// import io.wagz.statements.constants.TransactionType;
// import io.wagz.statements.domain.LineItem;
// import java.io.IOException;
// import java.io.InputStream;
// import java.math.BigDecimal;
// import java.util.List;
// import org.junit.jupiter.api.DisplayName;
// import org.junit.jupiter.api.Test;
// import org.junit.jupiter.api.extension.ExtendWith;
// import org.mockito.junit.jupiter.MockitoExtension;
// import org.springframework.core.io.ClassPathResource;
// import org.springframework.mock.web.MockMultipartFile;
// import org.springframework.web.multipart.MultipartFile;
//
// @ExtendWith(MockitoExtension.class)
// class ExcelProcessorTest {
//
//  private ExcelProcessor processor = new ExcelProcessor();
//
//  @Test
//  @DisplayName("User can get bank statement with line items")
//  void canConvertToBankStatement() throws IOException {
//
//    // Resource stateFile = new ClassPathResource("statement/simple_statement.xlsx");
//    ClassPathResource resource = new ClassPathResource("statement/simple_statement.xlsx");
//
//    try (InputStream inputStream = resource.getInputStream()) {
//
//      // Create a MockMultipartFile from the InputStream
//      MultipartFile mockFile =
//          new MockMultipartFile(
//              "file", // name of the form field
//              "simple_statement", // original filename
//              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel MIME
//              // type
//              inputStream // file content stream
//              );
//
//      var statement = processor.process(mockFile);
//      assertEquals(
//          List.of(
//              LineItem.of(
//                  BigDecimal.valueOf(50.0),
//                  "To pocket EUR Holidays from EUR",
//                  TransactionType.DEBIT),
//              LineItem.of(BigDecimal.valueOf(25.0), "Transfer to RAYMOND", TransactionType.DEBIT),
//              LineItem.of(BigDecimal.valueOf(50.0), "Transfer from ABAH", TransactionType.CREDIT),
//              LineItem.of(BigDecimal.valueOf(60.0), "An Post", TransactionType.DEBIT),
//              LineItem.of(BigDecimal.valueOf(18.98), "Domino's pizza", TransactionType.DEBIT),
//              LineItem.of(
//                  BigDecimal.valueOf(0.01),
//                  "To pocket EUR Savings from EUR",
//                  TransactionType.DEBIT),
//              LineItem.of(
//                  BigDecimal.valueOf(1.0), "To pocket EUR Savings from EUR",
// TransactionType.DEBIT),
//              LineItem.of(
//                  BigDecimal.valueOf(910.0), "To pocket EUR Rise from EUR",
// TransactionType.DEBIT),
//              LineItem.of(BigDecimal.valueOf(50.0), "Pocket Withdrawal", TransactionType.CREDIT),
//              LineItem.of(BigDecimal.valueOf(20.0), "Transfer from SEWA", TransactionType.CREDIT),
//              LineItem.of(
//                  BigDecimal.valueOf(64.0), "Transfer from FAVOUR", TransactionType.CREDIT)),
//          statement.lineItems());
//    }
//  }
// }
