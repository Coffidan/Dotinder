package com.dotinder.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketConfig.class);

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(new CustomHandshakeInterceptor())
                .withSockJS();
        logger.info("WebSocket endpoint /ws registered with SockJS and handshake interceptor");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompPrincipalInterceptor());
    }

    @Bean
    public org.springframework.messaging.support.ChannelInterceptor stompPrincipalInterceptor() {
        return new org.springframework.messaging.support.ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    Object sessionAttrs = accessor.getSessionAttributes();
                    if (sessionAttrs != null) {
                        Object steamIdRaw = accessor.getSessionAttributes().get("steamId");
                        if (steamIdRaw != null) {
                            accessor.setUser(new StompPrincipal(steamIdRaw.toString()));
                            logger.debug("STOMP principal set: {}", steamIdRaw);
                        } else {
                            String fallbackLogin = accessor.getFirstNativeHeader("login");
                            if (fallbackLogin != null && !fallbackLogin.isBlank()) {
                                accessor.setUser(new StompPrincipal(fallbackLogin));
                                logger.debug("STOMP principal set from login header: {}", fallbackLogin);
                            }
                        }
                    }
                }
                return message;
            }
        };
    }
}
