-- Phone number a member can add on their profile, visible to the other members of their organization.
alter table member
    add column phone_number varchar(40);
