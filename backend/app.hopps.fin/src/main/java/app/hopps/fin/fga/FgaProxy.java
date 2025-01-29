package app.hopps.fin.fga;

import app.hopps.commons.fga.FgaRelations;
import app.hopps.commons.fga.FgaTypes;
import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkiverse.openfga.client.model.RelObject;
import io.quarkiverse.openfga.client.model.RelObjectType;
import io.quarkiverse.openfga.client.model.RelTupleKey;
import io.quarkiverse.openfga.client.model.RelUser;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.time.Duration;
import java.util.List;

import static app.hopps.commons.fga.FgaHelper.sanitize;

@ApplicationScoped
public class FgaProxy {
    private final AuthorizationModelClient authorizationModelClient;

    @Inject
    public FgaProxy(AuthorizationModelClient authorizationModelClient) {
        this.authorizationModelClient = authorizationModelClient;
    }

    public void verifyAccessToBommel(Long bommelId, String username) {
        RelUser relUser = RelUser.of(FgaTypes.USER.getFgaName(), sanitize(username));
        RelObject relObject = RelObject.of(FgaTypes.BOMMEL.getFgaName(), bommelId.toString());

        RelTupleKey relTupleKey = RelTupleKey.builder()
                .user(relUser)
                .relation(FgaRelations.MEMBER.getFgaName())
                .object(relObject)
                .build();

        Boolean b = authorizationModelClient.check(relTupleKey).await().atMost(Duration.ofSeconds(3));
        if (Boolean.FALSE.equals(b)) {
            throw new WebApplicationException(Response.status(Response.Status.FORBIDDEN).build());
        }
    }

    public List<Long> getAccessibleBommels(String username) {
        RelUser relUser = RelUser.of(FgaTypes.USER.getFgaName(), sanitize(username));
        RelObjectType relObjectType = RelObjectType.of(FgaTypes.BOMMEL.getFgaName());

        AuthorizationModelClient.ListObjectsFilter listObjectsFilter = AuthorizationModelClient.ListObjectsFilter
                .byUser(relUser)
                .objectType(relObjectType)
                .relation(FgaRelations.MEMBER.getFgaName());

        return authorizationModelClient.listObjects(listObjectsFilter)
                .map(list -> list.stream().map(RelObject::getId).map(Long::parseLong).toList())
                .await()
                .atMost(Duration.ofSeconds(3));
    }
}
