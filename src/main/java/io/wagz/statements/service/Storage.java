package io.wagz.statements.service;

import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

public interface Storage {

  String store(MultipartFile file) throws IOException;
}
