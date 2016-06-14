
-- create utility functions and run example test queries



-- (1) search through all the propositions for a string match

drop function search_propositions (text);
create function search_propositions (
    search_term text)
returns setof proposition
as $$

    select *
    from proposition p
    where p.proposition like ('%' || search_term || '%');
    
$$ language sql;

    -- example test queries

    select count (*) from search_propositions('');

    select * from search_propositions('intrinsic desire');



-- (2) find all uses of an assertable in other compound assertables

drop function bfs_compound_assertables (integer);
create function bfs_compound_assertables (
    start_node integer)
returns table (
    assertable integer,
    distance integer,
    parent integer)

as $$ declare
    current_node integer;
    current_distance integer;
begin

    select a.id into current_node
    from assertable a
    where a.id = start_node;

    current_distance := 0;

    create temporary table frontier (
        assertable integer primary key,
        distance integer not null,
        parent integer not null)
    on commit drop;

    insert into frontier values
        (current_node, current_distance, -1);

    create temporary table results
    on commit drop as
    select * from frontier
    with no data;

    loop

        select f.assertable, f.distance
        into current_node, current_distance
        from frontier f
        limit 1;

        insert into results
        select *
        from frontier f
        where f.assertable = current_node;

        delete from frontier f
        where f.assertable = current_node;

        if current_node is null then exit; end if;
        raise notice 'current_node = %', current_node;

        insert into frontier
        select u.id, current_distance + 1, current_node
        from unary_assertable u
        where u.assertable = current_node;

        insert into frontier
        select b.id, current_distance + 1, current_node
        from binary_assertable b
        where b.assertable1 = current_node
        or    b.assertable2 = current_node;

    end loop;

    return query select * from results;

end; $$ language plpgsql;

    -- example test queries

    select * from bfs_compound_assertables(17);

    select * from bfs_compound_assertables(38);



-- (3) find all uses of an assertable as a conclusion

drop function fetch_conclusions (integer);
create function fetch_conclusions (
    assertable integer)
returns table (
    argument integer)
as $$

    select a.id
    from argument a
    where a.conclusion = assertable;

$$ language sql;

    -- example test queries

    select * from fetch_conclusions(27);



-- (4) fetch all data (from all tables) associated with an argument

drop function fetch_full_argument (integer);
create function fetch_full_argument (
    argument integer)
returns table (
    id integer,
    citation integer,
    strength_rating integer,
    conclusion integer,
    premises integer,
    metadata_tags integer)
as $$

    select c.id, c.citation, c.strength_rating, 
        a.conclusion, a.premises, a.metadata_tags
    from claim c
    inner join argument a
    on c.id = a.id
    where c.id = argument;

$$ language sql;

    -- example test queries

    select * from fetch_full_argument(29);



-- done!
