package app.hopps.org.bpmn;

import app.hopps.org.delegates.NoopDelegate;
import app.hopps.org.jpa.Member;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;
import org.kie.kogito.process.WorkItem;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.*;

@QuarkusTest
public class InviteMemberTests {
    @Inject
    @Named("AddMember")
    Process<? extends Model> addMemberProcess;

    @InjectMock
    NoopDelegate noopDelegate;

    @Test
    @DisplayName("should run through the process")
    void shouldRunThroughTheProcess() {
        Model model = addMemberProcess.createModel();
        Map<String, Object> parameters = new HashMap<>();
        model.fromMap(parameters);

        ProcessInstance<? extends Model> instance = addMemberProcess.createInstance(model);
        instance.start();

//        verify(noopDelegate, times(2)).noop();

        Member member = new Member();
        member.setEmail("test@test.com");
        member.setLastName("Kim");
        member.setFirstName("Jong");

        WorkItem workItem = instance.workItems().stream().filter(wi -> wi.getParameters().get("NodeName") == "Input User data").findFirst().orElseThrow();


        instance.completeWorkItem(workItem.getId(), Map.of("member", member));

        List<WorkItem> workItems = instance.workItems();



    }
}
