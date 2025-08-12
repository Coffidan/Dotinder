package com.dotinder.backend.service;

import com.dotinder.backend.entity.ChatMessage;
import com.dotinder.backend.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatService {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    public ChatMessage saveMessage(ChatMessage message) {
        return chatMessageRepository.save(message);
    }

    public List<ChatMessage> getChatHistory(String user1, String user2) {
        return chatMessageRepository.findBySenderIdAndRecipientIdOrRecipientIdAndSenderIdOrderByTimestampAsc(
                user1, user2, user1, user2);
    }
}
