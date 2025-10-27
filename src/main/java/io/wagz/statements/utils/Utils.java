package io.wagz.statements.utils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class Utils {
  public static String toFormattedDate(LocalDate date) {
    return date.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
  }
}
