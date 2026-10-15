package com.dotinder.backend.service;

import com.dotinder.backend.model.Players;
import com.dotinder.backend.repository.PlayersRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class PlayersService {

    private static final Logger logger = LoggerFactory.getLogger(PlayersService.class);

    @Autowired
    private PlayersRepository repo;

    @Value("${opendota.api.key:}")
    private String openDotaApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final Map<String, Integer> requestCounts = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> lastRequestTimes = new ConcurrentHashMap<>();

    private static final int MAX_REQUESTS_PER_MINUTE = 60;
    private static final long STEAM64_BASE = 76561197960265728L;

    private static final Map<Integer, String> MEDAL_NAMES = Map.ofEntries(
            Map.entry(1, "Herald"),
            Map.entry(2, "Guardian"),
            Map.entry(3, "Crusader"),
            Map.entry(4, "Archon"),
            Map.entry(5, "Legend"),
            Map.entry(6, "Ancient"),
            Map.entry(7, "Divine"),
            Map.entry(8, "Immortal")
    );

    private static final Map<Integer, int[]> MEDAL_MMR_RANGES = Map.ofEntries(
            Map.entry(1, new int[]{0, 769}),
            Map.entry(2, new int[]{770, 1539}),
            Map.entry(3, new int[]{1540, 2309}),
            Map.entry(4, new int[]{2310, 3079}),
            Map.entry(5, new int[]{3080, 3849}),
            Map.entry(6, new int[]{3850, 4609}),
            Map.entry(7, new int[]{4610, 5429}),
            Map.entry(8, new int[]{5430, 10000})
    );

    public Players savePlayer(Players player) {
        return repo.save(player);
    }

    public Map<String, Object> getOpenDotaData(String steamId) {
        if (!checkRateLimit(steamId)) {
            logger.warn("Rate limit exceeded for steamId: {}", steamId);
            throw new RuntimeException("Rate limit exceeded. Please try again later.");
        }
        try {
            long accountId32 = steam64ToAccount32(steamId);
            String url = buildOpenDotaUrl("https://api.opendota.com/api/players/" + accountId32);
            logger.debug("Fetching OpenDota data from: {}", url.replaceFirst("api_key=[^&]*", "api_key=***"));
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null) {
                updateRequestCount(steamId);
                logger.debug("OpenDota data fetched for steamId: {}", steamId);
                return response;
            }
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                logger.warn("OpenDota API rate limit hit for steamId: {}", steamId);
            } else if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                logger.info("Player not found in OpenDota: {}", steamId);
            } else {
                logger.error("HTTP error fetching OpenDota data: {} - {}", e.getStatusCode(), e.getMessage());
            }
        } catch (Exception e) {
            logger.debug("Error fetching OpenDota data for {}: {}", steamId, e.getMessage());
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
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> response = restTemplate.getForObject(url, List.class);
            if (response != null) {
                updateRequestCount(steamId);
                return response;
            }
        } catch (HttpClientErrorException e) {
            logger.debug("Error fetching matches from OpenDota: {}", e.getMessage());
        } catch (Exception e) {
            logger.debug("Error fetching OpenDota matches for {}: {}", steamId, e.getMessage());
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
            @SuppressWarnings("unchecked")
            Map<String, Object> wl = restTemplate.getForObject(url, Map.class);
            if (wl != null) {
                updateRequestCount(steamId);
                return wl;
            }
        } catch (Exception e) {
            logger.debug("Error fetching win/loss for {}: {}", steamId, e.getMessage());
        }
        return Map.of();
    }

    public void updatePlayerStats(String steamId) {
        logger.info("Updating player stats for steamId: {}", steamId);
        try {
            Map<String, Object> opendotaData = getOpenDotaData(steamId);
            if (opendotaData != null && !opendotaData.isEmpty()) {
                Players player = findBySteamId(steamId);
                if (player != null) {
                    updateMmrFromOpenDota(player, opendotaData);
                    updateWinrateFromOpenDota(player, steamId);
                    player.setLastStatsUpdate(LocalDateTime.now());
                    savePlayer(player);
                    logger.info("Player stats updated: steamId={}, mmr={}, rankTier={}, winrate={}",
                            steamId, player.getMmr(), player.getRankTier(), player.getWinrate());
                }
            }
        } catch (Exception e) {
            logger.warn("Error updating player stats for {}: {}", steamId, e.getMessage());
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
            Number rt = (Number) opendotaData.get("rank_tier");
            int rankTier = rt != null ? rt.intValue() : 0;
            player.setRankTier(rankTier > 0 ? rankTier : null);

            try {
                long accountId32 = steam64ToAccount32(player.getSteamId());
                player.setOpendotaId(String.valueOf(accountId32));
            } catch (Exception ignore) {}

            Integer mmr = extractMmr(opendotaData);
            if (mmr == null && rankTier > 0) {
                mmr = estimateMmrFromRankTier(rankTier);
            }
            if (mmr == null) {
                mmr = 0;
            }
            player.setMmr(mmr);

            try {
                Number leaderboard = (Number) opendotaData.get("leaderboard_rank");
                player.setLeaderboardRank(leaderboard != null ? leaderboard.intValue() : null);
            } catch (Exception ignore) {}

        } catch (Exception e) {
            logger.warn("Error updating MMR from OpenDota for player {}: {}", player.getSteamId(), e.getMessage());
        }
    }

    private Integer extractMmr(Map<String, Object> data) {
        Integer mmr = null;
        try {
            Object mmrEst = data.get("mmr_estimate");
            if (mmrEst instanceof Map<?, ?>) {
                @SuppressWarnings("unchecked")
                Map<String, Object> mmrEstimate = (Map<String, Object>) mmrEst;
                Object estimate = mmrEstimate.get("estimate");
                if (estimate instanceof Number n) {
                    mmr = n.intValue();
                }
            }
            if (mmr == null) {
                Object soloRank = data.get("solo_competitive_rank");
                if (soloRank instanceof Number n) {
                    mmr = n.intValue();
                }
            }
            if (mmr == null) {
                Object compRank = data.get("competitive_rank");
                if (compRank instanceof Number n) {
                    mmr = n.intValue();
                }
            }
        } catch (Exception ignore) {}
        return mmr;
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
            logger.debug("Error updating winrate from OpenDota for {}: {}", steamId, e.getMessage());
        }
    }

    private long steam64ToAccount32(String steamId) {
        try {
            long steam64 = Long.parseUnsignedLong(steamId);
            return steam64 - STEAM64_BASE;
        } catch (NumberFormatException e) {
            try {
                long id = Long.parseLong(steamId);
                if (id < STEAM64_BASE) return id;
                return id - STEAM64_BASE;
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("Invalid Steam ID: " + steamId);
            }
        }
    }

    private Integer estimateMmrFromRankTier(int rankTier) {
        int major = rankTier / 10;
        int minor = Math.max(0, Math.min(rankTier % 10, 5));

        int[] range = MEDAL_MMR_RANGES.get(major);
        if (range == null) {
            if (major < 1) return 500;
            return 6500;
        }
        int min = range[0];
        int max = range[1];
        int medalWidth = max - min;
        double stepFraction = minor > 0 ? (minor - 1) / 5.0 : 0;
        int estimate = (int) (min + medalWidth * (minor == 0 ? 0.1 : stepFraction));
        return Math.max(0, Math.min(10000, estimate));
    }

    public static String getMedalNameFromRankTier(Integer rankTier) {
        if (rankTier == null || rankTier <= 0) return "Uncalibrated";
        int major = rankTier / 10;
        int minor = rankTier % 10;
        String base = MEDAL_NAMES.getOrDefault(major, "Unknown");
        if (minor > 0 && major < 8) {
            return base + " " + minor;
        }
        if (major == 8 && minor > 0) {
            return base;
        }
        return base;
    }

    public static String getMedalNameFromMmr(int mmr) {
        return MEDAL_NAMES.entrySet().stream()
                .filter(e -> {
                    int[] r = MEDAL_MMR_RANGES.get(e.getKey());
                    return r != null && mmr >= r[0] && mmr <= r[1];
                })
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse("Uncalibrated");
    }

    public static String getMedalColorFromRankTier(Integer rankTier) {
        if (rankTier == null || rankTier <= 0) return "#5c6b7a";
        int major = rankTier / 10;
        return switch (major) {
            case 1 -> "#6b7280";
            case 2 -> "#16a34a";
            case 3 -> "#84cc16";
            case 4 -> "#38bdf8";
            case 5 -> "#6366f1";
            case 6 -> "#a855f7";
            case 7 -> "#f43f5e";
            case 8 -> "#fbbf24";
            default -> "#5c6b7a";
        };
    }

    private boolean checkRateLimit(String steamId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastRequest = lastRequestTimes.get(steamId);
        if (lastRequest == null || ChronoUnit.MINUTES.between(lastRequest, now) >= 1) {
            requestCounts.put(steamId, 0);
            lastRequestTimes.put(steamId, now);
        }
        Integer currentCount = requestCounts.getOrDefault(steamId, 0);
        return currentCount < MAX_REQUESTS_PER_MINUTE;
    }

    private void updateRequestCount(String steamId) {
        requestCounts.merge(steamId, 1, Integer::sum);
        lastRequestTimes.put(steamId, LocalDateTime.now());
    }

    public Players findBySteamId(String steamId) {
        return repo.findBySteamId(steamId);
    }

    public Players save(Players player) {
        return repo.save(player);
    }

    public void updateMmr(String steamId, int mmr) {
        if (mmr < 0 || mmr > 10000) {
            throw new IllegalArgumentException("MMR must be between 0 and 10000");
        }
        Players player = findBySteamId(steamId);
        if (player == null) throw new RuntimeException("Player not found");
        player.setMmr(mmr);
        savePlayer(player);
    }

    public void updateRole(String steamId, String role) {
        Players player = findBySteamId(steamId);
        if (player == null) throw new RuntimeException("Player not found");
        if (role == null || role.trim().isEmpty()) {
            throw new IllegalArgumentException("Role cannot be empty");
        }
        List<String> validRoles = List.of("carry", "mid", "offlane", "support", "hard_support");
        if (!validRoles.contains(role)) {
            throw new IllegalArgumentException("Invalid role. Must be one of: carry, mid, offlane, support, hard_support");
        }
        player.setRole(role);
        savePlayer(player);
    }

    public void updatePlayerFromOpenDota(String steamId) {
        updatePlayerStats(steamId);
    }

    public List<Players> findAllByFilters(String excludeSteamId, Integer minMmr, Integer maxMmr, String role, Double minWinrate) {
        List<Players> players = repo.findAll();
        return players.stream()
                .filter(p -> !p.getSteamId().equals(excludeSteamId))
                .filter(p -> p.getMmr() != null)
                .filter(p -> minMmr == null || p.getMmr() >= minMmr)
                .filter(p -> maxMmr == null || p.getMmr() <= maxMmr)
                .filter(p -> role == null || role.equals(p.getRole()))
                .filter(p -> minWinrate == null || (p.getWinrate() != null && p.getWinrate() >= minWinrate))
                .toList();
    }
}
