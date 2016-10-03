
-- create enumeration tables

create table user_type (
  id serial primary key,
  type text unique not null);
insert into user_type values
  (1, 'member'),
  (2, 'contributor: philosopher');

create table user_specialization (
  id serial primary key,
  parent integer not null references user_type,
  specialization text not null,
  unique (parent, specialization));
insert into user_specialization values
  (default, 2, 'action, agency, intention, free will, moral psychology'),
  (default, 2, 'aesthetic value, art'),
  (default, 2, 'ethics, normative ethics, applied ethics, metaethics'),
  (default, 2, 'game theory, decision theory, rational choice theory, formal epistemology'),
  (default, 2, 'identity, gender, race, sex'),
  (default, 2, 'knowledge, justification of belief, skepticism, other topics in epistemology'),
  (default, 2, 'language'),
  (default, 2, 'logic, mathematics'),
  (default, 2, 'metaphysics'),
  (default, 2, 'mind'),
  (default, 2, 'phenomenology'),
  (default, 2, 'politics and law'),
  (default, 2, 'pragmatism'),
  (default, 2, 'religion'),
  (default, 2, 'science (general)'),
  (default, 2, 'science (life science)'),
  (default, 2, 'science (physical science)'),
  (default, 2, 'science (social science)'),
  (default, 2, 'society, culture, history'),
  (default, 2, 'history of African and Africana philosophy, modern'),
  (default, 2, 'history of African and Africana philosophy, from 1900 on'),
  (default, 2, 'history of American (North, Central, and South) philosophy, modern'),
  (default, 2, 'history of American (North, Central, and South) philosophy, from 1900 on'),
  (default, 2, 'history of Asian philosophy, ancient'),
  (default, 2, 'history of Asian philosophy, modern'),
  (default, 2, 'History of Asian philosophy, from 1900 on'),
  (default, 2, 'history of European philosophy, ancient'),
  (default, 2, 'history of European philosophy, medieval and Renaissance'),
  (default, 2, 'history of European philosophy, modern'),
  (default, 2, 'history of European philosophy, "analytic," from 1900 on'),
  (default, 2, 'history of European philosophy, "continental," from 1900 on');

create table user_privacy_setting (
  id serial primary key,
  type text unique not null);
insert into user_privacy_setting values
  (1, 'low'),
  (2, 'medium'),
  (3, 'high');

create table user_contact_rate (
  id serial primary key,
  type text unique not null);
insert into user_contact_rate values
  (1, 'low'),
  (2, 'medium'),
  (3, 'high'),
  (4, 'none');

-- create user-related tables

create table list_of_specializations (
  id serial primary key);

create table list_of_specializations_element (
  list integer not null references list_of_specializations,
  index integer not null,
  specialization integer not null references user_specialization,
  primary key (list, index),
  unique (list, specialization));

create table ct_user (
  id serial primary key,
  google_id numeric unique not null,
  type integer not null references user_type,
  surname text not null,
  given_name_s text,
  preferred_email_address text not null,
  specializations integer not null references list_of_specializations,
  privacy_setting integer not null references user_privacy_setting,
  contact_rate integer not null references user_contact_rate,
  can_contribute boolean not null,
  can_administrate boolean not null,
  contributions_visible boolean not null);

  -- create user table hierarchy

  create table ct_member (
    id integer primary key references ct_user);

  create table ct_philosopher (
    id integer primary key references ct_user,
    academic_email_address text not null,
    department text not null,
    institution text not null);

-- done!
