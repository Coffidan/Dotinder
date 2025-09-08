package com.dotinder.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Players sender;     // Отправитель

    @ManyToOne
    private Players receiver;   // Получатель

    private String text;     // Текст сообщения
    private LocalDateTime timestamp;  // Время отправки
}
