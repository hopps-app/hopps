package app.hopps.mailservice;

import java.util.Arrays;
import java.util.Map;
import java.util.Objects;

public record Mail(String[] mailReceivers, MailTemplates templateId, Map<String, String> variables) {
    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        Mail mail = (Mail) o;
        return Objects.deepEquals(mailReceivers, mail.mailReceivers) && templateId == mail.templateId && Objects.equals(variables, mail.variables);
    }

    @Override
    public int hashCode() {
        return Objects.hash(Arrays.hashCode(mailReceivers), templateId, variables);
    }

    @Override
    public String toString() {
        return "Mail{" +
                "mailReceivers=" + Arrays.toString(mailReceivers) +
                ", templateId=" + templateId +
                ", variables=" + variables +
                '}';
    }
}
