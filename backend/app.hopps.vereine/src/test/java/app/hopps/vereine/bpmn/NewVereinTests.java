package app.hopps.vereine.bpmn;

import app.hopps.vereine.NewVereinModel;
import app.hopps.vereine.jpa.Mitglied;
import app.hopps.vereine.jpa.Verein;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.junit.jupiter.api.Test;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
public class NewVereinTests {

    @Inject
    @Named("NewVerein")
    Process<NewVereinModel> newVereinProcess;

    @Test
    public void shouldStartProcess() {

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
        NewVereinModel model = newVereinProcess.createModel();
        model.setVerein(kegelclub);
        model.setOwner(kevin);

        ProcessInstance<NewVereinModel> instance = newVereinProcess.createInstance(model);
        instance.start();
    }
}
