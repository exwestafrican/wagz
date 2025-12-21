package io.wagz.statements.domain;

import java.util.UUID;

public record FileMeta(UUID id, String name, long size) {}
