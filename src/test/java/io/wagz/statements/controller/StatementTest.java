package io.wagz.statements.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(Statement.class)
class StatementTest {

  @Autowired private MockMvc mockMvc;

  @Test
  public void testUploadFileSucceeds() throws Exception {

    byte[] content = new byte[1024];
    MockMultipartFile mockFile =
        new MockMultipartFile(
            "file", // form field name
            "test.xlsx", // original filename
            "text/csv", // content type
            content // file content
            );
    mockMvc
        .perform(multipart("/api/statement/save").file(mockFile))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.size").value(1024))
        .andExpect(jsonPath("$.name").value("test.xlsx"));
  }

  // ensure we throw error when file size is exceeded
  @Test
  public void testUploadFilewithLargeSize() throws Exception {

    byte[] largeContent = new byte[3145729]; // 3MB + 1 byte

    MockMultipartFile largeFile =
        new MockMultipartFile(
            "file", // form field name
            "test.xlsx", // original filename
            "text/csv", // content type
            largeContent // file content
            );
    mockMvc
        .perform(multipart("/api/statement/save").file(largeFile))
        .andExpect(status().isPayloadTooLarge())
        .andExpect(content().string("The size is too large"));
  }

  // test with empty file
  @Test
  public void testEmptyFileThrowsEmptyFileException() throws Exception {

    MockMultipartFile largeFile =
        new MockMultipartFile(
            "file", // form field name
            "test.xlsx", // original filename
            "text/csv", // content type
            new byte[0] // file content
            );
    mockMvc
        .perform(multipart("/api/statement/save").file(largeFile))
        .andExpect(status().isBadRequest())
        .andExpect(content().string("File Cannot be empty"));
  }
}
