package app.hopps.fin;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.cloudevents.CloudEvent;
import io.cloudevents.jackson.JsonFormatOptions;
import io.quarkus.kafka.client.serialization.ObjectMapperSerde;
import org.apache.kafka.common.serialization.Serde;

import static io.cloudevents.jackson.JsonFormat.getCloudEventJacksonModule;

public class CloudEventSerdeFactory {

    private final ObjectMapper objectMapper;

    public CloudEventSerdeFactory() {

        objectMapper = new ObjectMapper();
        JsonFormatOptions options = JsonFormatOptions.builder()
                .build();
        objectMapper.registerModule(getCloudEventJacksonModule(options));
    }

    public Serde<CloudEvent> create() {
        return new ObjectMapperSerde<>(CloudEvent.class, objectMapper);
    }
}
