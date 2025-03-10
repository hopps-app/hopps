package app.hopps.org.kogito;

import io.smallrye.graphql.client.typesafe.api.GraphQLClientApi;
import org.eclipse.microprofile.graphql.Query;

import java.util.List;

@GraphQLClientApi(configKey = "data-index")
public interface DataIndexApi {
    @Query("UserTaskInstances")
    List<UserTaskInstance> getUserTaskInstances(UserTaskInstanceArgument where);
}
