package app.hopps.org.bpmn;

import app.hopps.org.jpa.Member;
import app.hopps.org.jpa.MemberRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.kie.kogito.Model;
import org.kie.kogito.internal.process.runtime.KogitoProcessInstance;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;
import org.kie.kogito.process.WorkItem;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
public class InviteMemberTests {
    @Inject
    @Named("AddMember")
    Process<? extends Model> addMemberProcess;

    @Inject
    MemberRepository memberRepository;

    @Inject
    Flyway flyway;

    @BeforeEach
    void setup() throws Exception {
        flyway.clean();
        flyway.migrate();
    }

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
        member.setEmail("test@hopps.cloud");
        member.setLastName("Kim");
        member.setFirstName("Jong");

        WorkItem workItem = instance
                .workItems()
                .stream()
                .filter(wi -> wi.getParameters().get("NodeName").equals("input user data and accept invite"))
                .findFirst()
                .orElseThrow();

        instance.completeWorkItem(workItem.getId(), Map.of("member", member));

        assertEquals(KogitoProcessInstance.STATE_COMPLETED, instance.status());
    }

    @Test
    @DisplayName("should run through existing member path")
    void shouldTestExistingMember() {
        Model model = addMemberProcess.createModel();
        Map<String, Object> parameters = Map.of(
                "email", "h1978@company.none",
                "slug", "gruenes-herz-ev"
        );
        model.fromMap(parameters);

        ProcessInstance<? extends Model> instance = addMemberProcess.createInstance(model);
        instance.start();


        WorkItem workItem = instance
                .workItems()
                .stream()
                .filter(wi -> wi.getParameters().get("NodeName").equals("accept invite"))
                .findFirst()
                .orElseThrow();

        instance.completeWorkItem(workItem.getId(), Map.of());

        assertEquals(KogitoProcessInstance.STATE_COMPLETED, instance.status());
    }

    @Test
    @DisplayName("should fail because the org does not exist")
    void shouldFailBecauseOrgUnknown() {
        Model model = addMemberProcess.createModel();
        Map<String, Object> parameters = Map.of(
                "email", "test@hopps.cloud",
                "slug", "unknown_org"
        );
        model.fromMap(parameters);

        ProcessInstance<? extends Model> instance = addMemberProcess.createInstance(model);
        instance.start();

        assertEquals(KogitoProcessInstance.STATE_ERROR, instance.status());
    }
}
