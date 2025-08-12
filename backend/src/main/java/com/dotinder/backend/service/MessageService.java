package com.dotinder.backend.service;

import com.dotinder.backend.model.Message;
import com.dotinder.backend.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MessageService {

    @Autowired
    private MessageRepository repo;  // Инъекция репозитория для Message

    public Message saveMessage(Message message) {
        return repo.save(message);  // Сохраняет или обновляет сообщение в БД
    }

    // Пример кастомного метода: найти сообщение по ID
    public Message findById(Long id) {
        return repo.findById(id).orElse(null);  // Возвращает сообщение или null, если не найдено
    }
}
