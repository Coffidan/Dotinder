package com.dotinder.backend.repository;

import com.dotinder.backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySenderIdAndRecipientIdOrRecipientIdAndSenderIdOrderByTimestampAsc(
            String senderId1, String recipientId1, String senderId2, String recipientId2);
}
