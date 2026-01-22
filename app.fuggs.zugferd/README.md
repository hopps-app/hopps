# ZUGFeRD

## Kafka

### Cloud-events

Cloud events are special.

We sent data to kogito, to allow kogito to read the invoice data, we need to set the cloud-event source and type,
otherwise it does not use cloud-events at all.

```
mp.messaging.outgoing.document-data-out.cloud-events=true
mp.messaging.outgoing.document-data-out.cloud-events-mode=binary
mp.messaging.outgoing.document-data-out.cloud-events-source=invoices
mp.messaging.outgoing.document-data-out.cloud-events-type=app.fuggs.commons.InvoiceData
```