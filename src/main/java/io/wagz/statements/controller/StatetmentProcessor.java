package io.wagz.statements.controller;

import io.wagz.statements.service.Storage;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.ResponseStatus;
import lombok.extern.slf4j.Slf4j;
import java.io.IOException;




@RestController
@RequestMapping("/api/statement")
@Slf4j
public class StatementProcessor{


    private final Storage storage1;

    public Storage(Storage storage2){
        this.storage2 = storage1;
    }

    @PostMapping("/process")
    public void process(@RequestParam("file") MultipartFile uploadedfile,){
        string savedpath = storage2.store(file);
        return new ApiErrorResponse(HttpStatus.created, "File saved at");

    }

}