package com.dotinder.backend.service;

import com.dotinder.backend.model.Players;
import com.dotinder.backend.repository.PlayersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class PlayersService {

    @Autowired
    private PlayersRepository repo; // Инъекция репозитория

    public Players savePlayer(Players player) {
        return repo.save(player); // Сохраняет или обновляет игрока в БД
    }

    public void updatePlayerStats(String steamId) {
        RestTemplate restTemplate = new RestTemplate();
        String url = "https://api.opendota.com/api/players/" + steamId;
        Map response = restTemplate.getForObject(url, Map.class);

        if (response != null) {
            Players player = findBySteamId(steamId);
            if (player != null) {
                // Парсим MMR (пример: из поля "mmr_estimate" > "estimate")
                Map mmrData = (Map) response.get("mmr_estimate");
                if (mmrData != null && mmrData.get("estimate") != null) {
                    player.setMmr((Integer) mmrData.get("estimate"));
                    savePlayer(player); // Обновляем в БД
                }
            }
        }
    }

    public Players findBySteamId(String steamId) {
        return repo.findBySteamId(steamId); // Поиск по Steam ID
    }

    public Players save(Players player) {
        return repo.save(player);
    }

    // Новый метод: обновление MMR с валидацией
    public void updateMmr(String steamId, int mmr) {
        Players player = findBySteamId(steamId);
        if (player == null) {
            throw new RuntimeException("Player not found");
        }
        if (mmr < 0 || mmr > 10000) {
            throw new IllegalArgumentException("MMR must be between 0 and 10000");
        }
        player.setMmr(mmr);
        savePlayer(player);
    }

    // Можно добавить больше методов позже, напр. для обновления MMR
}
