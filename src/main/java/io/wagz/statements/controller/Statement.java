package io.wagz.statements.controller;

import io.wagz.statements.domain.FileMeta;
import io.wagz.statements.service.Upload;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/statement")
public class Statement {

  @Autowired private Upload upload;

  @PostMapping("/save")
  public ResponseEntity<FileMeta> save(@RequestParam("file") MultipartFile file)
      throws IOException {

    var meta = upload.uploadFile(file);
    return ResponseEntity.status(HttpStatus.CREATED).body(meta);
  }
}
