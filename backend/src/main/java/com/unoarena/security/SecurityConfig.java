package com.unoarena.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {
 @Bean SecurityFilterChain filterChain(HttpSecurity http,JwtFilter jwtFilter)throws Exception{return http.csrf(c->c.disable()).cors(c->{}).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)).authorizeHttpRequests(a->a.requestMatchers(HttpMethod.OPTIONS,"/**").permitAll().requestMatchers(HttpMethod.POST,"/api/auth/guest","/api/auth/login","/api/auth/register","/api/auth/forgot-password","/api/auth/reset-password").permitAll().requestMatchers("/api/auth/**","/ws/**","/actuator/health").permitAll().requestMatchers(HttpMethod.GET,"/api/rooms","/api/leaderboard").permitAll().anyRequest().authenticated()).addFilterBefore(jwtFilter,UsernamePasswordAuthenticationFilter.class).build();}
 @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
 @Bean CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins:}")String origins){
  CorsConfiguration c=new CorsConfiguration();
  List<String> allowed=new java.util.ArrayList<>(Arrays.stream(origins.split(",")).map(String::trim).filter(value->!value.isEmpty()).toList());
  allowed.addAll(List.of("http://localhost:*","http://127.0.0.1:*","http://192.168.*.*:*","http://10.*.*.*:*"));
  for(int second=16;second<=31;second++)allowed.add("http://172."+second+".*.*:*");
  c.setAllowedOriginPatterns(allowed);c.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));c.setAllowedHeaders(List.of("Authorization","Content-Type"));c.setAllowCredentials(true);
  UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",c);return source;
 }
}
