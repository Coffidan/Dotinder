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

    public Players getNextPlayerToSwipe(String steamId, int minMmr, int maxMmr) {
        List<Players> unswipedPlayers = swipeRepository.findUnswipedPlayers(steamId);
        return unswipedPlayers.stream()
                .filter(p -> p.getMmr() >= minMmr && p.getMmr() <= maxMmr)
                .findFirst()
                .orElse(null);
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

        // Проверка на матч с логами
        if (liked) {
            logger.debug("Checking for match between {} and {}", swiperSteamId, swipedSteamId);
            if (checkForMatch(swiperSteamId, swipedSteamId)) {
                logger.info("Match detected between {} and {}", swiperSteamId, swipedSteamId);
                Map<String, Object> notifForSwiper = Map.of(
                        "type", "MATCH",
                        "message", "У вас матч с пользователем " + swipedSteamId + "! Проверьте страницу матчей.",
                        "partnerId", swipedSteamId
                );
                Map<String, Object> notifForSwiped = Map.of(
                        "type", "MATCH",
                        "message", "У вас матч с пользователем " + swiperSteamId + "! Проверьте страницу матчей.",
                        "partnerId", swiperSteamId
                );
                messagingTemplate.convertAndSendToUser(swiperSteamId, "/queue/notifications", notifForSwiper);
                messagingTemplate.convertAndSendToUser(swipedSteamId, "/queue/notifications", notifForSwiped);
                logger.info("Notifications sent to {} and {}", swiperSteamId, swipedSteamId);
            } else {
                logger.debug("No match found for {} and {}", swiperSteamId, swipedSteamId);
            }
        }

        return swipe;
    }

    public boolean checkForMatch(String steamId1, String steamId2) {
        Optional<SwipeEntity> swipe1 = swipeRepository.findBySwiperSteamIdAndSwipedSteamId(steamId1, steamId2);
        Optional<SwipeEntity> swipe2 = swipeRepository.findBySwiperSteamIdAndSwipedSteamId(steamId2, steamId1);
        boolean isMatch = swipe1.isPresent() && swipe1.get().getLiked() && swipe2.isPresent() && swipe2.get().getLiked();
        logger.debug("Match check: swipe1={} (liked={}), swipe2={} (liked={})", swipe1.isPresent(), swipe1.map(SwipeEntity::getLiked).orElse(false), swipe2.isPresent(), swipe2.map(SwipeEntity::getLiked).orElse(false));
        return isMatch;
    }

    public List<Players> getMatches(String steamId) {
        List<SwipeEntity> matchSwipes = swipeRepository.findBySwiperSteamIdAndLiked(steamId, true)
                .stream()
                .filter(swipe -> checkForMatch(steamId, swipe.getSwipedSteamId()))
                .collect(Collectors.toList());

        return matchSwipes.stream()
                .map(swipe -> playersService.findBySteamId(swipe.getSwipedSteamId()))
                .filter(player -> player != null)
                .collect(Collectors.toList());
    }
}
