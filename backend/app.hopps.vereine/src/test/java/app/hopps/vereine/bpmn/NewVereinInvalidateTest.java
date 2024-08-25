package app.hopps.vereine.bpmn;

import app.hopps.vereine.delegates.CreationValidationDelegate;
import app.hopps.vereine.jpa.Mitglied;
import app.hopps.vereine.jpa.Verein;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.kie.kogito.Model;
import org.kie.kogito.internal.process.runtime.KogitoProcessInstance;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessConfig;
import org.kie.kogito.process.ProcessInstance;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.kie.api.runtime.process.ProcessInstance.STATE_COMPLETED;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
public class NewVereinInvalidateTest {

    @Inject
    @Named("NewVerein")
    Process<? extends Model> newVereinProcess;

    @Inject
    ProcessConfig processConfig;

    private final InternalProcessEventListener testProcessEventListener = new InternalProcessEventListener();

    @BeforeEach
    void setUp() {
        processConfig.processEventListeners().listeners().add(testProcessEventListener);
    }

    @Test
    @DisplayName("should terminate if data is invalid")
    void shouldTerminateIfDataIsInvalid() throws Exception {

        //given
        Verein kegelclub = new Verein();
        kegelclub.setName("Kegelklub 777");
        kegelclub.setType(Verein.TYPE.EINGETRAGENER_VEREIN);
        kegelclub.setSlug(""); // invalid

        Mitglied kevin = new Mitglied();
        kevin.setFirstName("Kevin");
        kevin.setLastName("Kegelkönig");
        kevin.setEmail("pinking777@gmail.com");

        // when
        Model model = newVereinProcess.createModel();
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("verein", kegelclub);
        parameters.put("owner", kevin);
        model.fromMap(parameters);

        ProcessInstance<? extends Model> instance = newVereinProcess.createInstance(model);
        instance.start();

        // then
        assertEquals(KogitoProcessInstance.STATE_ERROR, instance.status());
        assertNotNull(testProcessEventListener.getProcessCompletedEvent());
    }
}
