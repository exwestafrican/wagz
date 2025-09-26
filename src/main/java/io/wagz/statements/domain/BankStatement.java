package io.wagz.statements.domain;

import java.util.List;

public record BankStatement(List<Transaction> transaction) {}
