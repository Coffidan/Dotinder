package com.dotinder.backend.repository;

import com.dotinder.backend.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    // Кастомный метод: поиск сообщений по отправителю
    // List<Message> findBySender(Players sender); // Добавь, если нужно
}
