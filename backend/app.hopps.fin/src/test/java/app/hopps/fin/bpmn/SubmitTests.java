package app.hopps.fin.bpmn;

import app.hopps.fin.delegates.NoopDelegate;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.junit.jupiter.api.Test;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;

import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.verify;

@QuarkusTest
class SubmitTests {

    @Inject
    @Named("Submit")
    Process<? extends Model> submitProcess;

    @InjectMock
    NoopDelegate noopDelegate;

    @Test
    void shouldCompileAndRun() {

        // given
        Model model = submitProcess.createModel();
        ProcessInstance<? extends Model> instance = submitProcess.createInstance(model);

        // when
        instance.start();

        // then
        verify(noopDelegate, atLeast(1)).noop();
    }
}
