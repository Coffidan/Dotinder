package com.dotinder.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;  // Импорт для lastLogin

@Entity  // Это сущность для БД
@Table(name = "players")
@Data    // Lombok: генерирует getters, setters, toString и т.д.
public class Players {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // Авто-инкремент ID
    private Long id;

    private String steamId;    // ID из Steam
    private String nickname;   // Никнейм
    private Integer mmr;       // MMR из Dota 2

    private String avatarUrl;  // URL аватара из Steam (новое поле)

    private LocalDateTime lastLogin;  // Дата последнего входа (новое поле)

    // Добавь другие поля, если нужно: String role (carry/support), Double winrate
}
