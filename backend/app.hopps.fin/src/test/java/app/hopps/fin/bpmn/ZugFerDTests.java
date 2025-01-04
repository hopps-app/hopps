package app.hopps.fin.bpmn;

import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kafka.InjectKafkaCompanion;
import io.quarkus.test.kafka.KafkaCompanionResource;
import io.smallrye.reactive.messaging.kafka.companion.ConsumerTask;
import io.smallrye.reactive.messaging.kafka.companion.KafkaCompanion;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@QuarkusTestResource(KafkaCompanionResource.class)
class ZugFerDTests {

    @Inject
    @Named("ZugFerD")
    Process<? extends Model> zugFerDProcess;

    @InjectKafkaCompanion
    KafkaCompanion companion;

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
}
