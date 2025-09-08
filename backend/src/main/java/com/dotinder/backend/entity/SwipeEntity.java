package com.dotinder.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "swipes")
public class SwipeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "swiper_steam_id", nullable = false)
    private String swiperSteamId;

    @Column(name = "swiped_steam_id", nullable = false)
    private String swipedSteamId;

    @Column(name = "liked", nullable = false)  // Изменено на 'liked' для соответствия БД
    private Boolean liked;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Конструкоры
    public SwipeEntity() {}

    public SwipeEntity(String swiperSteamId, String swipedSteamId, Boolean liked) {
        this.swiperSteamId = swiperSteamId;
        this.swipedSteamId = swipedSteamId;
        this.liked = liked;  // Обязательно устанавливаем значение
    }

    // Getters и Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSwiperSteamId() { return swiperSteamId; }
    public void setSwiperSteamId(String swiperSteamId) { this.swiperSteamId = swiperSteamId; }

    public String getSwipedSteamId() { return swipedSteamId; }
    public void setSwipedSteamId(String swipedSteamId) { this.swipedSteamId = swipedSteamId; }

    public Boolean getLiked() { return liked; }
    public void setLiked(Boolean liked) { this.liked = liked; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
