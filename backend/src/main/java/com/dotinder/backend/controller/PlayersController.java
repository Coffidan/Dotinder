package com.dotinder.backend.controller;

import com.dotinder.backend.model.Players;
import com.dotinder.backend.service.PlayersService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

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
            if (player != null) {
                return ResponseEntity.ok(player);
            } else {
                // Создаем тестовый профиль если игрок не найден
                Players testPlayer = new Players();
                testPlayer.setSteamId(steamId);
                testPlayer.setNickname("TestPlayer_" + steamId.substring(0, 4));
                testPlayer.setMmr(2500);
                return ResponseEntity.ok(testPlayer);
            }
        } catch (Exception e) {
            System.out.println("Error finding player: " + e.getMessage());
            // Возвращаем тестовый профиль при ошибке
            return ResponseEntity.ok("{\"steamId\":\"" + steamId + "\",\"nickname\":\"TestUser\",\"mmr\":1000}");
        }
    }

    // Новый эндпоинт: обновление MMR
    @PutMapping("/update-mmr")
    public ResponseEntity<String> updateMmr(@RequestParam int mmr, HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }
        try {
            service.updateMmr(steamId, mmr);
            return ResponseEntity.ok("MMR updated successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
