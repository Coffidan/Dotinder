# Stage 1: build with Maven (без кэша target чтобы всегда собирался актуальный код)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml ./
COPY src ./src
RUN mvn -q -DskipTests package

# Stage 2: runtime JRE
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
