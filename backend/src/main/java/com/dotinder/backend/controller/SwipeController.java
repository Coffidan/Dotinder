package com.dotinder.backend.controller;

import com.dotinder.backend.entity.SwipeEntity;
import com.dotinder.backend.model.Players;
import com.dotinder.backend.service.SwipeService;
import com.dotinder.backend.service.PlayersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/swipe")
public class SwipeController {

    @Autowired
    private SwipeService swipeService;

    @Autowired
    private PlayersService playersService;

    // Получить следующего игрока для свайпа
    @GetMapping("/next")
    public ResponseEntity<Map<String, Object>> getNextPlayer(
            @RequestParam(defaultValue = "0") int minMmr,
            @RequestParam(defaultValue = "10000") int maxMmr,
            HttpServletRequest request) {

        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        try {
            Players nextPlayer = swipeService.getNextPlayerToSwipe(steamId, minMmr, maxMmr);
            if (nextPlayer == null) {
                return ResponseEntity.ok(Map.of(
                        "message", "Нет новых игроков в этом диапазоне MMR",
                        "hasMore", false
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "player", nextPlayer,
                    "hasMore", true
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // Сделать свайп (лайк или дизлайк)
    @PostMapping("/action")
    public ResponseEntity<Map<String, Object>> swipeAction(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {

        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        try {
            String targetSteamId = (String) payload.get("targetSteamId");
            Boolean liked = (Boolean) payload.get("isLike");

            if (targetSteamId == null || liked == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing parameters"));
            }

            SwipeEntity swipe = swipeService.performSwipe(steamId, targetSteamId, liked);
            boolean isMatch = false;
            if (liked) {
                isMatch = swipeService.checkForMatch(steamId, targetSteamId);
            }

            return ResponseEntity.ok(Map.of(
                    "swipe", swipe,
                    "isMatch", isMatch,
                    "message", isMatch ? "🎉 Это матч! Можете начать общаться!" : "Свайп выполнен"
            ));
        } catch (Exception e) {
            e.printStackTrace();  // Логируем стек-трейс для дебаг
            return ResponseEntity.status(500).body(Map.of("error", "Internal error: " + e.getMessage()));
        }
    }
    @GetMapping("/matches")
    public ResponseEntity<?> getMatches(HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        try {
            List<Players> matches = swipeService.getMatches(steamId);
            return ResponseEntity.ok(matches);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
