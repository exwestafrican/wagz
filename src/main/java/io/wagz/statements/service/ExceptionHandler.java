package io.wagz.statements.service;

import io.wagz.statements.dto.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.io.IOException;

@ControllerAdvice
public class GlobalExceptionHandler {


    @ExceptionHandler(IOException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public ErrorResponse handleIOException(IOException ex) {
    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, "File processing failed");
    log.error("Failed to process file for {}", problemDetail.getInstance());
    System.out.println("Failed to process file for " + problemDetail.getInstance());
    return new ApiErrorResponse(HttpStatus.UNPROCESSABLE_ENTITY, problemDetail);
    }

    // Handle all other exceptions (500 Internal Server Error)
    @ExceptionHandler(Exception.class)
    public ErrorResponse handleAllExceptions(Exception ex) {
        ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage);
        log.error("Internal Server error", problemDetail.getInstance());
        System.out.println("Internal Server error" + problemDetail.getInstance());
        return new ApiErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, problemDetail);
    }
}
