package app.hopps.chatbot.whatsapp.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

/**
 * Credentials and identifiers of the Meta app that connects Hopps to the WhatsApp Cloud API.
 */
@ConfigMapping(prefix = "hopps.chatbot.whatsapp")
public interface WhatsAppConfig {
    /** Token Meta echoes back when the webhook is registered. */
    String verifyToken();

    /** App secret used to verify the {@code X-Hub-Signature-256} header of webhook calls. */
    String appSecret();

    /** Access token for calls to the Graph API (sending messages, downloading media). */
    String accessToken();

    /** ID of the business phone number that sends the replies. */
    String phoneNumberId();

    /** Graph API version, e.g. {@code v21.0}. */
    String graphApiVersion();

    /** Name of the approved invitation template (body {{1}} inviter, {{2}} bommel, {{3}} organization). */
    @WithDefault("hopps_bommel_invitation")
    String invitationTemplate();

    @WithDefault("de")
    String invitationTemplateLanguage();
}
