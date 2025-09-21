package io.wagz.statements.controller;

import io.wagz.statements.dto.ApiErrorResponse;
import io.wagz.statements.service.Storage;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/statement")
@Slf4j
public class StatementProcessor{

  @Autowired Storage storage;

  @PostMapping("/process")
  public void process(@RequestParam("file") MultipartFile file) throws IOException {
    storage.store(file);
  }

  @ExceptionHandler(IOException.class)
  @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
  public ErrorResponse handleIOException(IOException ex) {
    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, "File processing failed");
    log.error("Failed to process file for {}", problemDetail.getInstance());
    System.out.println("Failed to process file for " + problemDetail.getInstance());
    return new ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, problemDetail);
  }
}
