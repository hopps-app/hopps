package app.hopps.org.delegates;

import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.LoggerFactory;
import org.slf4j.Logger;

/**
 * Use this if you need to bind an arbitrary delegate to a service task in BPMN
 */
@ApplicationScoped
public class NoopDelegate {

    private static final Logger LOG = LoggerFactory.getLogger(NoopDelegate.class);

    public void noop() {
        LOG.info("no op");
    }
}
