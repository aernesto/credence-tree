
-- create enumeration tables

create table claim_type (
  id serial primary key,
  type text unique not null);
insert into claim_type values
  (1, 'assertion'),
  (2, 'argument');

create table source_type (
  id serial primary key,
  type text unique not null);
insert into source_type values
  (1, 'monograph'),
  (2, 'edited_collection'),
  (3, 'periodical');

create table assertable_type (
  id serial primary key,
  type text unique not null);
insert into assertable_type values
  (1, 'unary_assertable'),
  (2, 'binary_assertable'),
  (3, 'proposition'),
  (4, 'attribution');

create table unary_type (
  id serial primary key,
  type text unique not null);
insert into unary_type values
  (1, 'affirmation'),
  (2, 'negation'),
  (3, 'possibility'),
  (4, 'necessity');

create table binary_type (
  id serial primary key,
  type text unique not null);
insert into binary_type values
  (1, 'conjunction'),
  (2, 'disjunction'),
  (3, 'implication'),
  (4, 'biconditional'),
  (5, 'identity');

create table strength_rating (
  id serial primary key,
  rating text unique not null);
insert into strength_rating values
  (111, '0.01'),
  (11, '0.1'),
  (1, '1'),
  (2, '2'),
  (3, '3'),
  (4, '4'),
  (5, '5'),
  (6, '6'),
  (7, '7'),
  (8, '8'),
  (9, '9'),
  (99, '9.9'),
  (999, '9.99');

-- create person-related tables

create table person (
  id serial primary key,
  surname text not null,
  surname_tsv tsvector not null,
  given_name_s text,
  given_name_s_tsv tsvector,
  birth_year integer,
  contributor integer not null references ct_user,
  contribution_time timestamp not null,
  unique (surname, given_name_s));

create table list_of_people (
  id serial primary key);

create table list_of_people_element (
  list integer not null references list_of_people,
  index integer not null,
  person integer not null references person,
  primary key (list, index),
  unique (list, person));

-- create metadata-tag-related tables

create table metadata_tag (
  id serial primary key,
  tag text unique not null,
  tag_tsv tsvector not null,
  contributor integer not null references ct_user,
  contribution_time timestamp not null);

create table list_of_metadata_tags (
  id serial primary key);

create table list_of_metadata_tags_element (
  list integer not null references list_of_metadata_tags,
  index integer not null,
  metadata_tag integer not null references metadata_tag,
  primary key (list, index),
  unique (list, metadata_tag));

-- create citation-related tables

create table source (
  id serial primary key,
  type integer not null references source_type,
  title text not null,
  title_tsv tsvector not null,
  contributor integer not null references ct_user,
  contribution_time timestamp not null);

  -- create source table hierarchy

  create table monograph (
    id integer primary key references source);

  create table edited_collection (
    id integer primary key references source,
    editors integer not null references list_of_people);

  create table periodical (
    id integer primary key references source,
    volume integer not null);

create table publisher (
  id serial primary key,
  name text unique not null,
  name_tsv tsvector not null,
  contributor integer not null references ct_user,
  contribution_time timestamp not null);

create table work (
  id serial primary key,
  authors integer not null references list_of_people,
  year integer not null,
  source integer not null references source,
  publisher integer not null references publisher,
  contributor integer not null references ct_user,
  contribution_time timestamp not null,
  unique (source, publisher, year));

create table citation (
  id serial primary key,
  work integer not null references work,
  page_range_low integer not null,
  page_range_high integer not null,
  contributor integer not null references ct_user,
  contribution_time timestamp not null,
  unique (work, page_range_low, page_range_high));

-- create assertable-related tables

create table assertable (
  id serial primary key,
  type integer not null references assertable_type,
  contributor integer not null references ct_user,
  contribution_time timestamp not null);

  -- create assertable table hierarchy

  create table unary_assertable (
    id integer primary key references assertable,
    type integer not null references unary_type,
    assertable integer not null references assertable,
    unique (type, assertable));

  create table binary_assertable (
    id integer primary key references assertable,
    type integer not null references binary_type,
    assertable1 integer not null references assertable,
    assertable2 integer not null references assertable,
    unique (type, assertable1, assertable2));

  create table proposition (
    id integer primary key references assertable,
    proposition text unique not null,
    proposition_tsv tsvector not null,
    metadata_tags integer not null references list_of_metadata_tags);

  create table attribution (
    id integer primary key references assertable,
    authors integer not null references list_of_people,
    assertable integer not null references assertable,
    unique (authors, assertable));

create table list_of_assertables (
  id serial primary key);

create table list_of_assertables_element (
  list integer not null references list_of_assertables,
  index integer not null,
  assertable integer not null references assertable,
  primary key (list, index),
  unique (list, assertable));

-- create claim table

create table claim (
  id serial primary key,
  type integer not null references claim_type,
  citation integer not null references citation,
  strength_rating integer not null references strength_rating,
  visible_in_search_results boolean not null,
  contributor integer not null references ct_user,
  contribution_time timestamp not null);

  -- create claim table hierarchy

  create table assertion (
    id integer primary key references claim,
    assertable integer not null references assertable);

  create table argument (
    id integer primary key references claim,
    conclusion integer not null references assertable,
    premises integer not null references list_of_assertables,
    metadata_tags integer not null references list_of_metadata_tags);

-- create insertion/tsv triggers for all the text columns

create trigger person_surname_tsv_trigger
before insert or update on person
for each row execute procedure
tsvector_update_trigger(
  surname_tsv, 'pg_catalog.english', surname);

create trigger person_given_name_s_tsv_trigger
before insert or update on person
for each row execute procedure
tsvector_update_trigger(
  given_name_s_tsv, 'pg_catalog.english', given_name_s);

create trigger metadata_tag_tsv_trigger
before insert or update on metadata_tag
for each row execute procedure
tsvector_update_trigger(
  tag_tsv, 'pg_catalog.english', tag);

create trigger source_tsv_trigger
before insert or update on source
for each row execute procedure
tsvector_update_trigger(
  title_tsv, 'pg_catalog.english', title);

create trigger publisher_tsv_trigger
before insert or update on publisher
for each row execute procedure
tsvector_update_trigger(
  name_tsv, 'pg_catalog.english', name);

create trigger proposition_tsv_trigger
before insert or update on proposition
for each row execute procedure
tsvector_update_trigger(
  proposition_tsv, 'pg_catalog.english', proposition);

-- done!
