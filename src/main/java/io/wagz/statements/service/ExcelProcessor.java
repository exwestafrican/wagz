package io.wagz.statements.service;

import io.wagz.statements.domain.BankStatement;
import io.wagz.statements.domain.LineItem;
import java.io.IOException;
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

  public BankStatement process(MultipartFile file) throws IOException {

    List<LineItem> lineItems = new ArrayList<>();

    Workbook workbook = null;
    try (InputStream inputStream = file.getInputStream()) {
      workbook = new XSSFWorkbook(inputStream);

      Sheet sheet = workbook.getSheetAt(0);

      for (Row row : sheet) {
        if (row == null || row.getRowNum() == 0) continue; // Skip null rows or Skip header row

        var description = row.getCell(4).getStringCellValue();
        var amount = BigDecimal.valueOf(row.getCell(5).getNumericCellValue());
        lineItems.add(LineItem.ofSignedAmount(amount, description));
      }

    } catch (IOException e) {
      return new BankStatement(Collections.emptyList());
    } finally {
      workbook.close();
    }

    return new BankStatement(lineItems);
  }
}
