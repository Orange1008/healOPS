FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

FROM openjdk:21-jdk AS runner
WORKDIR /app
COPY --from=builder /app/target/healops-core-1.0.0-SNAPSHOT.jar ./app.jar
EXPOSE 8090
ENV DOCKER_CONTAINER=true
ENTRYPOINT ["java", "-jar", "app.jar"]
