package app.hopps.fin;

import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkiverse.openfga.client.StoreClient;
import io.quarkiverse.openfga.client.model.TupleKey;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.List;

@QuarkusComponentTest
public class OpenFgaModelTest {

    @Inject
    StoreClient storeClient;

    @Inject
    AuthorizationModelClient authModelClient;

    @Test
    public void insertingUserOrgAndBommelWorks() {
        var defaultAuthModel = storeClient.authorizationModels().defaultModel();
        defaultAuthModel.write(List.of(
                TupleKey.of("organisation:hopps", "owner", "user:emilia").nullCondition(),
                TupleKey.of("bommel:open_project", "has", "organisation:hopps").nullCondition()
        ), List.of());
    }

}
