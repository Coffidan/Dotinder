package com.dotinder.backend.controller;

import com.dotinder.backend.model.Players;
import com.dotinder.backend.service.PlayersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

@RestController
public class SteamController {

    @Autowired
    private PlayersService playersService;

    @Value("${steam.api.key}")
    private String steamApiKey;

    @GetMapping("/login/steam/callback")
    public void steamCallback(
            @RequestParam Map<String, String> allParams,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {

        System.out.println("=== STEAM CALLBACK MANUAL ===");
        System.out.println("All params: " + allParams);

        String claimedId = allParams.get("openid.claimed_id");
        String mode = allParams.get("openid.mode");

        if (!"id_res".equals(mode) || claimedId == null) {
            System.out.println("Invalid OpenID response");
            response.sendRedirect("http://localhost:3000/login?error=invalid");
            return;
        }

        String steamId = claimedId.replace("https://steamcommunity.com/openid/id/", "");
        System.out.println("Extracted Steam ID: " + steamId);

        // Проверяем/создаём профиль
        Players player = playersService.findBySteamId(steamId);
        if (player == null) {
            player = new Players();
            player.setSteamId(steamId);

            // Тянем данные из Steam API
            Map<String, Object> steamData = fetchSteamUserData(steamId);
            if (steamData != null) {
                Map<String, Object> responseMap = (Map<String, Object>) steamData.get("response");
                if (responseMap != null) {
                    @SuppressWarnings("unchecked")
                    java.util.List<Map<String, Object>> playersList = (java.util.List<Map<String, Object>>) responseMap.get("players");
                    if (playersList != null && !playersList.isEmpty()) {
                        Map<String, Object> firstPlayer = playersList.get(0);
                        player.setNickname((String) firstPlayer.get("personaname"));
                        player.setAvatarUrl((String) firstPlayer.get("avatarfull"));
                    }
                }
            } else {
                player.setNickname("Player_" + steamId.substring(0, 5));  // Fallback
            }

            player.setMmr(1000);  // Начальный MMR
            playersService.save(player);
            System.out.println("Created new player with nickname: " + player.getNickname());
        } else {
            // Обновляем lastLogin
            player.setLastLogin(java.time.LocalDateTime.now());
            playersService.save(player);
            System.out.println("Updated existing player: " + player.getNickname());
        }

        // Устанавливаем аутентификацию и сессию
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(steamId, null, java.util.Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        request.getSession().setAttribute("steamId", steamId);
        request.getSession().setAttribute("authenticated", true);

        System.out.println("Authentication set for Steam ID: " + steamId);
        response.sendRedirect("http://localhost:3000/profile");
    }

    private Map<String, Object> fetchSteamUserData(String steamId) {
        try {
            String url = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" + steamApiKey + "&steamids=" + steamId;
            RestTemplate restTemplate = new RestTemplate();
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            System.out.println("Error fetching Steam data: " + e.getMessage());
            return null;
        }
    }
}
