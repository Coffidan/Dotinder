package com.dotinder.backend.repository;

import com.dotinder.backend.model.Players;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlayersRepository extends JpaRepository<Players, Long> {
    // Кастомный метод: поиск по Steam ID
    Players findBySteamId(String steamId);
}
