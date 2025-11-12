package app.hopps.organization.bpmn;

import jakarta.enterprise.context.ApplicationScoped;
import org.kie.api.event.process.*;
import org.kie.kogito.internal.process.event.KogitoProcessEventListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@ApplicationScoped
public class InternalProcessEventListener implements KogitoProcessEventListener {

    private static final Logger LOG = LoggerFactory.getLogger(InternalProcessEventListener.class);

    private ProcessCompletedEvent processCompletedEvent;

    @Override
    public void beforeProcessStarted(ProcessStartedEvent event) {
        LOG.info("beforeProcessStarted {}", event);
    }

    @Override
    public void afterProcessStarted(ProcessStartedEvent event) {
        LOG.info("afterProcessStarted {}", event);
    }

    @Override
    public void beforeProcessCompleted(ProcessCompletedEvent event) {
        LOG.info("beforeProcessCompleted {}", event);
    }

    @Override
    public void afterProcessCompleted(ProcessCompletedEvent event) {
        processCompletedEvent = event;
    }

    @Override
    public void beforeNodeTriggered(ProcessNodeTriggeredEvent event) {
        LOG.info("beforeNodeTriggered{}", event);
    }

    @Override
    public void afterNodeTriggered(ProcessNodeTriggeredEvent event) {
        LOG.info("afterNodeTriggered {}", event);
    }

    @Override
    public void beforeNodeLeft(ProcessNodeLeftEvent event) {
        LOG.info("beforeNodeLeft {}", event);
    }

    @Override
    public void afterNodeLeft(ProcessNodeLeftEvent event) {
        LOG.info("afterNodeLeft {}", event);
    }

    @Override
    public void beforeVariableChanged(ProcessVariableChangedEvent event) {
        LOG.info("beforeVariableChanged {}", event);
    }

    @Override
    public void afterVariableChanged(ProcessVariableChangedEvent event) {
        LOG.info("After Process started {}", event);
    }

    public ProcessCompletedEvent getProcessCompletedEvent() {
        return processCompletedEvent;
    }
}
