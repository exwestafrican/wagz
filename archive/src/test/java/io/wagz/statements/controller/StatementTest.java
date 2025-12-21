package io.wagz.statements.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
  // check that when there is an error we return correct error response

}
