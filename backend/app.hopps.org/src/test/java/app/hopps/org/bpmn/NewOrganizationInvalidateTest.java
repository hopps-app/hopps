package app.hopps.org.bpmn;

import app.hopps.member.domain.Member;
import app.hopps.organization.domain.Organization;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
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

@QuarkusTest
class NewOrganizationInvalidateTest {

    @Inject
    @Named("NewOrganization")
    Process<? extends Model> newOrganizationProcess;

    @Inject
    ProcessConfig processConfig;

    private final InternalProcessEventListener testProcessEventListener = new InternalProcessEventListener();

    @BeforeEach
    void setUp() {
        processConfig.processEventListeners().listeners().add(testProcessEventListener);
    }

    @Test
    @DisplayName("should terminate if data is invalid")
    @Disabled("Currently not working, but is already discussed in Zulip")
    void shouldTerminateIfDataIsInvalid() {

        // given
        Organization kegelclub = new Organization();
        kegelclub.setName("Kegelklub 777");
        kegelclub.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        kegelclub.setSlug(""); // invalid

        Member kevin = new Member();
        kevin.setFirstName("Kevin");
        kevin.setLastName("Kegelkönig");
        kevin.setEmail("pinking777@gmail.com");

        // when
        Model model = newOrganizationProcess.createModel();
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("organization", kegelclub);
        parameters.put("owner", kevin);
        model.fromMap(parameters);

        ProcessInstance<? extends Model> instance = newOrganizationProcess.createInstance(model);
        instance.start();

        // then
        assertEquals(KogitoProcessInstance.STATE_ERROR, instance.status());
        assertNotNull(testProcessEventListener.getProcessCompletedEvent());
    }
}
