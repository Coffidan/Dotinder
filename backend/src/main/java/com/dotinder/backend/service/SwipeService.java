package com.dotinder.backend.service;

import com.dotinder.backend.entity.SwipeEntity;
import com.dotinder.backend.model.Players;
import com.dotinder.backend.repository.SwipeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SwipeService {

    private static final Logger logger = LoggerFactory.getLogger(SwipeService.class);

    @Autowired
    private SwipeRepository swipeRepository;

    @Autowired
    private PlayersService playersService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public Players getNextPlayerToSwipe(String steamId, int minMmr, int maxMmr, String role, Double minWinrate) {
        List<Players> unswipedPlayers = swipeRepository.findUnswipedPlayers(steamId);
        Players candidate = unswipedPlayers.stream()
                .filter(p -> p.getMmr() != null)
                .filter(p -> p.getMmr() >= minMmr && p.getMmr() <= maxMmr)
                .filter(p -> role == null || role.isBlank() || role.equals(p.getRole()))
                .filter(p -> minWinrate == null || (p.getWinrate() != null && p.getWinrate() >= minWinrate))
                .findFirst()
                .orElse(null);

        if (candidate == null) return null;

        boolean needsUpdate = candidate.getLastStatsUpdate() == null
                || playersService.needsStatsUpdate(candidate, 24);
        if (needsUpdate) {
            try {
                playersService.updatePlayerStats(candidate.getSteamId());
                candidate = playersService.findBySteamId(candidate.getSteamId());
            } catch (Exception ignore) {}
        }
        return candidate;
    }

    public Players getNextPlayerToSwipe(String steamId, int minMmr, int maxMmr) {
        return getNextPlayerToSwipe(steamId, minMmr, maxMmr, null, null);
    }

    public SwipeEntity performSwipe(String swiperSteamId, String swipedSteamId, Boolean liked) {
        if (swiperSteamId == null || swipedSteamId == null || liked == null) {
            throw new IllegalArgumentException("Invalid swipe parameters");
        }

        Optional<SwipeEntity> existing = swipeRepository.findBySwiperSteamIdAndSwipedSteamId(swiperSteamId, swipedSteamId);
        if (existing.isPresent()) {
            throw new RuntimeException("Already swiped this player");
        }

        SwipeEntity swipe = new SwipeEntity(swiperSteamId, swipedSteamId, liked);
        swipeRepository.save(swipe);

        if (liked) {
            logger.debug("Checking for match between {} and {}", swiperSteamId, swipedSteamId);
            if (checkForMatch(swiperSteamId, swipedSteamId)) {
                logger.info("Match detected between {} and {}", swiperSteamId, swipedSteamId);
                Map<String, Object> notifForSwiper = Map.of(
                        "type", "MATCH",
                        "message", "У вас матч! Проверьте страницу мэтчей.",
                        "partnerId", swipedSteamId
                );
                Map<String, Object> notifForSwiped = Map.of(
                        "type", "MATCH",
                        "message", "У вас матч! Проверьте страницу мэтчей.",
                        "partnerId", swiperSteamId
                );
                sendNotification(swiperSteamId, notifForSwiper);
                sendNotification(swipedSteamId, notifForSwiped);
            }
        }
        return swipe;
    }

    private void sendNotification(String steamId, Map<String, Object> payload) {
        try {
            messagingTemplate.convertAndSendToUser(steamId, "/queue/notifications", payload);
            logger.debug("Notification sent to {}", steamId);
        } catch (Exception e) {
            logger.warn("Failed to send WS notification to {}: {}", steamId, e.getMessage());
        }
    }

    public boolean checkForMatch(String steamId1, String steamId2) {
        Optional<SwipeEntity> swipe1 = swipeRepository.findBySwiperSteamIdAndSwipedSteamId(steamId1, steamId2);
        Optional<SwipeEntity> swipe2 = swipeRepository.findBySwiperSteamIdAndSwipedSteamId(steamId2, steamId1);
        return swipe1.isPresent() && Boolean.TRUE.equals(swipe1.get().getLiked())
                && swipe2.isPresent() && Boolean.TRUE.equals(swipe2.get().getLiked());
    }

    public List<Players> getMatches(String steamId) {
        List<SwipeEntity> matchSwipes = swipeRepository.findBySwiperSteamIdAndLiked(steamId, true)
                .stream()
                .filter(swipe -> checkForMatch(steamId, swipe.getSwipedSteamId()))
                .collect(Collectors.toList());

        return matchSwipes.stream()
                .map(swipe -> {
                    Players p = playersService.findBySteamId(swipe.getSwipedSteamId());
                    if (p != null && (p.getLastStatsUpdate() == null || playersService.needsStatsUpdate(p, 24))) {
                        try {
                            new Thread(() -> {
                                try { playersService.updatePlayerStats(p.getSteamId()); } catch (Exception ignore) {}
                            }).start();
                        } catch (Exception ignore) {}
                    }
                    return p;
                })
                .filter(player -> player != null)
                .collect(Collectors.toList());
    }
}
