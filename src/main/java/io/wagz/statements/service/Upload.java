package io.wagz.statements.service;

import io.wagz.statements.Exceptions.EmptyFileException;
import io.wagz.statements.Exceptions.FileTooLargeException;
import io.wagz.statements.domain.FileMeta;
import java.io.IOException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class Upload {

  public FileMeta uploadFile(MultipartFile file) throws IOException {

    final int fileSize = 3145728;

    if (file.isEmpty()) {
      // update the exception later
      throw new EmptyFileException("File Cannot be empty");
    }

    // greater than 3mb
    if (file.getSize() > fileSize) {
      throw new FileTooLargeException("The size is too large");
    }

    String filename = file.getOriginalFilename();
    UUID uniqueID = UUID.randomUUID();
    long sizeInBytes = file.getSize();
    return new FileMeta(uniqueID, filename, sizeInBytes);
  }
}
