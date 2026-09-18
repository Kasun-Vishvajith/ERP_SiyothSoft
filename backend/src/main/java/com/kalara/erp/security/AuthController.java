package com.kalara.erp.security;

import java.security.Principal;
import java.util.Map;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {
    @GetMapping("/api/csrf")
    public Map<String, String> csrf(CsrfToken csrf) {
        // Return the framework-provided token and header name to the browser client.
        return Map.of("token", csrf.getToken(), "headerName", csrf.getHeaderName());
    }

    @GetMapping("/api/me")
    public Map<String, String> me(Principal principal) {
        return Map.of("username", principal.getName());
    }
}
