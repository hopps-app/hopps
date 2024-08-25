package app.hopps.vereine.bpmn;

import app.hopps.vereine.delegates.CreationValidationDelegate;
import app.hopps.vereine.jpa.Mitglied;
import app.hopps.vereine.jpa.Verein;
import app.hopps.vereine.validation.NonUniqueConstraintViolation;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.junit.jupiter.api.Test;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@QuarkusTest
public class NewVereinTests {

    @Inject
    @Named("NewVerein")
    Process<? extends Model> newVereinProcess;

    @InjectMock
    CreationValidationDelegate creationValidationDelegate;

    @Test
    public void shouldStartProcess() throws Exception {

        //given
        assertNotNull(newVereinProcess);

        Verein kegelclub = new Verein();
        kegelclub.setName("Kegelklub 777");
        kegelclub.setType(Verein.TYPE.EINGETRAGENER_VEREIN);
        kegelclub.setSlug("kegelklub-999");

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
        verify(creationValidationDelegate, times(1)).validateWithValidator(any(Verein.class), any(Mitglied.class));
        verify(creationValidationDelegate, times(1)).validateUniqueness(any(Verein.class), any(Mitglied.class));
    }
}
