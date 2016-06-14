
-- drop existing tables

drop schema public cascade;
create schema public;

-- create enumeration tables

create table claim_type (
    id serial primary key,
    type text unique not null);
insert into claim_type values
    (default, 'assertion'),
    (default, 'argument');

create table source_type (
    id serial primary key,
    type text unique not null);
insert into source_type values
    (default, 'book'),
    (default, 'article');

create table assertable_type (
    id serial primary key,
    type text unique not null);
insert into assertable_type values
    (default, 'unary_assertable'),
    (default, 'binary_assertable'),
    (default, 'proposition'),
    (default, 'attribution');

create table unary_type (
    id serial primary key,
    type text unique not null);
insert into unary_type values
    (default, 'affirmation'),
    (default, 'negation'),
    (default, 'possibility'),
    (default, 'necessity');

create table binary_type (
    id serial primary key,
    type text unique not null);
insert into binary_type values
    (default, 'conjunction'),
    (default, 'disjunction'),
    (default, 'implication'),
    (default, 'biconditional'),
    (default, 'identity');

create table strength_rating (
    id serial primary key,
    rating text unique not null);
insert into strength_rating values
    (default, '0.01'),
    (default, '0.1'),
    (default, '1'),
    (default, '2'),
    (default, '3'),
    (default, '4'),
    (default, '5'),
    (default, '6'),
    (default, '7'),
    (default, '8'),
    (default, '9'),
    (default, '9.9'),
    (default, '9.99');

-- create author-related tables

create table author (
    id serial primary key,
    first_name text,
    last_name text not null,
    birth_year integer,
    unique (first_name, last_name));

create table set_of_authors (
    id serial primary key);

create table author_set_element (
    set integer references set_of_authors,
    author integer references author,
    primary key (set, author));

-- create metadata-tag-related tables

create table metadata_tag (
    id serial primary key,
    tag text unique not null);

create table set_of_metadata_tags (
    id serial primary key);

create table metadata_tag_set_element (
    set integer references set_of_metadata_tags,
    metadata_tag integer references metadata_tag,
    primary key (set, metadata_tag));

-- create citation-related tables

create table source (
    id serial primary key,
    type integer not null references source_type,
    title text not null);

    -- create source table hierarchy

    create table book (
        id integer primary key references source);

    create table article (
        id integer primary key references source,
        source_title text not null);

create table publisher (
    id serial primary key,
    name text unique not null);

create table work (
    id serial primary key,
    authors integer not null references set_of_authors,
    year integer not null,
    source integer not null references source,
    publisher integer not null references publisher);

create table citation (
    id serial primary key,
    work integer not null references work,
    page_range_low integer not null,
    page_range_high integer not null,
    unique (work, page_range_low, page_range_high));

-- create assertable-related tables

create table assertable (
    id serial primary key,
    type integer not null references assertable_type);

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
        metadata_tags integer not null references set_of_metadata_tags);

    create table attribution (
        id integer primary key references assertable,
        authors integer not null references set_of_authors,
        assertable integer not null references assertable,
        unique (authors, assertable));

create table set_of_assertables (
    id serial primary key);

create table assertable_set_element (
    set integer references set_of_assertables,
    assertable integer references assertable,
    primary key (set, assertable));

-- create claim table

create table claim (
    id serial primary key,
    type integer not null references claim_type,
    citation integer not null references citation,
    strength_rating integer not null references strength_rating);

    -- create claim table hierarchy

    create table assertion (
        id integer primary key references claim,
        assertable integer not null references assertable);

    create table argument (
        id integer primary key references claim,
        conclusion integer not null references assertable,
        premises integer not null references set_of_assertables,
        metadata_tags integer not null references set_of_metadata_tags);

-- done!
