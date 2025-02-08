package app.hopps.org.kogito;

import org.eclipse.microprofile.graphql.Input;

import java.util.List;

@Input("UserTaskInstanceArgument")
public record UserTaskInstanceArgument(State state) {

    public UserTaskInstanceArgument(List<String> states) {
        this(new State(states));
    }

    public record State(List<String> in) {
    }
}
