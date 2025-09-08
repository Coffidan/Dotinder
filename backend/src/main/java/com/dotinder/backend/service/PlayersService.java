package com.dotinder.backend.service;
import com.dotinder.backend.model.Players;
import com.dotinder.backend.repository.PlayersRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import java.util.Map;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
@Service
public class PlayersService {
    @Autowired
    private PlayersRepository repo;
    @Value("${opendota.api.key:}")
    private String openDotaApiKey;
    private final RestTemplate restTemplate = new RestTemplate();
    private final Map<String, Integer> requestCounts = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> lastRequestTimes = new ConcurrentHashMap<>();
    // Rate limiting: 60 запросов в минуту
    private static final int MAX_REQUESTS_PER_MINUTE = 60;
    public Players savePlayer(Players player) {
        return repo.save(player);
    }
    public Map<String, Object> getOpenDotaData(String steamId) {
        // Проверяем rate limiting
        if (!checkRateLimit(steamId)) {
            throw new RuntimeException("Rate limit exceeded. Please try again later.");
        }
        try {
            long accountId32 = steam64ToAccount32(steamId);
            String url = buildOpenDotaUrl("https://api.opendota.com/api/players/" + accountId32);
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null) {
                updateRequestCount(steamId);
                return response;
            }
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                throw new RuntimeException("OpenDota API rate limit exceeded");
            } else if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new RuntimeException("Player not found in OpenDota");
            }
            throw new RuntimeException("Error fetching data from OpenDota API: " + e.getMessage());
        } catch (Exception e) {
            throw new RuntimeException("Error fetching OpenDota data: " + e.getMessage());
        }
        return Map.of();
    }

    private String buildOpenDotaUrl(String base) {
        if (openDotaApiKey != null && !openDotaApiKey.isBlank()) {
            return base + (base.contains("?") ? "&" : "?") + "api_key=" + openDotaApiKey;
        }
        return base;
    }

    public List<Map<String, Object>> getPlayerMatches(String steamId) {
        if (!checkRateLimit(steamId)) {
            throw new RuntimeException("Rate limit exceeded. Please try again later.");
        }

        try {
            long accountId32 = steam64ToAccount32(steamId);
            String url = buildOpenDotaUrl("https://api.opendota.com/api/players/" + accountId32 + "/recentMatches");
            List<Map<String, Object>> response = restTemplate.getForObject(url, List.class);
            
            if (response != null) {
                updateRequestCount(steamId);
                return response;
            }
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new RuntimeException("Player matches not found");
            }
            throw new RuntimeException("Error fetching matches from OpenDota API: " + e.getMessage());
        } catch (Exception e) {
            throw new RuntimeException("Error fetching OpenDota matches: " + e.getMessage());
        }
        return List.of();
    }

    private Map<String, Object> getWinLoss(String steamId) {
        if (!checkRateLimit(steamId)) {
            throw new RuntimeException("Rate limit exceeded. Please try again later.");
        }
        try {
            long accountId32 = steam64ToAccount32(steamId);
            String url = buildOpenDotaUrl("https://api.opendota.com/api/players/" + accountId32 + "/wl");
            Map<String, Object> wl = restTemplate.getForObject(url, Map.class);
            if (wl != null) {
                updateRequestCount(steamId);
                return wl;
            }
        } catch (Exception e) {
            throw new RuntimeException("Error fetching win/loss from OpenDota: " + e.getMessage());
        }
        return Map.of();
    }

    public void updatePlayerStats(String steamId) {
        try {
            Map<String, Object> opendotaData = getOpenDotaData(steamId);
            if (opendotaData != null) {
                Players player = findBySteamId(steamId);
                if (player != null) {
                    // Обновляем MMR
                    updateMmrFromOpenDota(player, opendotaData);
                    
                    // Обновляем винрейт
                    updateWinrateFromOpenDota(player, steamId);
                    
                    // Обновляем время последнего обновления
                    player.setLastStatsUpdate(LocalDateTime.now());
                    
                    savePlayer(player);
                }
            }
        } catch (Exception e) {
            System.err.println("Error updating player stats: " + e.getMessage());
            // Не выбрасываем исключение, чтобы приложение продолжало работать
        }
    }

    public boolean needsStatsUpdate(Players player, long staleHours) {
        if (player == null) return false;
        if (player.getLastStatsUpdate() == null) return true;
        LocalDateTime cutoff = LocalDateTime.now().minusHours(staleHours);
        return player.getLastStatsUpdate().isBefore(cutoff);
    }

    private void updateMmrFromOpenDota(Players player, Map<String, Object> opendotaData) {
        try {
            // Если у игрока нет ранга в OpenDota — жёстко считаем MMR = 0
            Number rt = (Number) opendotaData.get("rank_tier");
            if (rt == null || rt.intValue() <= 0) {
                player.setRankTier(null);
                player.setLeaderboardRank(null);
                player.setMmr(0);
                // Обновляем opendotaId на всякий случай
                try {
                    long accountId32 = steam64ToAccount32(player.getSteamId());
                    player.setOpendotaId(String.valueOf(accountId32));
                } catch (Exception ignore) {}
                return;
            }

            // Пытаемся получить MMR из разных источников
            Integer mmr = null;
            
            // 1. Пробуем получить из mmr_estimate
            Map<String, Object> mmrEstimate = (Map<String, Object>) opendotaData.get("mmr_estimate");
            if (mmrEstimate != null && mmrEstimate.get("estimate") != null) {
                Number n = (Number) mmrEstimate.get("estimate");
                mmr = n != null ? n.intValue() : null;
            }
            
            // 2. Если нет mmr_estimate, пробуем получить из solo_competitive_rank
            if (mmr == null && opendotaData.get("solo_competitive_rank") != null) {
                Number n = (Number) opendotaData.get("solo_competitive_rank");
                mmr = n != null ? n.intValue() : null;
            }
            
            // 3. Если нет solo_competitive_rank, пробуем получить из competitive_rank
            if (mmr == null && opendotaData.get("competitive_rank") != null) {
                Number n = (Number) opendotaData.get("competitive_rank");
                mmr = n != null ? n.intValue() : null;
            }

            // 4. Если MMR так и не найден, приблизительно оцениваем его по rank_tier
            if (mmr == null) {
                mmr = estimateMmrFromRankTier(rt.intValue());
            }
            
            if (mmr != null && mmr > 0) {
                player.setMmr(mmr);
            }
            // Сохраняем opendotaId (account_id32) если можем
            try {
                long accountId32 = steam64ToAccount32(player.getSteamId());
                player.setOpendotaId(String.valueOf(accountId32));
            } catch (Exception ignore) {}

            // Сохраняем rank_tier и leaderboard_rank
            try {
                player.setRankTier(rt.intValue());
                Number leaderboard = (Number) opendotaData.get("leaderboard_rank");
                if (leaderboard != null) {
                    player.setLeaderboardRank(leaderboard.intValue());
                }
            } catch (Exception ignore) {}
        } catch (Exception e) {
            System.err.println("Error updating MMR from OpenDota: " + e.getMessage());
        }
    }

    private void updateWinrateFromOpenDota(Players player, String steamId) {
        try {
            Map<String, Object> wl = getWinLoss(steamId);
            if (wl != null && !wl.isEmpty()) {
                Number winsN = (Number) wl.get("win");
                Number lossesN = (Number) wl.get("lose");
                int wins = winsN != null ? winsN.intValue() : 0;
                int losses = lossesN != null ? lossesN.intValue() : 0;
                int total = wins + losses;
                if (total > 0) {
                    double winrate = (double) wins / total * 100.0;
                    player.setWinrate(Math.round(winrate * 100.0) / 100.0);
                }
            }
        } catch (Exception e) {
            System.err.println("Error updating winrate from OpenDota: " + e.getMessage());
        }
    }

    private long steam64ToAccount32(String steamId) {
        // OpenDota ожидает 32-битный account_id, конвертируем из SteamID64
        long steam64 = Long.parseUnsignedLong(steamId);
        return steam64 - 76561197960265728L;
    }

    private Integer estimateMmrFromRankTier(int rankTier) {
        // Примерная оценка MMR по медали. Работает как фолбэк, если API не отдало mmr.
        int major = rankTier / 10; // 1..8
        int minor = rankTier % 10; // 0..9 (обычно 1..5)
        // Базовые точки по медалям (средние значения диапазонов)
        int base;
        switch (major) {
            case 1: base = 400; break;   // Herald
            case 2: base = 1000; break;  // Guardian
            case 3: base = 1600; break;  // Crusader
            case 4: base = 2200; break;  // Archon
            case 5: base = 2800; break;  // Legend
            case 6: base = 3400; break;  // Ancient
            case 7: base = 4500; break;  // Divine
            case 8: base = 6000; break;  // Immortal
            default: base = 2000;
        }
        // Мелкие ступени добавляют по ~120 MMR
        int step = Math.max(0, Math.min(minor, 5)) * 120;
        int estimate = base + step;
        return Math.max(0, Math.min(10000, estimate));
    }

    private boolean checkRateLimit(String steamId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastRequest = lastRequestTimes.get(steamId);
        
        if (lastRequest == null || ChronoUnit.MINUTES.between(lastRequest, now) >= 1) {
            // Сбрасываем счетчик если прошла минута
            requestCounts.put(steamId, 0);
            lastRequestTimes.put(steamId, now);
        }
        
        Integer currentCount = requestCounts.get(steamId);
        if (currentCount == null) {
            currentCount = 0;
        }
        
        return currentCount < MAX_REQUESTS_PER_MINUTE;
    }

    private void updateRequestCount(String steamId) {
        Integer currentCount = requestCounts.get(steamId);
        if (currentCount == null) {
            currentCount = 0;
        }
        requestCounts.put(steamId, currentCount + 1);
    }

    public Players findBySteamId(String steamId) {
        return repo.findBySteamId(steamId);
    }

    public Players save(Players player) {
        return repo.save(player);
    }

    public void updateMmr(String steamId, int mmr) {
        throw new UnsupportedOperationException("MMR управляется OpenDota и не может изменяться вручную");
    }

    public void updateRole(String steamId, String role) {
        Players player = findBySteamId(steamId);
        if (player == null) {
            throw new RuntimeException("Player not found");
        }
        if (role == null || role.trim().isEmpty()) {
            throw new IllegalArgumentException("Role cannot be empty");
        }
        // Валидация ролей
        String[] validRoles = {"carry", "mid", "offlane", "support", "hard_support"};
        boolean isValidRole = false;
        for (String validRole : validRoles) {
            if (validRole.equals(role)) {
                isValidRole = true;
                break;
            }
        }
        if (!isValidRole) {
            throw new IllegalArgumentException("Invalid role. Must be one of: carry, mid, offlane, support, hard_support");
        }
        player.setRole(role);
        savePlayer(player);
    }

    public void updatePlayerFromOpenDota(String steamId) {
        try {
            updatePlayerStats(steamId);
        } catch (Exception e) {
            System.err.println("Error updating player from OpenDota: " + e.getMessage());
            // Не подставляем тестовые значения; оставляем как есть
        }
    }
}
