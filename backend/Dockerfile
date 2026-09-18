# Maven is available in the builder image because this checkout does not yet have a wrapper.
FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -B dependency:go-offline
COPY src src
# Tests run separately against the test database; the image build has no test database.
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system erp && useradd --system --gid erp erp
COPY --from=build /app/target/app.jar app.jar
USER erp
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
