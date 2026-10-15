package com.dotinder.backend.controller;

import com.dotinder.backend.entity.SwipeEntity;
import com.dotinder.backend.model.Players;
import com.dotinder.backend.service.SwipeService;
import com.dotinder.backend.service.PlayersService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/swipe")
public class SwipeController {

    private static final Logger logger = LoggerFactory.getLogger(SwipeController.class);
    private final SwipeService swipeService;
    private final PlayersService playersService;

    public SwipeController(SwipeService swipeService, PlayersService playersService) {
        this.swipeService = swipeService;
        this.playersService = playersService;
    }

    @GetMapping("/next")
    public ResponseEntity<Map<String, Object>> getNextPlayer(
            @RequestParam(defaultValue = "0") int minMmr,
            @RequestParam(defaultValue = "10000") int maxMmr,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Double minWinrate,
            HttpServletRequest request) {

        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }

        try {
            Players nextPlayer = swipeService.getNextPlayerToSwipe(steamId, minMmr, maxMmr, role, minWinrate);
            if (nextPlayer == null) {
                return ResponseEntity.ok(Map.of(
                        "message", "Нет новых игроков в выбранном диапазоне",
                        "hasMore", false
                ));
            }
            return ResponseEntity.ok(Map.of("player", nextPlayer, "hasMore", true));
        } catch (Exception e) {
            logger.error("Error in /api/swipe/next: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

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
            boolean isMatch = liked && swipeService.checkForMatch(steamId, targetSteamId);

            return ResponseEntity.ok(Map.of(
                    "swipe", swipe,
                    "isMatch", isMatch,
                    "message", isMatch ? "Это мэтч! Можете начать общаться!" : "Свайп выполнен"
            ));
        } catch (Exception e) {
            logger.error("Error in /api/swipe/action: {}", e.getMessage(), e);
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
            logger.error("Error in /api/swipe/matches: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
