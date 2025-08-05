package com.dotinder.backend.model;
import jakarta.persistence.Table;  // Добавь этот импорт
import jakarta.persistence.*;
import lombok.Data;

@Entity  // Это сущность для БД
@Table(name = "players")
@Data    // Lombok: генерирует getters, setters, toString и т.д.
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // Авто-инкремент ID
    private Long id;

    private String steamId;    // ID из Steam
    private String nickname;   // Никнейм
    private Integer mmr;       // MMR из Dota 2
    // Добавь другие поля, если нужно: String role (carry/support), Double winrate
}
