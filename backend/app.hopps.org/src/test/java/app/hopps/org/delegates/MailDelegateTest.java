package app.hopps.org.delegates;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.kie.kogito.internal.process.runtime.KogitoProcessContext;
import org.kie.kogito.internal.process.runtime.KogitoProcessInstance;
import org.mockito.Mockito;

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

        Mockito.when(context.getProcessInstance()).thenReturn(processInstance);
        Mockito.when(processInstance.getId()).thenReturn("mocked-process-id");

        mailDelegate.inviteMemberSlim(
                "matthias.raimann82@gmail.com",
                context
        );

        Thread.sleep(2000);
    }
}
