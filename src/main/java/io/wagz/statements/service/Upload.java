package io.wagz.statements.service;

import io.wagz.statements.Exceptions.EmptyFileException;
import io.wagz.statements.domain.FileMeta;
import java.io.IOException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class Upload {

  public FileMeta uploadFile(MultipartFile file) throws IOException {

    if (file.isEmpty()) {
      // update the exception later
      throw new EmptyFileException("File Cannot be empty");
    }

    // greater than 3mb
    if (file.getSize() > 3145728) {
      throw new IOException("file size is too big, kindly pay some money");
    }

    String filename = file.getOriginalFilename();
    UUID uniqueID = UUID.randomUUID();
    long sizeInBytes = file.getSize();
    return new FileMeta(uniqueID, filename, sizeInBytes);
  }
}
