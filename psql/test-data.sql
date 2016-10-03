
-- insert example data

insert into person values
  (00, 'Hanson-Holtry', default, 'Nicholas', default, null);

insert into list_of_people values
  (01);

insert into list_of_people_element values
  (01, 0, 00);

insert into metadata_tag values
  (02, 'metadata tags are silly', default);

insert into list_of_metadata_tags values
  (03);

insert into list_of_metadata_tags_element values
  (03, 0, 02);

insert into source values
  (04, 1, 'test source', default);

  insert into monograph values
    (04);

insert into publisher values
  (05, 'test publisher', default);

insert into work values
  (06, 01, 2016, 04, 05);

insert into citation values
  (07, 06, 1, 999);

insert into assertable values
  (08, 3),
  (09, 3),
  (10, 3),
  (11, 1),
  (12, 2);

  insert into proposition values
    (08, 'test test1', default, 03),
    (09, 'test test2', default, 03),
    (10, 'test test3', default, 03);

  insert into unary_assertable values
    (11, 2, 08);

  insert into binary_assertable values
    (12, 3, 09, 11);

insert into list_of_assertables values
  (13);

insert into list_of_assertables_element values
  (13, 0, 08),
  (13, 1, 09);

insert into claim values
  (14, 2, 07, 9),
  (15, 1, 07, 9);

  insert into argument values
    (14, 10, 13, 03);

  insert into assertion values
    (15, 12);

-- done!
