# Инструкция по запуску Dotinder

1. Установите Docker (если не установлен).
2. Импортируйте образы:
   docker load < frontend.tar
   docker load < backend.tar

3. Запустите проект:
   docker-compose up -d --build

4. Откройте в браузере:
   - Frontend: http://localhost:3000
   - Backend API, для теста, что запросы проходят: http://localhost:8080

5. Если нужно, настройте env в docker-compose.yml (пароли для бд, сейчас логин - user, пароль - password).
