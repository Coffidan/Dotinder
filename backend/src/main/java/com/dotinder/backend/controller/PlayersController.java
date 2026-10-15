package com.dotinder.backend.controller;

import com.dotinder.backend.model.Players;
import com.dotinder.backend.service.PlayersService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/players")
public class PlayersController {

    private static final Logger logger = LoggerFactory.getLogger(PlayersController.class);
    private final PlayersService service;

    public PlayersController(PlayersService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentPlayer(HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        Boolean authenticated = (Boolean) request.getSession().getAttribute("authenticated");

        logger.debug("GET /api/players/me - sessionId={}, steamId={}, authenticated={}",
                request.getSession().getId(), steamId, authenticated);

        if (steamId == null || !Boolean.TRUE.equals(authenticated)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not authenticated", "sessionId", request.getSession().getId()));
        }

        try {
            Players player = service.findBySteamId(steamId);
            if (player == null) {
                Players newPlayer = new Players();
                newPlayer.setSteamId(steamId);
                service.savePlayer(newPlayer);
                service.updatePlayerFromOpenDota(steamId);
                player = service.findBySteamId(steamId);
            } else if (service.needsStatsUpdate(player, 6)) {
                logger.debug("Auto-updating stats for {} in background", steamId);
                new Thread(() -> {
                    try { service.updatePlayerFromOpenDota(steamId); } catch (Exception ignore) {}
                }).start();
            }
            return ResponseEntity.ok(player);
        } catch (Exception e) {
            logger.error("Error in /api/players/me: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to load player"));
        }
    }

    @PutMapping("/update-mmr")
    public ResponseEntity<?> updateMmr(@RequestParam int mmr, HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated"));
        }
        try {
            service.updateMmr(steamId, mmr);
            Players updated = service.findBySteamId(steamId);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/update-role")
    public ResponseEntity<?> updateRole(@RequestParam String role, HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated"));
        }
        try {
            service.updateRole(steamId, role);
            Players updated = service.findBySteamId(steamId);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/update-opendota")
    public ResponseEntity<?> updateFromOpenDota(HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated"));
        }
        try {
            service.updatePlayerFromOpenDota(steamId);
            Players updatedPlayer = service.findBySteamId(steamId);
            return ResponseEntity.ok(updatedPlayer);
        } catch (Exception e) {
            logger.warn("Error updating from OpenDota for {}: {}", steamId, e.getMessage());
            Players existing = service.findBySteamId(steamId);
            if (existing != null) return ResponseEntity.ok(existing);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/opendota-data")
    public ResponseEntity<?> getOpenDotaData(HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated"));
        }
        try {
            Map<String, Object> opendotaData = service.getOpenDotaData(steamId);
            return ResponseEntity.ok(opendotaData);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/opendota-matches")
    public ResponseEntity<?> getOpenDotaMatches(HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated"));
        }
        try {
            var matches = service.getPlayerMatches(steamId);
            return ResponseEntity.ok(matches);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        try {
            request.getSession().invalidate();
            logger.info("User logged out, session invalidated");
            return ResponseEntity.ok(Map.of("success", true, "message", "Logged out"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Logout failed"));
        }
    }
}
