package com.dotinder.backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Swipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne  // Связь с User (кто свайпнул)
    private Players playersFrom;

    @ManyToOne  // Кого свайпнули
    private Players playersTo;

    private boolean isLike;   // true = like, false = dislike
    private boolean isMatch;  // true, если взаимный like
}
