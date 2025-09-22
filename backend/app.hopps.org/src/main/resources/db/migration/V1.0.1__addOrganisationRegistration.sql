alter table if exists Organization
    add column foundationDate date,
    add column registrationCourt varchar(255),
    add column registrationNumber varchar(255),
    add column taxId varchar(255);
