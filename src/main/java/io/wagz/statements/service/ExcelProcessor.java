package io.wagz.statements.service;

import io.wagz.statements.domain.BankStatement;
import io.wagz.statements.domain.LineItem;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ExcelProcessor {

  public BankStatement process(MultipartFile file) throws IOException {

    List<LineItem> lineItems = new ArrayList<>();

    try (Workbook workbook = new XSSFWorkbook(file.getInputStream()); ) {

      Sheet sheet = workbook.getSheetAt(0);

      for (Row row : sheet) {
        if (row == null || row.getRowNum() == 0) continue; // Skip null rows or Skip header row

        LocalDate date =
            row.getCell(2)
                .getDateCellValue()
                .toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDate();
        var description = row.getCell(4).getStringCellValue();
        var amount = BigDecimal.valueOf(row.getCell(5).getNumericCellValue());
        lineItems.add(LineItem.ofSignedAmount(amount, description, date));
      }

    } catch (IOException e) {
      return new BankStatement(Collections.emptyList());
    }

    return new BankStatement(lineItems);
  }
}
