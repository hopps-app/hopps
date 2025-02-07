package app.hopps.mailservice;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;

import java.util.HashMap;
import java.util.Map;

public class KafkaTestResourceLifecycleManager implements QuarkusTestResourceLifecycleManager {

    @Override
    public Map<String, String> start() {
        Map<String, String> mailKafkaProperties = InMemoryConnector.switchIncomingChannelsToInMemory("mail");
        return new HashMap<>(mailKafkaProperties);
    }

    @Override
    public void stop() {
        InMemoryConnector.clear();
    }
}
