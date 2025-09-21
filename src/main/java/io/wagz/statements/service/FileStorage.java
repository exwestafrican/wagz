package io.wagz.statements.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FilenameUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
public class FileStorage implements Storage {
  @Override
  public String store(MultipartFile multipartFile) throws IOException {
    var path =
        new StringBuilder()
            .append(System.getProperty("user.home"))
            .append(File.separator)
            .append("wagg-files")
            .toString();

    String extension = FilenameUtils.getExtension(multipartFile.getOriginalFilename());

    var file = new File(path);
    file.mkdirs(); // Add test for directory not created
    var tempFile = File.createTempFile("file", ".%s".formatted(extension), file);
    log.info("Temp file created at %s".formatted( tempFile.getAbsolutePath()));
    Files.write(tempFile.toPath(), multipartFile.getBytes());
    return tempFile.getAbsolutePath();
  }
}
