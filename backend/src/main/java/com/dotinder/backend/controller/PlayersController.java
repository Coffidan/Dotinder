package com.dotinder.backend.controller;

import com.dotinder.backend.model.Players;
import com.dotinder.backend.service.PlayersService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
@RequestMapping("/api/players")
public class PlayersController {

    private final PlayersService service;

    public PlayersController(PlayersService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentPlayer(HttpServletRequest request) {
        System.out.println("=== GET /api/players/me ===");

        // Проверяем сессию
        String steamId = (String) request.getSession().getAttribute("steamId");
        Boolean authenticated = (Boolean) request.getSession().getAttribute("authenticated");
        System.out.println("Session steamId: " + steamId);
        System.out.println("Session authenticated: " + authenticated);
        System.out.println("Session ID: " + request.getSession().getId());

        if (steamId == null || !Boolean.TRUE.equals(authenticated)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\":\"User not authenticated\", \"sessionId\":\"" + request.getSession().getId() + "\"}");
        }

        try {
            Players player = service.findBySteamId(steamId);
            if (player == null) {
                // Создаем пустой профиль и сразу обновляем из OpenDota
                Players newPlayer = new Players();
                newPlayer.setSteamId(steamId);
                service.savePlayer(newPlayer);
                service.updatePlayerFromOpenDota(steamId);
                player = service.findBySteamId(steamId);
            } else {
                // Если нет свежей статистики, пробуем обновить фоном
                if (player.getLastStatsUpdate() == null) {
                    service.updatePlayerFromOpenDota(steamId);
                    player = service.findBySteamId(steamId);
                }
            }
            return ResponseEntity.ok(player);
        } catch (Exception e) {
            System.out.println("Error finding player: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"Failed to load player\"}");
        }
    }

    // Запрещаем ручное изменение MMR
    @PutMapping("/update-mmr")
    public ResponseEntity<String> updateMmr(@RequestParam int mmr, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("MMR управляется OpenDota и не может изменяться вручную");
    }

    // Новый эндпоинт: обновление роли
    @PutMapping("/update-role")
    public ResponseEntity<String> updateRole(@RequestParam String role, HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }
        try {
            service.updateRole(steamId, role);
            return ResponseEntity.ok("Role updated successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Новый эндпоинт: обновление данных из OpenDota
    @PostMapping("/update-opendota")
    public ResponseEntity<?> updateFromOpenDota(HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }
        try {
            service.updatePlayerFromOpenDota(steamId);
            Players updatedPlayer = service.findBySteamId(steamId);
            return ResponseEntity.ok(updatedPlayer);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // Новый эндпоинт: получение данных из OpenDota
    @GetMapping("/opendota-data")
    public ResponseEntity<?> getOpenDotaData(HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }
        try {
            Map<String, Object> opendotaData = service.getOpenDotaData(steamId);
            return ResponseEntity.ok(opendotaData);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // Новый эндпоинт: получение матчей из OpenDota
    @GetMapping("/opendota-matches")
    public ResponseEntity<?> getOpenDotaMatches(HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }
        try {
            var matches = service.getPlayerMatches(steamId);
            return ResponseEntity.ok(matches);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
