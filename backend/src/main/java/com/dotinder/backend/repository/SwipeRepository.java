package com.dotinder.backend.repository;

import com.dotinder.backend.entity.SwipeEntity;
import com.dotinder.backend.model.Players;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SwipeRepository extends JpaRepository<SwipeEntity, Long> {

    // Проверяем существующий свайп
    Optional<SwipeEntity> findBySwiperSteamIdAndSwipedSteamId(String swiperSteamId, String swipedSteamId);

    // Все лайки/дизлайки
    List<SwipeEntity> findBySwiperSteamIdAndLiked(String swiperSteamId, Boolean liked);  // Изменено с 'IsLike' на 'Liked'

    // Взаимные матчи
    @Query("SELECT s1 FROM SwipeEntity s1 WHERE s1.swiperSteamId = :steamId AND s1.liked = true " +
            "AND EXISTS (SELECT s2 FROM SwipeEntity s2 WHERE s2.swiperSteamId = s1.swipedSteamId " +
            "AND s2.swipedSteamId = :steamId AND s2.liked = true)")
    List<SwipeEntity> findMatches(@Param("steamId") String steamId);

    // Несвайпнутые игроки
    @Query("SELECT p FROM Players p WHERE p.steamId != :steamId " +
            "AND p.steamId NOT IN (SELECT s.swipedSteamId FROM SwipeEntity s WHERE s.swiperSteamId = :steamId)")
    List<Players> findUnswipedPlayers(@Param("steamId") String steamId);
}
