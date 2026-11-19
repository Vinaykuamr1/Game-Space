package com.unoarena.user;

import jakarta.persistence.*;

@Entity
@Table(name = "users", uniqueConstraints = {@UniqueConstraint(name = "uk_users_email", columnNames = "email")})
public class User {
    @Id @Column(length = 36) private String id;
    @Column(nullable = false, length = 32) private String username;
    @Column(nullable = false, length = 254) private String email;
    @Column(nullable = false, length = 100) private String passwordHash;

    protected User() {}
    public User(String id, String username, String email, String passwordHash) {
        this.id = id; this.username = username; this.email = email; this.passwordHash = passwordHash;
    }
    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}
