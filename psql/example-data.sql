
-- insert example data

insert into author values
    (00, 'Nomy', 'Arpaly', null),
    (01, 'Timothy Allan', 'Schroeder', null);

insert into set_of_authors values
    (02);

insert into author_set_element values
    (02, 00),
    (02, 01);

insert into metadata_tag values
    (03, 'desire'),
    (04, 'motivational theory of desire'),
    (05, 'pleasure'),
    (06, 'hedonic theory of desire'),
    (07, 'representational theory of consciousness');

insert into set_of_metadata_tags values
    (08),
    (09),
    (10),
    (11),
    (22);

insert into metadata_tag_set_element values
    (08, 03),
    (08, 04),
    (09, 03),
    (09, 04),
    (09, 05),
    (10, 03),
    (10, 05),
    (10, 06),
    (11, 03),
    (11, 05),
    (11, 07);

insert into source values
    (12, 1, 'In Praise of Desire');

    insert into book values
        (12);

insert into publisher values
    (13, 'New York: Oxford University Press');

insert into work values
    (14, 02, 2014, 12, 13);

insert into citation values
    (15, 14, 118, 118),
    (16, 14, 124, 124);

insert into assertable values
    (17, 3),
    (18, 3),
    (19, 3),
    (20, 3),
    (21, 3),
    (23, 1),
    (24, 1),
    (25, 1),
    (26, 1),
    (27, 1),
    (31, 3),
    (32, 1),
    (34, 3),
    (37, 3),
    (38, 3),
    (39, 3),
    (40, 2),
    (41, 1),
    (42, 1),
    (44, 3),
    (46, 3),
    (48, 3),
    (49, 1);

    insert into proposition values
        (17, 'Patients on chlorpromazine are noted for their abilities to stop smoking.', 22),
        (18, 'Patients on chlorpromazine are noted for their abilities to diet easily.', 22),
        (19, 'Patients on chlorpromazine are noted for their abilities to execute long-term plans.', 22),
        (20, 'Patients on chlorpromazine are noted for their abilities to do anything that would seem characteristic of a drug that can suppress appetitive intrinsic desires while leaving other motivational structures intact.', 22),
        (21, 'Chlorpromazine is a drug that can suppress appetitive intrinsic desires.', 22),
        (31, 'There is someone on chlorpromazine who acts for some ordinary end and does not get pleasure or displeasure from attaining that end.', 22),
        (34, 'Patients on high doses of chlorpromazine retain their intrinsic appetitive desires.', 22),
        (37, 'Patients on high doses of chlorpromazine do not get pleasure or displeasure from attaining desired ends.', 22),
        (38, 'One has appetitive intrinsic desires.', 22),
        (39, 'One has states such that people get pleasure or displeasure from attaining ends.', 22),
        (44, 'The relation between pleasure and appetitive intrinsic desire is merely causal.', 10),
        (46, 'Pleasure and displeasure represent something about intrinsic desires.', 22),
        (48, 'Desires is identical to something that involves pleasure and displeasure.', 22);

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

insert into set_of_assertables values
    (28),
    (33),
    (36),
    (47);

insert into assertable_set_element values
    (28, 23),
    (28, 24),
    (28, 25),
    (28, 26),
    (33, 32),
    (33, 27),
    (36, 34),
    (36, 37),
    (47, 46);

insert into claim values
    (29, 2, 15, 9),
    (30, 2, 15, 8),
    (35, 2, 15, 7),
    (43, 1, 15, 6),
    (45, 2, 15, 5);

    insert into argument values
        (29, 27, 28, 08),
        (30, 34, 33, 09),
        (35, 42, 36, 09),
        (45, 49, 47, 11);

    insert into assertion values
        (43, 44);

-- done!
