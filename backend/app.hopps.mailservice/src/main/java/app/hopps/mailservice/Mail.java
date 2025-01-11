package app.hopps.mailservice;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Arrays;
import java.util.Map;
import java.util.Objects;

public record Mail(String[] mailReceivers, MailTemplates templateId, Map<String, String> variables) {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass())
            return false;
        Mail mail = (Mail) o;
        return Objects.deepEquals(mailReceivers, mail.mailReceivers) && templateId == mail.templateId
                && Objects.equals(variables, mail.variables);
    }

    @Override
    public int hashCode() {
        return Objects.hash(Arrays.hashCode(mailReceivers), templateId, variables);
    }

    @Override
    public String toString() {
        try {
            return objectMapper.writeValueAsString(this);
        } catch (JsonProcessingException ignored) {
            return "{" +
                    "mailReceivers: [" + String.join(",", mailReceivers) + "]," +
                    "templateId: " + templateId + ',' +
                    "variables: " + variables +
                    '}';
        }
    }
}
