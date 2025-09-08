package com.dotinder.backend.controller;

import com.dotinder.backend.entity.ChatMessage;
import com.dotinder.backend.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;

@RestController
public class ChatRestController {

    @Autowired
    private ChatService chatService;

    @GetMapping("/api/chat/history")
    public List<ChatMessage> getHistory(@RequestParam String partnerId, HttpServletRequest request) {
        String steamId = (String) request.getSession().getAttribute("steamId");
        if (steamId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return chatService.getChatHistory(steamId, partnerId);
    }
}
