package io.wagz.statements.service;


import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.io.FilenameUtils;
import java.nio.file.Files;

import java.io.File;
import java.io.IOException;

@Service
public class FileStorage implements Storage {
    @Override

    public String store(MultipartFile thefile) throws IOException {
        try{


            if(thefile.IsEmpty()){
                return ApiErrorResponse(HttpStatus.BAD_REQUEST, "the file cannot be empty");
            }

             String filename = file.getOriginalFilename();
            if (filename == null || !(filename.endsWith(".csv") || filename.endsWith(".xlsx"))) {
                return ApiErrorResponse(HttpStatus.BAD_REQUEST, "Invalid file type. Only CSV and XLSX allowed.");
            }

            var path = new StringBuilder().append(System.getProperty("user.home").append(File.seperator).append("wagg-files")).toString();
            String extension = FilenameUtils.getExtension(MultipartFile.getOriginalFilename());
            var file = new File(path);
            file.mkdirs();
            var tempFile = File.createTempFile("file", ".%s".formatted(extension), file);
            log.info("Temp file created at %s".formatted( tempFile.getAbsolutePath()));
            Files.write(tempFile.toPath(), multipart.getBytes());
            return tempFile.getAbsolutePath();
        }
        catch(IOException ex){
            throw ex; 

        }
    }


}