insert into Organization (type, id, slug, name, website, plz, city, street, number)
values (0, 2, 'gruenes-herz-ev', 'Grünes Herz e.V.', 'https://gruenes-herz.de/', '27324', 'Schweringen',
        'Am Lennestein', '110'),
       (0, 3, 'kaeltekrieger', 'Eishockeyclub Kältekrieger e.V.', 'https://kaeltekrieger.de/', '89129', 'Langenau',
        'August-Brust-Straße', '78'),
       (0, 4, 'buehnefrei-ev', 'Theatervereine Bühnefrei e.V.', 'https://bühnefrei.de/', '33397', 'Rietberg',
        'Dechant-Karthaus-Straße', '172');

insert into member
    (id, email, firstName, lastName)
values
-- gruenes-herz-ev
(2, 'emanuel_urban@domain.none', 'Emanuel', 'Urban'),
(3, 'hartlieb-reuter@xyz.none', 'Hartlieb', 'Reuter'),
(4, 'elgard-nicklas@trashmail.none', 'Elgard', 'Nicklas'),
(5, 'gerald.geiger@company.none', 'Gerald', 'Geiger'),
(6, 'jannick.1923@net-mail.none', 'Jannick', 'Cao'),
(7, 'constance.wendling@justmail.none', 'Constance', 'Wendling'),
(8, 'florenz-huefner@spam-mail.none', 'Florenz', 'Häfner'),
-- kaeltekrieger
(9, 'h1978@company.none', 'Herlind', 'Kutscher'),
(10, 'annekathrinfeldhoff@inter-mail.none', 'Annekathrin', 'Feldhof'),
(11, 'rosegunde-19@anymail.none', 'Rosegunde', 'Wilhelmy'),
(12, 'eckhardweirich@spam-mail.none', 'Eckhard', 'Weirich'),
(13, 'g_2011@inter-mail.none', 'Godo', 'Beckers'),
(14, 'klothilde1916@net-mail.none', 'Klothilde', 'Püppel'),
-- buehnefrei-ev
(15, 'samantha1284@net-mail.none', 'Samantha', 'Adomeit'),
(16, 'm-linner@private.none', 'Margund', 'Linner'),
(17, 'b-bork@mymail.none', 'Birgit', 'Bork'),
(18, 'gkalb@quickmail.none', 'Gunther', 'Kalb'),
(19, 'b-schlicker@trashmail.none', 'Burckhard', 'Schlicker'),
(20, 'alix1980@validmail.none', 'Alix', 'Raff');

insert into Member_Verein (member_id, organizations_id)
values
-- gruenes-herz-ev
(2, 2),
(3, 2),
(4, 2),
(5, 2),
(6, 2),
(7, 2),
(8, 2),
-- kaeltekrieger
(9, 3),
(10, 3),
(11, 3),
(12, 3),
(13, 3),
(14, 3),
-- buehnefrei-ev
(15, 4),
(16, 4),
(17, 4),
(18, 4),
(19, 4),
(20, 4);

insert into Bommel (id, parent_id, name, emoji, responsibleMember_id)
values
-- gruenes-herz-ev (id=2)
(2, null, 'Grünes Herz e.V.', '💚', null),
(3, 2, 'Fundraising & Spenden', null, null),
(4, 2, 'Bildungs-Projekte', null, null),
(5, 2, 'Naturschutz-Projekte', null, null),
(6, 4, 'Schulvorträge', null, null),
(7, 4, 'Online Seminare', null, null),
(8, 6, 'Vortrag 1', null, null),
(9, 6, 'Vortrag 2', null, null),
(10, 5, 'Schutz eines Feuchte-Gebietes', null, null),
-- kaeltekrieger (id=3)
(11, null, 'Kältekrieger e.V.', null, null),
(12, 11, 'Verkauf', null, null),
(13, 11, 'Öffentlicher Lauf', null, null),
(14, 11, 'Mannschaften', null, null),
(15, 11, 'Stadion', null, null),
(16, 12, 'Kiosk', null, null),
(17, 12, 'Shop', null, null),
(18, 14, '1. Liga', null, null),
(19, 14, '2. Liga', null, null),
(20, 14, '3. Liga', null, null),
(21, 14, 'Jugend', null, null),
(22, 15, 'Eis Pflege', null, null),
-- buehnefrei-ev (id=4)
(23, null, 'Bühnefrei e.V.', null, null),
(24, 23, 'Kiosk', null, null),
(25, 23, 'Räumlichkeiten', null, null),
(26, 23, 'Workshops', null, null),
(27, 23, 'Projekte', null, null),
(28, 27, 'Der kleine Lord', null, null),
(29, 27, 'Das Hässliche Entlein', null, null),
(30, 27, 'König der Löwen', null, null)
;

update Organization
set rootBommel_id = 2
where id = 2;

update Organization
set rootBommel_id = 11
where id = 3;

update Organization
set rootBommel_id = 23
where id = 4;

select setval('Bommel_SEQ', 30, true);
select setval('Organization_SEQ', 4, true);
select setval('Member_SEQ', 20, true);