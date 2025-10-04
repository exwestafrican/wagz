package io.wagz;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"io.wagz.statements.controller", "io.wagz.statements.service"})
public class WagzApplication {

  public static void main(String[] args) {
    SpringApplication.run(WagzApplication.class, args);
  }
}
