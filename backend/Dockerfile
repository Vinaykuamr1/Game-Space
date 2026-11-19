# syntax=docker/dockerfile:1.7
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src src
RUN --mount=type=cache,target=/root/.m2 \
    for attempt in 1 2 3 4; do \
      mvn -B -U -DskipTests package && exit 0; \
      echo "Maven download/build failed (attempt ${attempt}/4); retrying..." >&2; \
      sleep $((attempt * 5)); \
    done; \
    exit 1
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/uno-arena-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
