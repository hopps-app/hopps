package app.hopps.mailservice;

import io.quarkus.mailer.MailTemplate;
import io.quarkus.qute.CheckedTemplate;

import java.util.Map;

@CheckedTemplate
class Templates {
    private Templates() {
        // static methods only
    }

    public static native MailTemplate.MailTemplateInstance temp(Map<String, String> mapping);
}
