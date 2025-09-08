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
    private String role;       // Роль в Dota 2 (carry, mid, offlane, support, hard_support)
    private Double winrate;    // Винрейт игрока (процент побед)
    private String opendotaId; // OpenDota ID для интеграции с API
    private Integer rankTier;  // OpenDota rank_tier (например, 52 => Ancient 2)
    private Integer leaderboardRank; // Позиция в лидерборде (если есть)

    private String avatarUrl;  // URL аватара из Steam (новое поле)

    private LocalDateTime lastLogin;  // Дата последнего входа (новое поле)
    private LocalDateTime lastStatsUpdate; // Дата последнего обновления статистики из OpenDota

    // Добавь другие поля, если нужно: String role (carry/support), Double winrate
}
