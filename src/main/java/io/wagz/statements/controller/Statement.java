package io.wagz.statements.controller;

import io.wagz.statements.domain.FileMeta;
import io.wagz.statements.service.Upload;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/statement")
@CrossOrigin(origins = "http://localhost:3000")
@Slf4j
public class Statement {

  private static final Logger log = LoggerFactory.getLogger(Statement.class);
  @Autowired private Upload upload;

  @PostMapping("/save")
  public ResponseEntity<FileMeta> save(@RequestParam("file") MultipartFile file)
      throws IOException {

    var meta = upload.uploadFile(file);
    return ResponseEntity.status(HttpStatus.CREATED).body(meta);
  }

  @ExceptionHandler(IOException.class)
  public ResponseEntity handleIOException(IOException ex) {
    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, "File processing failed");
    log.error("Failed to process file for {}", problemDetail.getInstance());
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ex.getMessage());
  }
}
