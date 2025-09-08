package com.dotinder.backend.controller;

import com.dotinder.backend.model.Message;
import com.dotinder.backend.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/messages")  // Базовый URL для всех методов
public class MessageController {

    @Autowired
    private MessageService service;  // Инъекция сервиса для Message

    @PostMapping  // POST /api/messages для создания сообщения
    public Message createMessage(@RequestBody Message message) {
        return service.saveMessage(message);
    }

    @GetMapping("/{id}")  // GET /api/messages/{id} для поиска по ID
    public Message getMessage(@PathVariable Long id) {
        return service.findById(id);
    }
}
