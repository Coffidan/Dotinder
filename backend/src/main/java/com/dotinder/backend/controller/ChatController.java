package com.dotinder.backend.controller;

import com.dotinder.backend.entity.ChatMessage;
import com.dotinder.backend.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @Autowired
    private ChatService chatService;

    // PUBLIC
    @MessageMapping("/chat.sendMessage")
    public void sendPublicMessage(@Payload Map<String, Object> message, Principal principal) {
        String senderId = (principal != null) ? principal.getName() : (String) message.get("senderId");
        String senderNickname = (String) message.getOrDefault("senderNickname", message.getOrDefault("sender", "Guest"));
        String content = (String) message.get("content");
        if (content == null || content.isBlank()) return;

        ChatMessage entity = new ChatMessage();
        entity.setSenderId(senderId != null ? senderId : "anonymous");
        entity.setRecipientId(ChatService.PUBLIC_RECIPIENT);
        entity.setContent(content);
        ChatMessage saved = chatService.saveMessage(entity);

        Map<String, Object> out = new HashMap<>();
        out.put("id", saved.getId());
        out.put("senderId", entity.getSenderId());
        out.put("sender", senderNickname);
        out.put("senderNickname", senderNickname);
        out.put("content", content);
        out.put("timestamp", saved.getTimestamp() != null
                ? saved.getTimestamp().atZone(ZoneOffset.UTC).toInstant().toString()
                : LocalDateTime.now().atZone(ZoneOffset.UTC).toInstant().toString());

        messagingTemplate.convertAndSend("/topic/public", out);
    }

    // PRIVATE (важно: principal — это steamId!)
    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload Map<String, Object> payload, Principal principal) {
        String recipient = (String) payload.get("recipient");
        if (recipient == null) recipient = (String) payload.get("recipientId");
        String content = (String) payload.get("content");
        String sender = (principal != null) ? principal.getName() : (String) payload.get("sender");
        if (sender == null) sender = (String) payload.get("senderId");
        String senderNickname = (String) payload.getOrDefault("senderNickname", payload.getOrDefault("sender", sender));
        String recipientNickname = (String) payload.get("recipientNickname");

        if (content == null || content.isBlank() || recipient == null || sender == null) return;

        ChatMessage message = new ChatMessage();
        message.setSenderId(sender);
        message.setRecipientId(recipient);
        message.setContent(content);
        ChatMessage saved = chatService.saveMessage(message);

        Map<String, Object> out = new HashMap<>();
        out.put("id", saved.getId());
        out.put("senderId", sender);
        out.put("sender", senderNickname);
        out.put("senderNickname", senderNickname);
        out.put("recipientId", recipient);
        out.put("recipient", recipient);
        out.put("recipientNickname", recipientNickname);
        out.put("content", content);
        out.put("timestamp", saved.getTimestamp() != null
                ? saved.getTimestamp().atZone(ZoneOffset.UTC).toInstant().toString()
                : LocalDateTime.now().atZone(ZoneOffset.UTC).toInstant().toString());

        messagingTemplate.convertAndSendToUser(recipient, "/queue/private", out);
        messagingTemplate.convertAndSendToUser(sender, "/queue/private", out);
    }
}
