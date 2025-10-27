package io.wagz.statements.service;

import io.wagz.statements.domain.BankStatement;
import io.wagz.statements.domain.LineItem;
import java.io.InputStream;
import java.math.BigDecimal;
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

  public BankStatement process(MultipartFile file) {

    List<LineItem> lineItems = new ArrayList<>();

    try (InputStream inputStream = file.getInputStream()) {
      Workbook workbook = new XSSFWorkbook(inputStream);

      Sheet sheet = workbook.getSheetAt(0);

      for (Row row : sheet) {
        if (row == null || row.getRowNum() == 0) continue; // Skip null rows or Skip header row

        var description = row.getCell(4).getStringCellValue();
        var amount = BigDecimal.valueOf(row.getCell(5).getNumericCellValue());
        lineItems.add(LineItem.ofSignedAmount(amount, description));
      }

      workbook.close();

    } catch (Exception e) {
      return new BankStatement(Collections.emptyList());
    }

    return new BankStatement(lineItems);
  }
}
