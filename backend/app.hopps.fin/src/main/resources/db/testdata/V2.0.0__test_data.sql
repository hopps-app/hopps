INSERT INTO trade_party(id, city, country, street, zipCode)
VALUES (1, 'Pfaffenhofen an der Ilm', 'Deutschland', 'Joseph-Fraunhofer-Straße 21', '85276')
;

INSERT INTO TransactionRecord (total, id, transaction_time, document_key, name, orderNumber, currencyCode, uploader,
                               privately_paid, document, sender_id)
VALUES (25.0, 1, '2024-12-18T14:00:00.000000Z', 'dummy1', 'hagebaumarkt & Gartencenter', null, 'EUR',
        'emanuel_urban@domain.none', false, 0, 1),
       (286.58, 2, '2024-12-17T12:24:59.000000Z', 'dummy2', 'hagebaumarkt & Gartencenter', '12345ABC', 'EUR',
        'emanuel_urban@domain.none', false, 0, 1)
;

select setval('transaction_sequence', 3, true);