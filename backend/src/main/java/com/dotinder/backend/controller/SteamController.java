package com.dotinder.backend.controller;

import com.dotinder.backend.model.Players;
import com.dotinder.backend.service.PlayersService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
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

    private static final Logger logger = LoggerFactory.getLogger(SteamController.class);

    private static final String STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
    private static final String STEAM_CLAIMED_ID_PREFIX = "https://steamcommunity.com/openid/id/";

    @Autowired
    private PlayersService playersService;

    @Value("${steam.api.key}")
    private String steamApiKey;

    @GetMapping("/login/steam/callback")
    public void steamCallback(
            @RequestParam Map<String, String> allParams,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {

        String claimedId = allParams.get("openid.claimed_id");
        String mode = allParams.get("openid.mode");

        if (!"id_res".equals(mode) || claimedId == null) {
            logger.warn("Invalid OpenID response: mode={}, claimedId={}", mode, claimedId);
            response.sendRedirect("http://localhost:3000/login?error=invalid");
            return;
        }

        // Проверяем, что claimed_id принадлежит Steam и содержит корректный SteamID64.
        if (!claimedId.startsWith(STEAM_CLAIMED_ID_PREFIX)) {
            logger.warn("Rejected OpenID claimed_id with unexpected prefix");
            response.sendRedirect("http://localhost:3000/login?error=invalid");
            return;
        }

        String steamId = claimedId.substring(STEAM_CLAIMED_ID_PREFIX.length());
        if (!steamId.matches("^\\d{17}$")) {
            logger.warn("Rejected OpenID response: malformed Steam ID");
            response.sendRedirect("http://localhost:3000/login?error=invalid");
            return;
        }

        // КРИТИЧНО: проверяем подпись ответа в Steam, иначе вход можно подделать.
        if (!verifyWithSteam(allParams)) {
            logger.warn("Steam OpenID signature verification failed for steamId={}", steamId);
            response.sendRedirect("http://localhost:3000/login?error=invalid");
            return;
        }

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

            // Сохраняем базовый профиль перед обновлением статистики
            playersService.save(player);
            // Подтягиваем данные OpenDota (MMR, winrate, opendotaId)
            playersService.updatePlayerFromOpenDota(steamId);
            logger.info("Created new player: {}", player.getNickname());
        } else {
            // Обновляем lastLogin
            player.setLastLogin(java.time.LocalDateTime.now());
            playersService.save(player);
            logger.info("Updated existing player: {}", player.getNickname());
            // Обновляем статистику при логине если устарела (>12ч)
            try {
                if (playersService.needsStatsUpdate(player, 12)) {
                    playersService.updatePlayerFromOpenDota(steamId);
                }
            } catch (Exception ignore) {}
        }

        // Устанавливаем аутентификацию и сессию
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(steamId, null, java.util.Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        request.getSession().setAttribute("steamId", steamId);
        request.getSession().setAttribute("authenticated", true);

        logger.info("Authentication set for steamId={}", steamId);
        response.sendRedirect("http://localhost:3000/profile");
    }

    // Проверка подписи ответа Steam OpenID (check_authentication).
    private boolean verifyWithSteam(Map<String, String> params) {
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            for (Map.Entry<String, String> entry : params.entrySet()) {
                if (entry.getKey().startsWith("openid.")) {
                    form.add(entry.getKey(), entry.getValue());
                }
            }
            // Требуется для режима подтверждения подписи.
            form.set("openid.mode", "check_authentication");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(form, headers);

            RestTemplate restTemplate = new RestTemplate();
            String responseBody = restTemplate.postForObject(STEAM_OPENID_ENDPOINT, entity, String.class);
            return responseBody != null && responseBody.contains("is_valid:true");
        } catch (Exception e) {
            logger.error("Error while verifying Steam OpenID response", e);
            return false;
        }
    }

    private Map<String, Object> fetchSteamUserData(String steamId) {
        try {
            String url = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" + steamApiKey + "&steamids=" + steamId;
            RestTemplate restTemplate = new RestTemplate();
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            logger.warn("Error fetching Steam data: {}", e.getMessage());
            return null;
        }
    }
}
