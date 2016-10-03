
-- insert example data

insert into person values
  (00, 'Arpaly', default, 'Nomy', default, null, 1, 'now'),
  (01, 'Schroeder', default, 'Timothy Allan', default, null, 1, 'now');

insert into list_of_people values
  (02);

insert into list_of_people_element values
  (02, 0, 00),
  (02, 1, 01);

insert into metadata_tag values
  (03, 'desire', default, 1, 'now'),
  (04, 'motivational theory of desire', default, 1, 'now'),
  (05, 'pleasure', default, 1, 'now'),
  (06, 'hedonic theory of desire', default, 1, 'now'),
  (07, 'representational theory of consciousness', default, 1, 'now');

insert into list_of_metadata_tags values
  (08),
  (09),
  (10),
  (11),
  (22);

insert into list_of_metadata_tags_element values
  (08, 0, 03),
  (08, 1, 04),
  (09, 0, 03),
  (09, 1, 04),
  (09, 2, 05),
  (10, 0, 03),
  (10, 1, 05),
  (10, 2, 06),
  (11, 0, 03),
  (11, 1, 05),
  (11, 2, 07);

insert into source values
  (12, 1, 'In Praise of Desire', default, 1, 'now');

  insert into monograph values
    (12);

insert into publisher values
  (13, 'New York: Oxford University Press', default, 1, 'now');

insert into work values
  (14, 02, 2014, 12, 13, 1, 'now');

insert into citation values
  (15, 14, 118, 118, 1, 'now'),
  (16, 14, 124, 124, 1, 'now');

insert into assertable values
  (17, 3, 1, 'now'),
  (18, 3, 1, 'now'),
  (19, 3, 1, 'now'),
  (20, 3, 1, 'now'),
  (21, 3, 1, 'now'),
  (23, 1, 1, 'now'),
  (24, 1, 1, 'now'),
  (25, 1, 1, 'now'),
  (26, 1, 1, 'now'),
  (27, 1, 1, 'now'),
  (31, 3, 1, 'now'),
  (32, 1, 1, 'now'),
  (34, 3, 1, 'now'),
  (37, 3, 1, 'now'),
  (38, 3, 1, 'now'),
  (39, 3, 1, 'now'),
  (40, 2, 1, 'now'),
  (41, 1, 1, 'now'),
  (42, 1, 1, 'now'),
  (44, 3, 1, 'now'),
  (46, 3, 1, 'now'),
  (48, 3, 1, 'now'),
  (49, 1, 1, 'now');

  insert into proposition values
    (17, 'Patients on chlorpromazine are noted for their abilities to stop smoking.', default, 22),
    (18, 'Patients on chlorpromazine are noted for their abilities to diet easily.', default, 22),
    (19, 'Patients on chlorpromazine are noted for their abilities to execute long-term plans.', default, 22),
    (20, 'Patients on chlorpromazine are noted for their abilities to do anything that would 
      seem characteristic of a drug that can suppress appetitive intrinsic desires while leaving 
      other motivational structures intact.', default, 22),
    (21, 'Chlorpromazine is a drug that can suppress appetitive intrinsic desires.', default, 22),
    (31, 'There is someone on chlorpromazine who acts for some ordinary end and does not get 
      pleasure or displeasure from attaining that end.', default, 22),
    (34, 'Patients on high doses of chlorpromazine retain their intrinsic appetitive desires.', default, 22),
    (37, 'Patients on high doses of chlorpromazine do not get pleasure or displeasure from 
      attaining desired ends.', default, 22),
    (38, 'One has appetitive intrinsic desires.', default, 22),
    (39, 'One has states such that people get pleasure or displeasure from attaining ends.', default, 22),
    (44, 'The relation between pleasure and appetitive intrinsic desire is merely causal.', default, 10),
    (46, 'Pleasure and displeasure represent something about intrinsic desires.', default, 22),
    (48, 'Desires is identical to something that involves pleasure and displeasure.', default, 22);

  insert into unary_assertable values
    (23, 2, 17),
    (24, 2, 18),
    (25, 2, 19),
    (26, 2, 20),
    (27, 2, 21),
    (32, 3, 31),
    (41, 4, 40),
    (42, 2, 41),
    (49, 2, 48);

  insert into binary_assertable values
    (40, 3, 38, 39);

insert into list_of_assertables values
  (28),
  (33),
  (36),
  (47);

insert into list_of_assertables_element values
  (28, 1, 23),
  (28, 2, 24),
  (28, 3, 25),
  (28, 4, 26),
  (33, 1, 32),
  (33, 2, 27),
  (36, 1, 34),
  (36, 2, 37),
  (47, 1, 46);

insert into claim values
  (29, 2, 15, 9, true, 1, 'now'),
  (30, 2, 15, 8, true, 1, 'now'),
  (35, 2, 15, 7, true, 1, 'now'),
  (43, 1, 15, 6, true, 1, 'now'),
  (45, 2, 15, 5, true, 1, 'now');

  insert into argument values
    (29, 27, 28, 08),
    (30, 34, 33, 09),
    (35, 42, 36, 09),
    (45, 49, 47, 11);

  insert into assertion values
    (43, 44);

-- done!
