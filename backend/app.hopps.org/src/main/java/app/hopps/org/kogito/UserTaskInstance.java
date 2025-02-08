package app.hopps.org.kogito;

public record UserTaskInstance(String id, String name, String processId, String state, String completed,
        String started) {
}
