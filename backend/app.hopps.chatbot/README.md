# app.hopps.chatbot

WhatsApp chatbot of Hopps. People invited to a bommel send photos or PDFs of receipts via WhatsApp; Hopps files them
in that bommel. Free-text questions are answered by an LLM assistant. Spec and status: issue #947.

## How it fits together

1. A member invites a person with name and WhatsApp number in the SPA (Struktur → Bommel → WhatsApp).
2. org stores the contact (`INVITED`) and calls `POST /internal/invitations` here.
3. The chatbot sends the WhatsApp template `hopps_bommel_invitation` with the buttons *Annehmen* / *Ablehnen*
   (payloads `hopps-accept:<token>` / `hopps-decline:<token>`).
4. The button press arrives at `/webhooks/whatsapp`; the chatbot tells org, which sets the contact `ACTIVE`.
5. Photos and PDFs from an active number are downloaded from Meta and filed in org as receipts.

org and the chatbot call each other only under `/internal/*`, authenticated with the shared secret
`HOPPS_INTERNAL_API_TOKEN` (header `X-Hopps-Internal-Token`). Never route `/internal/*` from a public ingress.

## Local development

```bash
cp .env.example .env   # fill in what you need; Quarkus dev mode reads .env from this directory
./mvnw quarkus:dev     # http://localhost:8104
```

Quarkus also reads `.env` in tests and treats an empty value as set: leave unused variables commented out
instead of empty.

### Without WhatsApp: debug chat

http://localhost:8104/debug/chat (dev and test only, not in the prod image). It simulates a phone number. With the
default `HOPPS_CHATBOT_INVITATION_CHANNEL=debug`, invitations from the SPA land in the debug chat's inbox instead of
WhatsApp and show up there with their buttons.

### LLM

Azure OpenAI (EU) by default. For dev, an OpenAI platform key works too (US processing, test data only; ignored in
prod):

```
HOPPS_LLM_PROVIDER=openai
HOPPS_OPENAI_API_KEY=sk-...
```

### With real WhatsApp (hybrid test)

Needs a Meta app with the WhatsApp product and your phone added as test recipient.

1. `.env`: `HOPPS_WHATSAPP_PHONE_NUMBER_ID`, `HOPPS_WHATSAPP_ACCESS_TOKEN`, `HOPPS_WHATSAPP_VERIFY_TOKEN`,
   `HOPPS_WHATSAPP_APP_SECRET`, and `HOPPS_CHATBOT_INVITATION_CHANNEL=whatsapp`.
2. Template `hopps_bommel_invitation` (language `de`, category Utility) approved in the WhatsApp Manager:
   body `Einladung von {{1}}: Belege für {{2}} ({{3}}) lassen sich ab jetzt per WhatsApp an Hopps schicken. Einfach
   ein Foto oder PDF in diesen Chat senden.`, quick-reply buttons *Annehmen*, *Ablehnen*. Meta rejects bodies that
   start or end with a placeholder.
3. Webhook: expose **only** `/webhooks/whatsapp` through a tunnel (the debug chat has no login), e.g. a Cloudflare
   tunnel ingress rule with `path: ^/webhooks/whatsapp$`. Dev mode only accepts `Host: localhost`, so also set
   `QUARKUS_HTTP_HOST_VALIDATION_ALLOWED_HOSTS=localhost,127.0.0.1,<your tunnel host>` in `.env`. Register the URL and
   verify token in the Meta app (WhatsApp → Configuration → Webhooks) and subscribe to `messages`.
4. **Limitation:** while the Meta app is unpublished, Meta delivers only dashboard test webhooks, no real incoming
   messages. Sending works, so the invitation reaches the phone; tapping *Annehmen* there opens WhatsApp's 24-hour
   reply window but does not reach the chatbot. Simulate the delivery with
   [`dev/simulate_webhook.py`](dev/simulate_webhook.py), using the invitation token from org's `whatsapp_contact`
   table:

   ```bash
   python3 -I dev/simulate_webhook.py .env http://localhost:8104/webhooks/whatsapp button <phone> hopps-accept:<token>
   ```

   The chatbot's confirmation then arrives on the phone as a real WhatsApp message.
