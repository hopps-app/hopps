package app.hopps.org;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.kie.kogito.svg.dataindex.DataIndexClient;

@ApplicationScoped
public class KogitoIndexDataHandler {
    private final DataIndexClient dataIndexClient;

    @Inject
    public KogitoIndexDataHandler(DataIndexClient dataIndexClient) {
        this.dataIndexClient = dataIndexClient;
    }

    public void getOpenTasks() {
        // DO Nothing for now
    }
}
