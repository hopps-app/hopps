INSERT INTO trade_party(id, name, city, country, street, zipCode)
VALUES (1, 'hagebaumarkt & Gartencenter', 'Pfaffenhofen an der Ilm', 'Deutschland', 'Joseph-Fraunhofer-Straße 21',
        '85276')
;

INSERT INTO TransactionRecord (total, id, transaction_time, document_key, orderNumber, currencyCode, uploader,
                               privately_paid, document, sender_id, bommel_id)
VALUES (25.0, 1, '2024-12-18T14:00:00.000000Z', 'dummy1', null, 'EUR',
        'emanuel_urban@domain.none', false, 0, 1, 3),
       (286.58, 2, '2024-12-17T12:24:59.000000Z', 'dummy2', '12345ABC', 'EUR',
        'emanuel_urban@domain.none', false, 0, 1, null),
       (286.58, 3, '2025-02-28T16:59:59.000000Z', 'dummy3', 'ANOTHER', 'EUR',
        'what_zit_tooya@domain.none', false, 0, 1, 2),
       (88.69, 4, '2025-03-01T8:05:36.000000Z', 'dummy4', 'ANOTHER2', 'EUR',
        'what_zit_tooya@domain.none', true, 0, 1, 2)
;

select setval('transaction_sequence', 5, true);