package com.dotinder.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                // CSRF пока отключён: защита вне рамок текущей задачи для SPA с сессионными cookie.
                .csrf(csrf -> csrf.disable())
                // Защита от фиксации сессии: создаём новую сессию при логине.
                .sessionManagement(session -> session.sessionFixation().migrateSession())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/ws/**").permitAll()  // Разрешаем WebSocket
                        .anyRequest().permitAll()
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(new CustomAuthenticationEntryPoint())
                );
        return http.build();
    }
}
