package app.hopps;

import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;

import java.util.HashMap;
import java.util.Map;

public class KafkaTestResourceLifecycleManager implements QuarkusTestResourceLifecycleManager {

    @Override
    public Map<String, String> start() {

        Map<String, String> env = new HashMap<>();
        Map<String, String> props1 = InMemoryConnector.switchIncomingChannelsToInMemory("documents-in");
        Map<String, String> props2 = InMemoryConnector.switchOutgoingChannelsToInMemory("receipts-out");
        Map<String, String> props3 = InMemoryConnector.switchOutgoingChannelsToInMemory("invoices-out");
        env.putAll(props1);
        env.putAll(props2);
        env.putAll(props3);
        return env;
    }

    @Override
    public void stop() {
        InMemoryConnector.clear();
    }
}