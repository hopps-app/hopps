package app.hopps.org.fga;

import app.hopps.commons.fga.FgaRelations;
import app.hopps.commons.fga.FgaTypes;
import app.hopps.org.jpa.Bommel;
import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkiverse.openfga.client.model.RelObject;
import io.quarkiverse.openfga.client.model.RelTupleDefinition;
import io.quarkiverse.openfga.client.model.RelTupleKey;
import io.quarkiverse.openfga.client.model.RelUser;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static app.hopps.commons.fga.FgaHelper.sanitize;

@ApplicationScoped
public class FgaProxy {
    private static final Logger LOG = LoggerFactory.getLogger(FgaProxy.class);

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

    public void verifyEditorAccessToBommel(Long bommelId, String username) {
        RelUser relUser = RelUser.of(FgaTypes.USER.getFgaName(), sanitize(username));
        RelObject relObject = RelObject.of(FgaTypes.BOMMEL.getFgaName(), bommelId.toString());

        RelTupleKey relTupleKey = RelTupleKey.builder()
                .user(relUser)
                .relation(FgaRelations.BOMMELWART.getFgaName())
                .object(relObject)
                .build();

        Boolean b = authorizationModelClient.check(relTupleKey).await().atMost(Duration.ofSeconds(3));
        if (Boolean.FALSE.equals(b)) {
            throw new WebApplicationException(Response.status(Response.Status.FORBIDDEN).build());
        }
    }

    public void verifyAccessToOrganization(String slug, String username) {
        RelUser relUser = RelUser.of(FgaTypes.USER.getFgaName(), sanitize(username));
        RelObject relObject = RelObject.of(FgaTypes.BOMMEL.getFgaName(), sanitize(slug));

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

    public void addBommel(Bommel bommel, Long newParentId) {
        RelUser relUser = RelUser.of(FgaTypes.BOMMEL.getFgaName(), newParentId.toString());
        RelObject relObject = RelObject.of(FgaTypes.BOMMEL.getFgaName(), bommel.id.toString());

        RelTupleDefinition relTupleDefinition = RelTupleDefinition.builder()
                .user(relUser)
                .relation(FgaRelations.PARENT.getFgaName())
                .object(relObject)
                .build();

        Map<String, Object> map = authorizationModelClient.write(relTupleDefinition)
                .await()
                .atMost(Duration.ofSeconds(3));
        LOG.info("What does this map contain? {}", map);
    }

    public void removeBommel(Bommel bommel) {
        removeBommel(bommel, bommel.getParent().id);
    }

    public void removeBommel(Bommel bommel, Long parentId) {
        RelUser relUser = RelUser.of(FgaTypes.BOMMEL.getFgaName(), parentId.toString());
        RelObject relObject = RelObject.of(FgaTypes.BOMMEL.getFgaName(), bommel.id.toString());

        RelTupleDefinition relTupleDefinition = RelTupleDefinition.builder()
                .user(relUser)
                .relation(FgaRelations.PARENT.getFgaName())
                .object(relObject)
                .build();

        Map<String, Object> map = authorizationModelClient.delete(relTupleDefinition)
                .await()
                .atMost(Duration.ofSeconds(3));
        LOG.info("What does this map contain? {}", map);
    }

    public List<Long> getAllMyBommels(String username) {
        RelUser relUser = RelUser.of(FgaTypes.USER.getFgaName(), sanitize(username));

        AuthorizationModelClient.ListObjectsFilter listObjectsFilter = AuthorizationModelClient.ListObjectsFilter
                .byUser(relUser)
                .relation(FgaRelations.BOMMELWART.getFgaName())
                .objectType(FgaTypes.BOMMEL.getFgaName());

        return authorizationModelClient.listObjects(listObjectsFilter)
                .map(list -> list.stream().map(RelObject::getId).map(Long::parseLong).toList())
                .await()
                .atMost(Duration.ofSeconds(3));
    }
}
