package app.hopps.org.delegates;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.kie.kogito.internal.process.runtime.KogitoProcessContext;
import org.kie.kogito.internal.process.runtime.KogitoProcessInstance;
import org.mockito.Mockito;

import java.util.Map;

@QuarkusTest
public class MailDelegateTest {
    @Inject
    MailDelegate mailDelegate;

    @Test
    @DisplayName("should send the mail")
    void sendTheInvitationMail() throws InterruptedException {
        // Create a mock of KogitoProcessContext
        KogitoProcessContext context = Mockito.mock(KogitoProcessContext.class);
        KogitoProcessInstance processInstance = Mockito.mock(KogitoProcessInstance.class);

        Mockito.when(context.getContextData()).thenReturn(Map.of("email", "test@test.test", "memberDoesExist", true));
        Mockito.when(context.getProcessInstance()).thenReturn(processInstance);
        Mockito.when(processInstance.getId()).thenReturn("mocked-process-id");

        mailDelegate.inviteMember(context);

//        Putting things on kafka can not be tested. Can test be deleted?
    }
}
