# Базовый образ с Java 17 и Maven
FROM maven:3.8.4-openjdk-17 AS build

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем pom.xml и mvnw файлы
COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn

# Даем права на выполнение mvnw
RUN chmod +x mvnw

# Копируем исходный код
COPY src ./src

# Собираем проект
RUN ./mvnw clean package -DskipTests

# Второй этап - создаем runtime образ
FROM openjdk:17-jdk-slim

# Копируем собранный JAR из первого этапа
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

# Команда запуска
ENTRYPOINT ["java", "-jar", "/app.jar"]
