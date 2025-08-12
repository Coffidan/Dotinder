package com.dotinder.backend.controller;

import com.dotinder.backend.entity.ChatMessage;
import com.dotinder.backend.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @Autowired
    private ChatService chatService;

    // PUBLIC
    @MessageMapping("/chat.sendMessage")
    public void sendPublicMessage(@Payload Map<String, Object> message) {
        messagingTemplate.convertAndSend("/topic/public", message);
    }

    // PRIVATE (важно: principal — это steamId!)
    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload Map<String, Object> payload, Principal principal) {
        String recipient = (String) payload.get("recipient");
        String content = (String) payload.get("content");
        String sender = (principal != null) ? principal.getName() : (String) payload.get("sender");

        // Сохраняем в БД
        ChatMessage message = new ChatMessage();
        message.setSenderId(sender);
        message.setRecipientId(recipient);
        message.setContent(content);
        chatService.saveMessage(message);

        messagingTemplate.convertAndSendToUser(recipient, "/queue/private", message);
        messagingTemplate.convertAndSendToUser(sender, "/queue/private", message);
    }
}
