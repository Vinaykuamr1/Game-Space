package com.unoarena.auth;

import com.unoarena.security.JwtService;
import com.unoarena.user.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {
    public record PublicUser(String id,String username,String email) {}
    public record Session(String token,PublicUser user) {}
    public record ResetRequest(String message,String developmentCode) {}
    private record Code(String value,Instant expiresAt) {}
    private final UserRepository users; private final PasswordEncoder passwords; private final JwtService jwt; private final JavaMailSender mail; private final String mailFrom,mailHost,mailUsername,mailPassword; private final boolean devOtp;
    private final Map<String,Code> resetCodes=new ConcurrentHashMap<>(); private final SecureRandom random=new SecureRandom();
    public AuthService(UserRepository users,PasswordEncoder passwords,JwtService jwt,JavaMailSender mail,@Value("${app.mail.from:}") String mailFrom,@Value("${spring.mail.host:}") String mailHost,@Value("${spring.mail.username:}") String mailUsername,@Value("${spring.mail.password:}") String mailPassword,@Value("${app.auth.dev-otp:false}") boolean devOtp){this.users=users;this.passwords=passwords;this.jwt=jwt;this.mail=mail;this.mailFrom=mailFrom;this.mailHost=mailHost;this.mailUsername=mailUsername;this.mailPassword=mailPassword;this.devOtp=devOtp;}
    public Session guest(){String suffix=UUID.randomUUID().toString().substring(0,8);User user=new User(UUID.randomUUID().toString(),"Guest-"+suffix,"guest-"+UUID.randomUUID()+"@local.invalid",passwords.encode(UUID.randomUUID().toString()));users.save(user);return session(user);}
    public Session register(String username,String email,String password){
        String cleanEmail=email.trim().toLowerCase(Locale.ROOT),cleanName=username.trim();
        if(cleanName.length()<2||cleanName.length()>32)throw new IllegalArgumentException("PLAYER_NAME_INVALID");
        if(password.length()<8||password.length()>72)throw new IllegalArgumentException("PASSWORD_INVALID");
        if(users.existsByEmailIgnoreCase(cleanEmail))throw new IllegalStateException("EMAIL_ALREADY_REGISTERED");
        return session(users.save(new User(UUID.randomUUID().toString(),cleanName,cleanEmail,passwords.encode(password))));
    }
    public Session login(String email,String password){User user=users.findByEmailIgnoreCase(email.trim()).orElseThrow(()->new IllegalArgumentException("INVALID_CREDENTIALS"));if(!passwords.matches(password,user.getPasswordHash()))throw new IllegalArgumentException("INVALID_CREDENTIALS");return session(user);}
    public ResetRequest requestReset(String email){String key=email.trim().toLowerCase(Locale.ROOT);Optional<User> found=users.findByEmailIgnoreCase(key);if(found.isEmpty())return new ResetRequest("If that account exists, a reset code has been sent to its email.",null);if(!devOtp&&(mailHost.isBlank()||mailUsername.isBlank()||mailPassword.isBlank()||mailFrom.isBlank()))throw new IllegalStateException("Email sending is not configured. Set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD, and MAIL_FROM in .env.");String code=String.format("%06d",random.nextInt(1_000_000));resetCodes.put(key,new Code(code,Instant.now().plusSeconds(600)));if(devOtp)return new ResetRequest("Development mode: use the code shown below. It expires in 10 minutes.",code);try{SimpleMailMessage message=new SimpleMailMessage();message.setFrom(mailFrom);message.setTo(found.get().getEmail());message.setSubject("Game Area password reset code");message.setText("Your password reset code is "+code+". It expires in 10 minutes.");mail.send(message);}catch(MailException ex){resetCodes.remove(key);throw new IllegalStateException("Could not send the reset code. Check SMTP settings in your .env file.");}return new ResetRequest("A password reset code was sent to your email address.",null);}
    public String reset(String email,String code,String password){String key=email.trim().toLowerCase(Locale.ROOT);Code saved=resetCodes.get(key);if(saved==null||Instant.now().isAfter(saved.expiresAt())||!saved.value().equals(code))throw new IllegalArgumentException("RESET_CODE_INVALID_OR_EXPIRED");if(password.length()<8||password.length()>72)throw new IllegalArgumentException("PASSWORD_INVALID");User user=users.findByEmailIgnoreCase(key).orElseThrow(()->new IllegalArgumentException("RESET_CODE_INVALID_OR_EXPIRED"));user.setPasswordHash(passwords.encode(password));users.save(user);resetCodes.remove(key);return "Password updated. You can now sign in.";}
    private Session session(User user){return new Session(jwt.create(user.getId()),new PublicUser(user.getId(),user.getUsername(),user.getEmail()));}
}
