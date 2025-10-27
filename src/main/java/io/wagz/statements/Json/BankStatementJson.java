package io.wagz.statements.Json;

import static io.wagz.statements.utils.Utils.toFormattedDate;

import io.wagz.statements.domain.LineItem;
import io.wagz.statements.utils.Utils;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record BankStatementJson(
    List<String> dates, List<String> statements, Map<String, List<LineItem>> lineItems) {

  public static BankStatementJson of(List<LineItem> lineItems) {
    var localDates =
        lineItems.stream().map(LineItem::date).distinct().map(Utils::toFormattedDate).toList();
    Map<String, List<LineItem>> itemsByDate =
        lineItems.stream().collect(Collectors.groupingBy(item -> toFormattedDate(item.date())));

    return new BankStatementJson(localDates, List.of("x2990"), itemsByDate);
  }
}
