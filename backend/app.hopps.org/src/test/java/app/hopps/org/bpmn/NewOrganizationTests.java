package app.hopps.org.bpmn;

import app.hopps.org.delegates.CreationValidationDelegate;
import app.hopps.org.jpa.Member;
import app.hopps.org.jpa.Organization;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessConfig;
import org.kie.kogito.process.ProcessInstance;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
class NewOrganizationTests {

    @Inject
    @Named("NewOrganization")
    Process<? extends Model> newOrganizationProcess;

    @InjectMock
    CreationValidationDelegate creationValidationDelegate;

    @Inject
    ProcessConfig processConfig;

    private final InternalProcessEventListener testProcessEventListener = new InternalProcessEventListener();

    @BeforeEach
    void setUp() {
        processConfig.processEventListeners().listeners().add(testProcessEventListener);
    }

    @Test
    @DisplayName("should validate valid verein and owner")
    void shouldValidate() throws Exception {

        // given
        Organization kegelclub = new Organization();
        kegelclub.setName("Kegelklub 777");
        kegelclub.setType(Organization.TYPE.EINGETRAGENER_VEREIN);
        kegelclub.setSlug("kegelklub-999");

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
        verify(creationValidationDelegate, times(1)).validateWithValidator(any(Organization.class), any(Member.class));
        verify(creationValidationDelegate, times(1)).validateUniqueness(any(Organization.class), any(Member.class));
    }
}
