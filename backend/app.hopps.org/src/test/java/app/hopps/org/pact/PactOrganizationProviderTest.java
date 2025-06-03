package app.hopps.org.pact;

import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.kie.kogito.Model;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;

import java.util.Map;

@QuarkusTest
@Provider("org-invite")
@PactFolder("../../pacts")
@TestSecurity(authorizationEnabled = false)
public class PactOrganizationProviderTest {
    @ConfigProperty(name="quarkus.http.test-port")
    int port;

    @Inject
    @Named("AddMember")
    Process<? extends Model> addMemberProcess;

    @Inject
    Flyway flyway;

    @BeforeEach
    void beforeEach(PactVerificationContext context) {
        HttpTestTarget target = new HttpTestTarget("localhost", port);
        context.setTarget(target);

        flyway.clean();
        flyway.migrate();
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verify(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @State("Member was invited before")
    Map<String, String> stateOrgExists() {
        Model model = addMemberProcess.createModel();
        Map<String, Object> parameters = Map.of(
                "email", "test@hopps.cloud",
                "slug", "gruenes-herz-ev"
        );
        model.fromMap(parameters);

        ProcessInstance<? extends Model> instance = addMemberProcess.createInstance(model);
        instance.start();

        return Map.of("pid", instance.id());
    }

    @State("Organization gruenes-herz-ev exists")
    void placeholder() { }
}
