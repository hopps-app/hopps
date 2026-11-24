"""Simulates a WhatsApp webhook call as Meta would send it, signed with the app secret from the chatbot's .env.

While the Meta app is unpublished (development mode), Meta delivers no real incoming messages to the webhook.
This script stands in for that delivery, e.g. for pressing a button of an invitation that arrived on a real phone.

Usage (from backend/app.hopps.chatbot):
  python3 -I dev/simulate_webhook.py .env http://localhost:8104/webhooks/whatsapp button <phone> <payload> [<text>]
  python3 -I dev/simulate_webhook.py .env http://localhost:8104/webhooks/whatsapp empty

  <phone>    digits only, e.g. 4917612345678
  <payload>  hopps-accept:<invitation token> or hopps-decline:<invitation token>
"""
import hashlib, hmac, json, re, sys, time, urllib.request

env_file, url, kind = sys.argv[1], sys.argv[2], sys.argv[3]
env = {}
for line in open(env_file):
    m = re.match(r'^\s*([A-Z_]+)\s*=\s*(.*?)\s*$', line)
    if m:
        env[m.group(1)] = m.group(2).strip('"\'')

value = {"messaging_product": "whatsapp",
         "metadata": {"phone_number_id": env['HOPPS_WHATSAPP_PHONE_NUMBER_ID']}}
if kind == 'button':
    phone, payload = sys.argv[4], sys.argv[5]
    text = sys.argv[6] if len(sys.argv) > 6 else 'Annehmen'
    value["contacts"] = [{"wa_id": phone, "profile": {"name": "Hybrid Test"}}]
    value["messages"] = [{"from": phone, "id": "wamid.sim%d" % time.time(), "timestamp": str(int(time.time())),
                          "type": "button", "button": {"text": text, "payload": payload}}]
body = json.dumps({"object": "whatsapp_business_account",
                   "entry": [{"id": env['HOPPS_WHATSAPP_BUSINESS_ACCOUNT_ID'],
                              "changes": [{"field": "messages", "value": value}]}]}).encode('utf-8')
sig = 'sha256=' + hmac.new(env['HOPPS_WHATSAPP_APP_SECRET'].encode('utf-8'), body, hashlib.sha256).hexdigest()
req = urllib.request.Request(url, data=body, method='POST',
                             headers={'Content-Type': 'application/json', 'X-Hub-Signature-256': sig})
try:
    print('webhook answered', urllib.request.urlopen(req).status)
except urllib.error.HTTPError as e:
    print('webhook answered', e.code)
