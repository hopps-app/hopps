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
import org.kie.kogito.internal.process.runtime.KogitoProcessInstance;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;
import org.kie.kogito.process.WorkItem;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
    @DisplayName("should run through non existing member path")
    void shouldTestNonExistingMember() {
        Model model = addMemberProcess.createModel();
        Map<String, Object> parameters = Map.of(
                "email", "test@hopps.cloud",
                "slug", "gruenes-herz-ev"
        );
        model.fromMap(parameters);

        ProcessInstance<? extends Model> instance = addMemberProcess.createInstance(model);
        instance.start();

        Member member = new Member();
        member.setEmail("test@test.com");
        member.setLastName("Kim");
        member.setFirstName("Jong");

        instance.workItems().forEach(x -> System.out.println(x.getName() + "; " + x.getParameters().get("NodeName")));

        WorkItem workItem = instance
                .workItems()
                .stream()
                .filter(wi -> wi.getParameters().get("NodeName").equals("input user data and accept invite"))
                .findFirst()
                .orElseThrow();

        instance.completeWorkItem(workItem.getId(), Map.of());

        assertEquals(KogitoProcessInstance.STATE_COMPLETED, instance.status());
    }

    @Test
    @DisplayName("should run through existing member path")
    void shouldTestExistingMember() {
        Model model = addMemberProcess.createModel();
        Map<String, Object> parameters = Map.of(
                "email", "bob@alice.com",
                "slug", "gruenes-herz-ev"
        );
        model.fromMap(parameters);

        ProcessInstance<? extends Model> instance = addMemberProcess.createInstance(model);
        instance.start();

        instance.workItems().forEach(x -> System.out.println(x.getName() + "; " + x.getParameters().get("NodeName")));

        WorkItem workItem = instance
                .workItems()
                .stream()
                .filter(wi -> wi.getParameters().get("NodeName").equals("accept invite"))
                .findFirst()
                .orElseThrow();

        instance.completeWorkItem(workItem.getId(), Map.of());

        assertEquals(KogitoProcessInstance.STATE_COMPLETED, instance.status());
    }

//    @Test
//    @DisplayName("should fail because the email is not valid")
//    void shouldFailBecauseOfEmail() {
//
//    }
}
