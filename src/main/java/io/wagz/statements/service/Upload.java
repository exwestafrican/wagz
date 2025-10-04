package io.wagz.statements.service;

import io.wagz.statements.domain.FileMeta;
import java.io.IOException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class Upload {

  public FileMeta uploadFile(MultipartFile file) throws IOException {

    String filename = file.getOriginalFilename();
    UUID uniqueID = UUID.randomUUID();
    long sizeInBytes = file.getSize();
    return new FileMeta(uniqueID, filename, sizeInBytes);
  }
}
