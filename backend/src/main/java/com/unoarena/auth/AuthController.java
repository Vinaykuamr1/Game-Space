package com.unoarena.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public record Credentials(@NotBlank @Email String email,@NotBlank String password) {}
    public record Registration(@NotBlank @Size(min=2,max=32) String username,@NotBlank @Email String email,@NotBlank @Size(min=8,max=72) String password) {}
    public record Forgot(@NotBlank @Email String email) {}
    public record Reset(@NotBlank @Email String email,@NotBlank @Pattern(regexp="[0-9]{6}") String code,@NotBlank @Size(min=8,max=72) String newPassword) {}
    public record Message(String message) {}
    private final AuthService auth;
    public AuthController(AuthService auth){this.auth=auth;}
    @PostMapping("/guest") public AuthService.Session guest(){return auth.guest();}
    @PostMapping("/register") public AuthService.Session register(@Valid @RequestBody Registration body){return auth.register(body.username(),body.email(),body.password());}
    @PostMapping("/login") public AuthService.Session login(@Valid @RequestBody Credentials body){return auth.login(body.email(),body.password());}
    @PostMapping("/forgot-password") public AuthService.ResetRequest forgot(@Valid @RequestBody Forgot body){return auth.requestReset(body.email());}
    @PostMapping("/reset-password") public Message reset(@Valid @RequestBody Reset body){return new Message(auth.reset(body.email(),body.code(),body.newPassword()));}
}
