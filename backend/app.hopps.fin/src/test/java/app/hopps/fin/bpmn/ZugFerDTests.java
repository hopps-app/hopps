package app.hopps.fin.bpmn;

import app.hopps.fin.CloudEventSerdeFactory;
import io.cloudevents.CloudEvent;
import io.cloudevents.core.builder.CloudEventBuilder;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kafka.InjectKafkaCompanion;
import io.quarkus.test.kafka.KafkaCompanionResource;
import io.smallrye.reactive.messaging.kafka.companion.ConsumerTask;
import io.smallrye.reactive.messaging.kafka.companion.KafkaCompanion;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.Serde;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;
import org.slf4j.Logger;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.slf4j.LoggerFactory.getLogger;

@QuarkusTest
@QuarkusTestResource(KafkaCompanionResource.class)
class ZugFerDTests {

    private static final Logger LOG = getLogger(ZugFerDTests.class);

    @Inject
    @Named("ZugFerD")
    Process<? extends Model> zugFerDProcess;

    @InjectKafkaCompanion
    KafkaCompanion companion;

    @BeforeEach
    void setUp() {
        CloudEventSerdeFactory factory = new CloudEventSerdeFactory();
        Serde<CloudEvent> serde = factory.create();
        companion.registerSerde(CloudEvent.class, serde);
    }

    @Test
    void shouldSendMessageToKafka() {

        // given
        Model model = zugFerDProcess.createModel();

        Map<String, Object> params = new HashMap<>();
        params.put("pdfUri", URI.create("https://example.com/example.pdf"));
        model.fromMap(params);

        // when
        ProcessInstance<? extends Model> instance = zugFerDProcess.createInstance(model);
        instance.start();

        // then
        ConsumerTask<String, String> messages = companion.consumeStrings().fromTopics("app.hopps.pdf", 1);
        messages.awaitCompletion();
        assertEquals(1, messages.count());

        String message = messages.stream().findFirst()
                .map(ConsumerRecord::value)
                .orElseThrow();

        assertThat(message, containsString("example.pdf"));
    }

    @Test
    void shouldContinueOnServiceAnswerMessage() {
        // https://blog.kie.org/2021/09/kogito-process-eventing-add-ons.html

        // given
        Model model = zugFerDProcess.createModel();

        Map<String, Object> params = new HashMap<>();
        params.put("pdfUri", URI.create("https://example.com/example.pdf"));
        model.fromMap(params);

        // when
        ProcessInstance<? extends Model> instance = zugFerDProcess.createInstance(model);
        instance.start();

        companion.produce(CloudEvent.class).usingGenerator(i -> testCloudEvent(instance.id()));

        // then
        ConsumerTask<String, String> messages = companion.consumeStrings().fromTopics("app.hopps.transactionRecords", 1);
        messages.awaitCompletion();
        assertEquals(1, messages.count());
    }

    private ProducerRecord<String, CloudEvent> testCloudEvent(String instanceId) {
        CloudEvent cloudEvent = CloudEventBuilder.v1()
                .withId("1132d2aa-a23e-4768-b09e-c3656508e9b1")
                .withSource(URI.create("/process/ZugFerD"))
                .withType("pdf")
                .withTime(OffsetDateTime.parse("2025-01-08T13:47:52.59867+01:00"))
                .withExtension("kogitoproctype", "BPMN")
                .withExtension("kogitoprocinstanceid", "6f30680d-9f82-4d3a-bf44-acb86b723317")
                .withExtension("kogitoprocrefid", instanceId)
                .withExtension("kogitoprocist", "Active")
                .withExtension("kogitoprocversion", "1.0")
                .withExtension("kogitoprocid", "ZugFerD")
                .withData("https://example.com/".getBytes())
                .build();

        LOG.info("Sending CloudEvent: {}", cloudEvent);
        return new ProducerRecord<>("app.hopps.transactionRecords", instanceId, cloudEvent);
    }
}
