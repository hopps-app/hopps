package app.hopps;

import io.quarkus.test.junit.QuarkusTest;

import org.eclipse.microprofile.reactive.messaging.Message;
import org.junit.jupiter.api.Test;

import jakarta.inject.Inject;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
class DocumentKafkaConnectorTest {

    @Inject
    DocumentKafkaConnector application;

    @Test
    public void test() {

    }

}
