
const openParen = 1,
      closeParen = 1,
      unaryOps = [2, 3, 4],
      unaryToType = {2: 2, 3: 4, 4: 3},
      binaryOps = [5, 6, 7, 8, 9],
      binaryToType = {5: 1, 6: 2, 7: 3, 8: 4, 9: 5},
      operators = unaryOps.concat(binaryOps),
      opToString = {2: '~', 3: '&#9633;', 4: '&#9671;', 5: '&#8743;', 
          6: '&#8744;', 7: '&#8594;', 8: '&#8596;', 9: '='}
      contentGroupLocations = [1, 2, 3],
      citationGroupLocations = [4, 5, 6, 7],
      fullCitationGroupLocations = [8],
      groupAnds = [1, 4],
      groupOrs  = [2, 5],
      groupNots = [3, 6];

module.exports = function (environment, pg) {

  // (1) define private helper functions to...

  // (A) ...streamline the process of connecting to the database

  logAllQueries = false;
  function connectToDatabase (callback) {
    pg.connect(environment.DATABASE_URL, function (error, client, done) {
      function query (queryString, queryParameters, callback) {
        client.query(queryString, queryParameters, function (error, result) {
          if (logAllQueries) {
            console.log(queryString + ' ' + JSON.stringify(queryParameters) +
                ' => ' + JSON.stringify(result ? result.rows : '')); }
          if (error) {
            console.log('ERROR (query): ' + error);
            callback(undefined); }
          else {
            callback(result.rows); }}); }
      if (error) {
        console.log('ERROR (connectToDatabase): ' + error); }
      else {
        callback(query, done); }}); }

  // (B) ...do generally useful things

  // check if a string is both defined and nonempty
  function isDefined (thing) {
    return (thing != undefined) && (thing != ''); }

  // simple <element in array> operator
  function inArr (array, element) {
    return array.indexOf(element) != -1; }

  // simple set arithmetic operators
  function union (set1, set2) {
    return new Set([...set1, ...set2]); }
  function intersection (set1, set2) {
    return new Set([...set1].filter(x =>  set2.has(x))); }
  function difference (set1, set2) {
    return new Set([...set1].filter(x => !set2.has(x))); }

  // like PSQL's plainto_tsquery() but with ORs instead of ANDs
  function addOrs (queryText) {
    if (queryText == undefined) { return undefined; }
    else { return queryText.replace(/\s/g, ' | '); }}

  // letter number to letter (ex: 0 -> A)
  function letter (num) {
    return String.fromCharCode(65 + num); }

  // (C) ...assist with writing queries

  // index: the parameter index of a string
  // returns: all propositions containing a match for that string
  function searchPropositionsByString (index) { return '\
    select distinct * from proposition p \
    where p.proposition_tsv @@ \
      to_tsquery(\'english\', $' + index + ')'; }

  // id: the parameter index of the id of an assertable
  // returns: all assertions of that assertable
  function searchAssertionsByAssertable (index) { return '\
    select distinct a.id, a.assertable from assertion a \
    where a.assertable = $' + index; }

  // id: the parameter index of the id of an assertable
  // returns: all arguments using that assertable
  function searchArgumentsByAssertable (index) { return '\
    select distinct a.id, a.conclusion, a.premises \
    from argument a, list_of_assertables loa, \
      list_of_assertables_element loae \
    where a.conclusion = $' + index + '\
      or (a.premises = loa.id \
        and loae.list = loa.id \
        and loae.assertable = $' + index + ')'; }

  // year: the parameter index of a year of publication
  // returns: all claims made in that year
  function searchClaimsByYear (index) { return '\
    select distinct cl.id, cl.type \
    from claim cl, citation ci, work w \
    where cl.citation = ci.id \
      and ci.work = w.id \
      and w.year = $' + index; }

  // year: the parameter index of a string
  // returns: all claims made by authors matching that string
  function searchClaimsByAuthor (index) { return '\
    select cl.id, cl.type \
    from claim cl, citation ci, work w, list_of_people lop, \
      list_of_people_element lope, person p \
    where cl.citation = ci.id \
    and ci.work = w.id \
    and w.authors = lop.id \
    and lope.list = lop.id \
    and lope.person = p.id \
    and (p.surname_tsv @@ to_tsquery($' + index + ') \
      or p.given_name_s_tsv @@ to_tsquery($' + index + ') )'; }

  function searchClaimsByCitation (queryObj, keys, curGroupPrefix) {
    var selectClause = 'select distinct cl.id, cl.type',
        fromClause = 'from claim cl, citation ci, work w, source s',
        whereClause = 'where cl.citation = ci.id' +
            ' and ci.work = w.id and w.source = s.id';
    return generalSearchClaimsByCitation(queryObj, keys,
        curGroupPrefix, selectClause, fromClause, whereClause, false); }

  function searchCitations (queryObj, keys, curGroupPrefix, exact) {
    var selectClause = 'select distinct w.id',
        fromClause = 'from work w, source s',
        whereClause = 'where w.source = s.id';
    return generalSearchClaimsByCitation(queryObj, keys,
        curGroupPrefix, selectClause, fromClause, whereClause, exact); }

  function generalSearchClaimsByCitation (queryObj, keys,
      curGroupPrefix, selectClause, fromClause, whereClause, exact) {
    var authors = [],
        editors = [],
        authorID = 1,
        editorID = 1;
    // format all the authors
    while (true) {
      var curAuthorSN = curGroupPrefix() + 'asn' + authorID;
      var curAuthorGN = curGroupPrefix() + 'agn' + authorID;
      if (inArr(keys, curAuthorSN) || inArr(keys, curAuthorGN)) {
        var newPerson = {};
        newPerson.sn = queryObj[curAuthorSN];
        newPerson.gn = queryObj[curAuthorGN];
        if (isDefined(newPerson.sn) || isDefined(newPerson.gn)) {
          authors.push(newPerson); }
        authorID++; }
      else {
        break; }}
    // format all the editors
    // TODO: refactor with author code
    while (true) {
      var curEditorSN = curGroupPrefix() + 'esn' + editorID;
      var curEditorGN = curGroupPrefix() + 'egn' + editorID;
      if (inArr(keys, curEditorSN) || inArr(keys, curEditorGN)) {
        var newPerson = {};
        newPerson.sn = queryObj[curEditorSN];
        newPerson.gn = queryObj[curEditorGN];
        if (isDefined(newPerson.sn) || isDefined(newPerson.gn)) {
          editors.push(newPerson); }
        editorID++; }
      else {
        break; }}
    function getFromQueryObj (name) {
      return queryObj[curGroupPrefix() + name]; }
    var title = getFromQueryObj('title'),
        publisher = getFromQueryObj('publisher'),
        year = getFromQueryObj('year'),
        volume = getFromQueryObj('volume'),
        sourceType = getFromQueryObj('source');
    return generalSearchByCitationHelper(authors,
        editors, title, publisher, year, volume, sourceType,
        selectClause, fromClause, whereClause, exact); }

  function generalSearchByCitationHelper (
      authors, editors, title, publisher, year, volume, sourceType,
      selectClause, fromClause, whereClause, exact) {
    var personID = 1,
        params = [],
        curIndex = function () { return params.length; };
    if (authors && authors.length > 0) {
      fromClause += ', list_of_people lop1';
      whereClause += ' and w.authors = lop1.id'; }
    for (var i = 0; i < authors.length; i++) {
      var author = authors[i],
          curP = 'p' + personID,
          curLOPE = 'lope' + personID;
      fromClause += ', person ' + curP + 
          ', list_of_people_element ' + curLOPE;
      whereClause += ' and ' + curLOPE + '.list = lop1.id and ' + 
          curLOPE + '.person = ' + curP + '.id';
      if (isDefined(author.gn)) {
        if (exact) {
          params.push(author.gn);
          whereClause += ' and ' + curP + 
              '.given_name_s = $' + curIndex(); }
        else {
          params.push(addOrs(author.gn));
          whereClause += ' and ' + curP + 
              '.given_name_s_tsv @@ to_tsquery($' + curIndex() + ')'; }}
      if (isDefined(author.sn)) {
        if (exact) {
          params.push(author.sn);
          whereClause += ' and ' + curP + 
              '.surname = $' + curIndex(); }
        else {
          params.push(addOrs(author.sn));
          whereClause += ' and ' + curP + 
              '.surname_tsv @@ to_tsquery($' + curIndex() + ')'; }}
      personID++; }
    if (sourceType == 2) {
      // TODO: refactor with the author code
      if (editors && editors.length > 0) {
        fromClause += ', list_of_people lop2' +
            ', edited_collection ec';
        whereClause += ' and ec.id = s.id and ec.editors = lop2.id'; }
      for (var i = 0; i < editors.length; i++) {
        var editor = editors[i],
            curP = 'p' + personID,
            curLOPE = 'lope' + personID;
        fromClause += ', person ' + curP + 
            ', list_of_people_element ' + curLOPE;
        whereClause += ' and ' + curLOPE + '.list = lop2.id and ' + 
            curLOPE + '.person = ' + curP + '.id';
        if (isDefined(editor.gn)) {
          if (exact) {
            params.push(editor.gn);
            whereClause += ' and ' + curP + 
                '.given_name_s = $' + curIndex(); }
          else {
            params.push(addOrs(editor.gn));
            whereClause += ' and ' + curP + 
                '.given_name_s_tsv @@ to_tsquery($' + curIndex() + ')'; }}
        if (isDefined(editor.sn)) {
          if (exact) {
            params.push(editor.sn);
            whereClause += ' and ' + curP + 
                '.surname = $' + curIndex(); }
          else {
            params.push(addOrs(editor.sn));
            whereClause += ' and ' + curP + 
                '.surname_tsv @@ to_tsquery($' + curIndex() + ')'; }}
        personID++; }}
    if (isDefined(title)) {
      if (exact) {
        params.push(title);
        whereClause += ' and s.title = $' + curIndex(); }
      else {
        params.push(addOrs(title));
        whereClause += ' and s.title_tsv @@ to_tsquery($' + curIndex() + ')'; }}
    if (isDefined(publisher)) {
      fromClause += ', publisher pub';
      if (exact) {
        params.push(publisher);
        whereClause += ' and pub.id = w.publisher' +
            ' and pub.name = $' + curIndex(); }
      else {
        params.push(addOrs(publisher));
        whereClause += ' and pub.id = w.publisher' +
            ' and pub.name_tsv @@ to_tsquery($' + curIndex() + ')'; }}
    if (isDefined(year)) {
      params.push(addOrs(year));
      whereClause += ' and w.year = $' + curIndex(); }
    if (sourceType == 3 && isDefined(volume)) {
      fromClause += ', periodical per';
      whereClause += ' and per.id = s.id and per.volume = ' + volume; }
    var query = selectClause + ' ' + fromClause + ' ' + whereClause,
        queryInfo = {
          authors: authors,
          editors: editors,
          title: title,
          publisher: publisher,
          year: year,
          volume: volume,
          sourceType: sourceType};
    return [query, params, queryInfo]; }

  function searchUnariesByChild (
      unaryTypeIndex, assertableListIndex) { return '\
    select distinct u.id from unary_assertable u \
    where u.type = $' + unaryTypeIndex + ' \
    and u.assertable = any($' + assertableListIndex + ')'; }

  function searchBinariesByChild (binaryTypeIndex,
      leftAssertableListIndex, rightAssertableListIndex) { return '\
    select distinct b.id from binary_assertable b \
    where b.type = $' + binaryTypeIndex + ' \
    and (b.assertable1 = any($' + leftAssertableListIndex + ') \
    or b.assertable2 = any($' + rightAssertableListIndex + ') )'; }

  // id: the parameter index of the id of an assertable
  // returns: (the id's of the parents of that assertable |
  // the types of the parents | the operator in the parents)
  function searchAssertableParents (index) { return '\
    select distinct u.id, 1 as type, u.type as operator \
    from unary_assertable u \
    where u.assertable = $' + index + ' \
      union select distinct a.id, 4, 0 \
      from attribution a \
      where a.assertable = $' + index + ' \
        union select distinct b.id, 2, b.type \
        from binary_assertable b \
        where b.assertable1 = $' + index + ' \
        or b.assertable2 = $' + index; }

  // (E) ...assist with parsing queries

  function parseGroup (queryObj, curGroupKeys, curGroupPrefix, callback) {
    // TODO: refactor: these parameters should be more logically orthogonal
    // TODO: really this should be supported by a better back-end typing system
    var curThingID = -1,
        allThingID = -1,
        prevOperator = [],
        prevOpenParenID = [],
        logicalRequirements = [],
        logicalDependencies = {},
        propQueries = {};
    function incCurID () {
      curThingID = ++allThingID; }
    function handlePrevOperator () {
      if (prevOperator.length > 0) {
        var requirement = prevOperator.pop();
        requirement['right'] = curThingID;
        logicalRequirements.push(requirement); }}
    function handlePrevOpenParen () {
      prevOpenParenID.forEach( function (id) {
        logicalDependencies[id].push(curThingID); }); }
    if (curGroupKeys.length > 0) {
      var curRow = 1,
          curRowIsEmpty = true,
          curRowPrefix = function () { return 'r' + curRow; },
          curPrefix = function () { 
            return curGroupPrefix() + curRowPrefix(); };
      function handleRow () {
        var curRowIsEmpty = true;
        if (inArr(curGroupKeys, curPrefix())) {
          curRowIsEmpty = false;
          var curRowSearchTerm = curGroupKeys[curPrefix()],
              curBefore = 1,
              curBeforeTerm = function () { 
                return curPrefix() + 'b' + curBefore; };
          function handleBefore () {
            if (inArr(curGroupKeys, curBeforeTerm())) {
              var curThing = parseInt(queryObj[curBeforeTerm()]);
              if (curThing == openParen) {
                incCurID();
                prevOpenParenID.push(curThingID);
                logicalDependencies[curThingID] = [];
                handlePrevOperator(); }
              else if (inArr(unaryOps, curThing)) {
                incCurID();
                handlePrevOperator();
                handlePrevOpenParen();
                prevOperator.push({
                    'id': curThingID,
                    'op': curThing}); }
              else if (inArr(binaryOps, curThing)) {
                var prevThingID = curThingID;
                incCurID();
                handlePrevOpenParen();
                prevOperator.push({
                    'id': curThingID,
                    'op': curThing,
                    'left': prevThingID}); }
              else {
                // TODO: error handling
              }

              curRowIsEmpty = false;
              curBefore++;
              handleBefore();

            } else {

              incCurID();
              var curThing = queryObj[curPrefix()];
              propQueries[curThingID] = curThing;
              handlePrevOperator();
              handlePrevOpenParen();

              var curAfter = 1,
                  curAfterTerm = function () { 
                    return curPrefix() + 'a' + curAfter; };
              function handleAfter () {
                if (inArr(curGroupKeys, curAfterTerm())) {

                  var curThing = parseInt(queryObj[curAfterTerm()]);
                  if (curThing == closeParen) {
                    curThingID = prevOpenParenID.pop(); }
                  else {
                    // TODO: error handling
                  }

                  curRowIsEmpty = false;
                  curAfter++;
                  handleAfter();
                } else {
                  curRow++;
                  handleRow();
                }
              }
              handleAfter();
            }
          }
          handleBefore();

        } else {
          // done with this group
          var returnVal = {};
          returnVal.logicalRequirements = logicalRequirements;
          returnVal.logicalDependencies = logicalDependencies;
          returnVal.propQueries = propQueries;
          callback(returnVal);
        }
      }
      handleRow();
    } else {
      // nothing to parse in this group
      callback(undefined);
    }
  }

  function parseLogic (parseResults) {
    // TODO: really this should be a recursive descent parser, but, as with
    // parseGroup(), that would require a better back-end typing system

    var requirements = {}
        requirementsOld = parseResults.logicalRequirements,
        dependencies = parseResults.logicalDependencies,
        queries = parseResults.propQueries;
    requirementsOld.forEach( function (requirement) {
      var id = requirement.id;
      delete requirement.id;
      requirements[id] = requirement; });

    var maxID = 0;
    while (true) {
      var foundOne = false;
      if (maxID in requirements) { foundOne = true; }
      if (maxID in dependencies) { foundOne = true; }
      if (maxID in queries) { foundOne = true; }
      if (foundOne) { maxID++; continue; }
      else { maxID--; break; }}
    var idToString = {},
        solvedIDs = [],
        queriesToString = [],
        curQueryID = 0;
    for (var id = 0; id <= maxID; id++) {
      if (id in queries) {
        var curLetter = letter(curQueryID);
        idToString[id] = curLetter;
        solvedIDs.push(parseInt(id));
        queriesToString.push(curLetter + ': ' + queries[id]);
        curQueryID++; }}

    // TODO: implement a legit cloning method
    var allRequirements = JSON.parse(JSON.stringify(requirements)),
        allDependencies = JSON.parse(JSON.stringify(dependencies));
    for (dependency in allDependencies) {
      allDependencies[dependency] = {
        'ids': allDependencies[dependency] }; }

    var attemptNum = 0;
    while (true) {
      for (id in requirements) {
        var requirement = requirements[id],
            op = requirement.op,
            left = requirement.left,
            right = requirement.right;
        if (inArr(unaryOps, op)) {
          if (right in idToString) {
            idToString[id] = opToString[op] + '(' + idToString[right] + ')';
            solvedIDs.push(parseInt(id));
            delete requirements[id];
          }
        } else if (inArr(binaryOps, op)) {
          if ((left in idToString) && (right in idToString)) {
            idToString[id] = '(' + idToString[left] + ')' + 
                opToString[op] + '(' + idToString[right] + ')';
            solvedIDs.push(parseInt(id));
            delete requirements[id];
          }
        }
      }
      for (id in dependencies) {
        var dependency = dependencies[id],
            solved = true,
            lastSolvedIndex = 0;
        dependency.forEach( function (otherID) {
          var index = solvedIDs.indexOf(parseInt(otherID));
          if (index > lastSolvedIndex) {
            lastSolvedIndex = index;
          } else if (index == -1) {
            solved = false;
          }
        });
        if (solved) {
          var lastSolved = solvedIDs[lastSolvedIndex];
          idToString[id] = idToString[lastSolved];
          allDependencies[id].id = lastSolved;
          solvedIDs.push(parseInt(id));
          delete dependencies[id];
        }
      }
      if ((attemptNum++ > maxID) || solvedIDs.length == (maxID + 1)) { break; }
    }
    var groupAsLogicString = idToString[solvedIDs.slice(-1)[0]];

    return [groupAsLogicString, queriesToString, 
        [allRequirements, allDependencies, solvedIDs]];
  }

  const lineReturn = '<br/>',
      lineBreak = lineReturn + lineReturn;

  function createQuerySummaryString (queries, logicString) {
    var summaryString = '';
    queries.forEach( function (propString) {
      summaryString += propString + lineReturn; });
    summaryString += logicString;
    return summaryString; }

  // (E) ...automate complex querying procedures

  function fetchResultsForProposition (query, searchTerm, callback) {
    generalFetchForProposition(query, searchTerm, true, callback); }

  function fetchAllParentsOfProposition (query, searchTerm, callback) {
    generalFetchForProposition(query, searchTerm, false, callback); }

  function generalFetchForProposition (
      query, searchTerm, onlyResults, callback) {
    generalFetch(query, searchPropositionsByString(1), 
        [searchTerm], onlyResults, callback); }

  function fetchAllParentsOfUnary (
      query, unaryType, assertableList, callback) {
    generalFetch(query, searchUnariesByChild(1, 2), 
        [unaryType, assertableList], false, callback); }

  function fetchAllParentsOfBinary (query, binaryType, 
      leftAssertableList, rightAssertableList, callback) {
    generalFetch(query, searchBinariesByChild(1, 2, 3), [binaryType, 
        leftAssertableList, rightAssertableList], false, callback); }

  function generalFetch (
      query, sourceQuery, sourceParams, onlyResults, callback) {
    query(sourceQuery, sourceParams, function (results) {
      var frontier = [],
          allResults = [],
          distance = {};
      function pushResults (resultsList, newResults) {
        newResults.forEach( function (result) {
          var newID = result.id || result;
          if (!inArr(resultsList, newID)) {
            resultsList.push(newID); }}); }
      pushResults(frontier, results);
      frontier.forEach( function (node) {
        distance[node] = 0; });
      function findAnotherParent () {
        // TODO: can this be refactored for speed by using 'where any()' in
        // searchAssertableParents(), as was done in searchUnariesByChild()?
        var nextNode = frontier.pop(),
            nextNodeDistance = distance[nextNode];
        if (nextNode != undefined) {
          pushResults(allResults, [nextNode]);
          query(searchAssertableParents(1),
              [nextNode], function (results) {
            pushResults(frontier, results);
            results.forEach( function (result) {
              var curResult = result.id,
                  newDistance = nextNodeDistance + 1;
              if (curResult in distance) {
                newDistance = Math.min(distance[curResult], newDistance) }
              distance[curResult] = newDistance; });
            findAnotherParent(); }); }
        else {
          if (!onlyResults) {
            callback(allResults); }
          else {
            var allAssertions = [],
                allResults2 = [];
            function contains (list, element1) {
              var returnVal = false;
              list.forEach( function (element2) {
                if (element1.id == element2.id) {
                  returnVal = true; }});
              return returnVal; }
            function findAnotherAssertion () {
              nextNode = allResults.pop();
              if (nextNode != undefined) {
                allResults2.push(nextNode);
                query(searchAssertionsByAssertable(1),
                    [nextNode], function (results) {
                  results.forEach( function (result) {
                    var newResult = {
                      'id': result.id,
                      'distance': distance[nextNode] };
                    if (!contains(allAssertions, newResult)) {
                      allAssertions.push(newResult); }});
                  findAnotherAssertion(); }); }
              else {
                var allArguments = [];
                // TODO: refactor with findAnotherAssertion()
                function findAnotherArgument () {
                  nextNode = allResults2.pop();
                  if (nextNode != undefined) {
                    query(searchArgumentsByAssertable(1),
                        [nextNode], function (results) {
                      results.forEach( function (result) {
                        var newResult = {
                          'id': result.id,
                          'distance': distance[nextNode] };
                        if (!contains(allArguments, newResult)) {
                          allArguments.push(newResult); }});
                      findAnotherArgument(); }); }
                  else {
                    callback({
                      'assertions': allAssertions,
                      'arguments': allArguments }); }}
                findAnotherArgument(); }}
            findAnotherAssertion(); }}}
      findAnotherParent(); }); }

  // function searchAssertionsByAssertable (index) { return '\
  //   select distinct a.id from assertion a \
  //   where a.assertable = $' + index; }

  // // id: the parameter index of the id of an assertable
  // // returns: all arguments using that assertable
  // function searchArgumentsByAssertable (index) { return '\

  function fetchFullAssertableByID (query, id, callback) {
    // console.log('fetchFullAssertableByID(id: ' + id + ')');
    query('select * from assertable a where a.id = $1',
        [id], function (results) {
      if (results && results[0] && results[0].type) {
        var type = results[0].type;
        if (type == 1) {
          query('select * from unary_assertable u where u.id = $1',
              [id], function (results) {
            if (results && results[0] && 
                results[0].assertable && results[0].type) {
              fetchFullAssertableByID(query, 
                  results[0].assertable, function (assertableObj) {
                // console.log('assertableObj = ' + JSON.stringify(assertableObj));
                callback({
                  id: id,
                  typeA: type,
                  typeB: results[0].type,
                  right: assertableObj
                });
              });
            }
            else {
              callback(undefined);
            }
          });
        }
        else if (type == 2) {
          query('select * from binary_assertable b where b.id = $1',
              [id], function (results) {
            if (results && results[0] && results[0].assertable1 &&
                results[0].assertable2 && results[0].type) {
              fetchFullAssertableByID(query, 
                  results[0].assertable1, function (assertable1Obj) {
                fetchFullAssertableByID(query, 
                    results[0].assertable2, function (assertable2Obj) {
                  // console.log('assertableObj1 = ' + JSON.stringify(assertable1Obj));
                  // console.log('assertableObj2 = ' + JSON.stringify(assertable2Obj));
                  callback({
                    id: id,
                    typeA: type,
                    typeB: results[0].type,
                    left: assertable1Obj,
                    right: assertable2Obj
                  });
                });
              });
            }
            else {
              callback(undefined);
            }
          });
        }
        else if (type == 3) {
          query('select * from proposition p where p.id = $1',
              [id], function (results) {
            if (results && results[0] && results[0].proposition) {
              callback({
                id: id,
                typeA: type,
                prop: results[0].proposition
              });
            }
            else {
              callback(undefined);
            }
          });
        }
        else if (type == 4) {
          // TODO
          callback(undefined);
        }
        else {
          callback(undefined);
        }
      }
      else {
        callback(undefined);
      }
    });
  }

  function fetchFullClaimByChildID (query, id, callback) {
    // console.log('fetchFullClaimByChildID(id: ' + id + ')');
    var allAssertions = [], allArguments = [];
    query(searchAssertionsByAssertable(1), [id], function (assertionsResults) {
      query(searchArgumentsByAssertable(1), [id], function (argumentsResults) {
        // console.log('  assertions = ' + JSON.stringify(assertionsResults));
        // console.log('  arguments = ' + JSON.stringify(argumentsResults));
        function fetchOneAssertion () {
          var assertion = assertionsResults.pop();
          if (assertion != undefined) {
            var assertable = assertion.assertable;
            if (assertable) {
              fetchFullAssertableByID(query, assertable,
                  function (assertableObj) {
                // TODO: check if this obj's id is already in list
                // console.log('  assertableObj = ' + JSON.stringify(assertableObj));
                allAssertions.push(assertableObj);
                fetchOneAssertion();
              });
            } else {
              fetchOneAssertion();
            }
          }
          else {
            function fetchOneArgument () {
              var argument = argumentsResults.pop(),
                  newArgumentObj = {};
              if (argument != undefined) {
                var conclusion = argument.conclusion;
                if (conclusion) {
                  fetchFullAssertableByID(query, conclusion,
                      function (conclusionObj) {
                    newArgumentObj['C'] = conclusionObj;
                    query('select distinct * from list_of_assertables_element ' +
                        'loae where loae.list = $1', [argument.premises], 
                        function (premises) {
                      function fetchOnePremise () {
                        var premise = premises.pop();
                        if (premise && premise.assertable) {
                          fetchFullAssertableByID(query, premise.assertable,
                              function (premiseObj) {
                            newArgumentObj['P' + premise.index] = premiseObj;
                            fetchOnePremise();
                          });
                        }
                        else {
                          allArguments.push(newArgumentObj);
                          fetchOneArgument();
                        }
                      }
                      fetchOnePremise();
                    });
                  });
                } else {
                  fetchOneArgument();
                }
              }
              else {
                // console.log('  allAssertions = ' + JSON.stringify(allAssertions));
                // console.log('  allArguments = ' + JSON.stringify(allArguments));
                callback({
                  assertions: allAssertions,
                  arguments: allArguments
                });
              }
            }
            fetchOneArgument();
          }
        }
        fetchOneAssertion();
      });
    });
  }

  // (2) define the database interface (ie, the publicly available queries)

  return {

    getUserSpecializations: function (userType, callback) {
      connectToDatabase( function (query, done) { query('\
        select distinct s.id, s.specialization \
        from user_specialization s \
        where s.parent = $1', [userType],
        function (results) {
          done(); callback(results); }); }); },

    userIdToUser: function (userID, callback) {
      connectToDatabase( function (query, done) { query('\
        select distinct * from ct_user u \
        where u.id = $1', [userID],
        function (results) {
          done();
          if (results.length == 0) {
            callback(undefined); }
          else {
            callback(results[0]); }}); }); },

    // TODO: refactor userIdToUser() and googleIdToUser()
    googleIdToUser: function (googleID, callback) {
      connectToDatabase( function (query, done) { query('\
        select distinct * from ct_user u \
        where u.google_id = $1', [googleID],
        function (results) {
          done();
          if (results.length == 0) {
            callback(undefined); }
          else {
            callback(results[0]); }}); }); },

    // right now the default is to allow all new users to contribute
    // todo: change to "false, false, true" after alpha phase is done
    makeNewUser: function (google_id, legal_notice, surname, given_name_s,
        user_type, department, institution, academic_email_address,
        preferred_email_address, privacy_setting, contact_rate, 
        specializations, callback) {
      if (legal_notice == 'accept' && surname && given_name_s && 
          ((user_type == 2 && department && institution && 
          academic_email_address) || (user_type == 1)) && 
          preferred_email_address && privacy_setting && contact_rate) {
        connectToDatabase( function (query, done) { query('\
          insert into list_of_specializations \
          values (default) returning id', [],
          function (results) {
            var specializationID = results[0].id; query('\
            insert into ct_user values \
            (default, $1, $2, $3, $4, $5, $6, $7, $8, true, false, true) \
            returning id', [google_id, user_type, surname, given_name_s, 
            preferred_email_address, specializationID, 
            privacy_setting, contact_rate],
            function (results) {
              var userID = results[0].id;
              function returnUserID () {
                done(); callback(userID); }
              if (user_type == 1) { query('\
                insert into ct_member \
                values ($1) returning id',
                [userID], returnUserID); }
              else if (user_type == 2) { query('\
                insert into ct_philosopher \
                values ($1, $2, $3, $4) returning id',
                [userID, academic_email_address, department, 
                institution], returnUserID); }}); }); }); }
      else { callback(false); }},

    search: function (queryObj, callback) {
      connectToDatabase( function (query, done) {
        var basicQuery = queryObj['query'];
        if (basicQuery) {
          // basic search
          var formattedQuery = addOrs(basicQuery),
              allResultIDs = [];
          // (1) search through the text of propositions
          fetchResultsForProposition(query, formattedQuery,
          function (propositionResults) {
            // console.log('propositionResults = ' + JSON.stringify(propositionResults));
            allResultIDs = allResultIDs.concat(propositionResults.arguments);
            allResultIDs = allResultIDs.concat(propositionResults.assertions);
            // (2) search for claims made by authors
            query(searchClaimsByAuthor(1), [formattedQuery],
                function (authorResults) {
              allResultIDs = allResultIDs.concat(authorResults);
              // (3) search for claims made in specific years
              var numbersInQuery = [];
              basicQuery.split(' ').forEach( function (term) {
                var termAsNumber = parseInt(term);
                if (!isNaN(termAsNumber)) {
                  numbersInQuery.push(termAsNumber); }});
              function searchAnotherYear () {
                var year = numbersInQuery.pop();
                if (year != undefined) {
                  query(searchClaimsByYear(1), [year],
                      function (yearResults) {
                    allResultIDs = allResultIDs.concat(yearResults);
                    searchAnotherYear(); }); }
                else {
                  done();
                  // todo: refactor with advanced search code
                  var allAssertions = [],
                      allArguments = [];
                  function doOneResult () {
                    var result = allResultIDs.pop();
                    // console.log('allResultIDs = ' + JSON.stringify(allResultIDs));
                    // console.log('result = ' + JSON.stringify(result));
                    if (result && result.id) {
                      // todo: refactor to use non-child id's?
                      fetchFullClaimByChildID(query, result.id, function (results) {
                        allAssertions = allAssertions.concat(results.assertions);
                        allArguments = allArguments.concat(results.arguments);
                        doOneResult();
                      });
                    }
                    else {
                      done();
                      callback({
                        assertions: allAssertions,
                        arguments: allArguments,
                        query: basicQuery
                      });
                    }
                  }
                  doOneResult();
                }
              }
              searchAnotherYear();
            });
          });
        } else {
          // advanced search
          // console.log('advanced search');
          logAllQueries = false;
          var curGroup = 1,
              curGroupPrefix = function () { return 'g' + curGroup; },
              keys = Object.keys(queryObj),
              resultsForGroup = {},
              textForGroup = {};
          function handleGroup () {
            function doneWithThisGroup () {
              curGroup++;
              handleGroup(); }
            var curGroupKeys = [];
            keys.forEach( function (key) {
              if (inArr(key, curGroupPrefix())) {
                curGroupKeys.push(key); }});
            if (curGroupKeys.length > 0) {
              var groupTypeKey = curGroupPrefix() + 'in',
                  groupType = parseInt(queryObj[groupTypeKey]);
              if (groupType == undefined) {
                // TODO: error handling
                doneWithThisGroup();
              } else if (inArr(contentGroupLocations, groupType)) {
                // content search

                parseGroup(queryObj, curGroupKeys, curGroupPrefix,
                    function (parseGroupResults) {
                  var propQueries = parseGroupResults.propQueries,
                      parseLogicResults = parseLogic(parseGroupResults),
                      groupAsLogicString = parseLogicResults[0],
                      queriesToString = parseLogicResults[1],
                      requirements = parseLogicResults[2][0],
                      dependencies = parseLogicResults[2][1],
                      solvedIDs = parseLogicResults[2][2];

                  var resultsFor = {};
                  function getResultsFor (id) {
                    if (id in resultsFor) {
                      return Array.from(resultsFor[id]); }
                    else { return []; }}
                  function putResultsFor (id, results) {
                    // console.log('  id = ' + JSON.stringify(id));
                    (new Set(results)).forEach( function (value) {
                      // console.log('    ' + value);

                    });
                    resultsFor[id] = new Set(results); }

                  function searchOneProp (id, callback) {
                    var propSearchText = propQueries[id],
                        formattedText = addOrs(propSearchText);
                    fetchAllParentsOfProposition(query, 
                        formattedText, function (propResults) {
                      putResultsFor(id, propResults);
                      callback(id); }); }

                  function searchOneRequirement (id, callback) {
                    var requirement = requirements[id],
                        op = requirement.op,
                        left = requirement.left,
                        right = requirement.right,
                        resultsForLeft = getResultsFor(left),
                        resultsForRight = getResultsFor(right);
                    if (inArr(unaryOps, op)) {
                      var opType = unaryToType[op];
                      fetchAllParentsOfUnary(query, opType,
                          resultsForRight, function (results) {
                        putResultsFor(id, results);
                        callback(id); }); }
                    else if (inArr(binaryOps, op)) {
                      var opType = binaryToType[op];
                      if (opType != 3) { // implication
                        var leftRightUnion = union(
                            resultsForLeft, resultsForRight);
                        resultsForLeft = leftRightUnion;
                        resultsForRight = leftRightUnion; }
                      fetchAllParentsOfBinary(query, opType, resultsForLeft,
                          resultsForRight, function (results) {
                        putResultsFor(id, results);
                        callback(id); }); }
                    else { /* TODO: error handling */ }}

                  function searchAllThings (callback) {
                    function searchOneThing (id) {
                      var thingID = solvedIDs.pop();
                      if (thingID != undefined) {
                        thingID = parseInt(thingID);
                        if (thingID in propQueries) {
                          searchOneProp(thingID, searchOneThing); }
                        else if (thingID in requirements) {
                          searchOneRequirement(thingID, searchOneThing); }
                        else if (thingID in dependencies) {
                          var sourceID = dependencies[thingID].id;
                          resultsFor[thingID] = resultsFor[sourceID];
                          searchOneThing(thingID); }
                        else { /* TODO: error handling */ }}
                      else { callback(id); }}
                    solvedIDs.reverse();
                    searchOneThing(); }

                  searchAllThings( function (last) {
                    resultsForGroup[curGroup] = resultsFor[last];
                    textForGroup[curGroup] = createQuerySummaryString(
                        queriesToString, groupAsLogicString);
                    // console.log('  resultsFor = ' + JSON.stringify(resultsFor));
                    doneWithThisGroup();
                  });

                });

              } else if (inArr(citationGroupLocations, groupType)) {
                // citation search
                // TODO NOW
                doneWithThisGroup();

              } else if (inArr(fullCitationGroupLocations, groupType)) {
                var newQuery = searchClaimsByCitation(
                    queryObj, keys, curGroupPrefix);
                query(newQuery[0], newQuery[1], function (results) {
                  // TODO NOW
                  doneWithThisGroup();
                });

              }
            } else {

              var results,
                  groupSearchText,
                  searchText = lineReturn + 'Search results for the following ' +
                  'query...' + lineBreak + 'Please ensure that this is a ' +
                  'semantically correct interpretation of your intended query ' +
                  '(ie, that the correct order of operations has been ' +
                  'maintained, that no logical operators have been dropped ' +
                  'due to incorrect grouping, etc).';

              for (var i = 1; i < curGroup; i++) {

                searchText += lineBreak + '<u>Group ' + i + '</u>' +
                    lineReturn + textForGroup[i];

                var thisGroupString = 'G' + i;
                if (i == 1) {
                  results = new Set(resultsForGroup[i]);
                  groupSearchText = thisGroupString; }
                else {
                  var groupAndOp = parseInt(queryObj['g' + i + 'and']),
                      groupOpFunction = undefined,
                      groupOpString = undefined;
                  if (inArr(groupAnds, groupAndOp)) {
                    groupOpFunction = intersection;
                    groupOpString = opToString[5]; }
                  else if (inArr(groupOrs, groupAndOp)) {
                    groupOpFunction = union;
                    groupOpString = opToString[6]; }
                  else if (inArr(groupNots, groupAndOp)) {
                    groupOpFunction = difference;
                    groupOpString = opToString[5] + opToString[2]; }
                  else { /* TODO: error handling */ }
                  if (groupOpFunction != undefined) {
                    results = groupOpFunction(results, resultsForGroup[i]);
                    var oldGroupSearchText;
                    if (i == 2) { oldGroupSearchText = groupSearchText; }
                    else { oldGroupSearchText = '(' + groupSearchText + ')'; }
                    groupSearchText = oldGroupSearchText +
                        groupOpString + thisGroupString; }}}

              searchText += lineBreak + '<u>All Groups</u>' +
                  lineReturn + groupSearchText + lineBreak;

              // console.log('  resultsForGroup = ' + JSON.stringify(resultsForGroup));
              // console.log('  results = ' + JSON.stringify(Array.from(results)));

              var resultIDs = Array.from(results),
                  allAssertions = [],
                  allArguments = [];
              function doOneResult () {
                var result = resultIDs.pop();
                if (result != undefined) {
                  fetchFullClaimByChildID(query, result, function (results) {
                    allAssertions = allAssertions.concat(results.assertions);
                    allArguments = allArguments.concat(results.arguments);
                    doOneResult();
                  });
                }
                else {

                  // console.log('allAssertions = ' + JSON.stringify(allAssertions));
                  // console.log('allArguments = ' + JSON.stringify(allArguments));

                  // done with all groups
                  done();
                  callback({
                    assertions: allAssertions,
                    arguments: allArguments,
                    text: searchText,
                    query: queryObj
                  });

                }
              }
              doOneResult();

            }
          }
          handleGroup();
        }
      });
    },

    contribute: function (queryObj, userID, callback) {

      const isThisExpected = lineBreak + 'Is this what you expected? (If ' +
            'not, please carefully reread the text that you entered and ' +
            'confirm that it is exactly what you intended.)',
          perhapsYouMeant = lineBreak + 'Perhaps you meant one the following:',
          isThisCorrect = 'CORRECT?';

      if (queryObj == undefined) {
        callback(undefined); }
      connectToDatabase( function (query, done) {
        // TODO: refactor this query object traversal with search()
        var curGroup = 1,
            curGroupPrefix = function () { return 'g' + curGroup; },
            keys = Object.keys(queryObj),
            returnInfo = [],
            numCorrect = 0,
            pushIsThisCorrect = function (additionalInfo) {
              returnInfo.push(isThisCorrect + additionalInfo);
              numCorrect++; },
            // contribution bookkeeping
            numAssertions = 0,
            numPremises = 0,
            numConclusions = 0,
            numCitations = 0,
            premisesText = [],
            conclusionText = undefined,
            // content bookkeeping
            groupLocations = {},
            groupPropQueries = {},
            groupSolvedIDs = {},
            groupLogicalRequirements = {},
            groupLogicalDependencies = {},
            // citation bookkeeping
            citationID = undefined,
            authors = undefined,
            editors = undefined,
            title = undefined,
            publisher = undefined,
            year = undefined,
            volume = undefined,
            sourceType = undefined,
            // other high-level variables
            allPropSearchText = [];
        function handleGroup () {
          function nextGroup () {
            curGroup++;
            handleGroup(); }
          var curGroupKeys = [];
          keys.forEach( function (key) {
            if (inArr(key, curGroupPrefix())) {
              curGroupKeys.push(key); }});
          if (curGroupKeys.length > 0) {
            var groupTypeKey = curGroupPrefix() + 'in',
                groupType = parseInt(queryObj[groupTypeKey]);
            if (groupType == undefined || isNaN(groupType)) {
              returnInfo.push('ERROR: Group ' + curGroup + ' location missing.');
              pushIsThisCorrect('no');
              nextGroup();
            } else if (inArr(contentGroupLocations, groupType)) {
              // content search

              groupLocations[curGroup] = groupType;

              if (groupType == 1) {
                numAssertions++; }
              else if (groupType == 2) {
                numPremises++; }
              else if (groupType == 3) {
                numConclusions++; }

              parseGroup(queryObj, curGroupKeys,
                  curGroupPrefix, function (parseResults) {
                var propQueries = parseResults.propQueries;
                groupPropQueries[curGroup] = propQueries;

                var propKeys = Object.keys(propQueries);
                propKeys.reverse();
                function searchOneProp () {
                  var prop = propKeys.pop();
                  if (prop != undefined) {
                    var propID = parseInt(prop),
                        propSearchText = propQueries[propID],
                        formattedText = addOrs(propSearchText);
                    if (inArr(allPropSearchText, propSearchText)) {
                      searchOneProp();
                    } else {
                      allPropSearchText.push(propSearchText);
                      query('select distinct * from proposition p \
                          where p.proposition = $1', [propSearchText],
                          function (exactResults) {
                        query(searchPropositionsByString(1),
                            [formattedText], function (similarResults) {

                          var textToAdd = '"' + propSearchText + '"' + lineBreak;
                          if (exactResults.length == 1) {
                            textToAdd += 'There is 1 proposition in the ' +
                            'database that exactly matches this text.'; }
                          else { // exactResults.length == 0
                            textToAdd += 'There are 0 propositions in the ' +
                            'database that exactly match this text.'; }
                          textToAdd += isThisExpected;

                          if (similarResults.length > 0) {
                            textToAdd += perhapsYouMeant;
                            similarResults.forEach( function (result) {
                              textToAdd += lineReturn + result.proposition; });
                            returnInfo.push(textToAdd); }
                          else {
                            returnInfo.push(textToAdd); }

                          if (exactResults.length == 1) {
                            pushIsThisCorrect('oldProp'); }
                          else { // exactResults.length == 0
                            pushIsThisCorrect('newProp'); }

                          searchOneProp();
                        });
                      });
                    }
                  } else {
                    var parseLogicResults = parseLogic(parseResults),
                        groupAsLogicString = parseLogicResults[0],
                        queriesToString = parseLogicResults[1];
                    groupLogicalRequirements[curGroup] = parseLogicResults[2][0];
                    groupLogicalDependencies[curGroup] = parseLogicResults[2][1];
                    groupSolvedIDs[curGroup] = parseLogicResults[2][2];
                    var textToAdd = 'Group ' + curGroup + ' Overview' + 
                        lineBreak + 'Now it\'s time to evaluate the semantic ' +
                        'interpretation of this group. Please carefully read ' +
                        'the following propositional logic to confirm that it ' +
                        'correctly and exactly represents your query (ie, the ' +
                        'intended order of operations has been maintained, no ' +
                        'logical operators have been dropped because of ' +
                        'incorrect semantic grouping, etc).' + lineBreak;
                    var summaryString = createQuerySummaryString(
                        queriesToString, groupAsLogicString);
                    textToAdd += summaryString;
                    returnInfo.push(textToAdd);
                    pushIsThisCorrect('logic');

                    if (groupType == 2) {
                      premisesText.push(summaryString); }
                    else if (groupType == 3) {
                      conclusionText = summaryString; }

                    nextGroup();
                  }
                }
                searchOneProp();
              });
            } else if (inArr(fullCitationGroupLocations, groupType)) {

              numCitations++;

              var citationIsValid = true,
                  searchQuery = searchCitations(queryObj,
                      keys, curGroupPrefix, true);
              logAllQueries = true;
              query(searchQuery[0], searchQuery[1], function (exactResults) {
                logAllQueries = false;

                var queryInfo = searchQuery[2];
                authors = queryInfo.authors;
                editors = queryInfo.editors;
                title = queryInfo.title;
                publisher = queryInfo.publisher;
                year = queryInfo.year;
                volume = queryInfo.volume;
                sourceType = queryInfo.sourceType;
                var people = authors.concat(editors),
                    similarResults = '';
                people.reverse();

                function appendSimilarResults (similarThings, columnName) {
                  if (similarThings.length == 0) {
                    similarResults += lineReturn + 'no results'; }
                  else {
                    similarThings.forEach( function (similarThing) {
                      similarResults += lineReturn +
                          similarThing[columnName]; }); }}

                function doOnePerson () {
                  var person = people.pop();
                  if (person != undefined) {
                    var lastName = person.sn,
                        firstName = person.gn;
                    if (!isDefined(lastName)) {
                      citationIsValid = false;
                      similarResults += lineBreak + 
                          'All people require surnames!' }
                    function doOneName (name, columnName, callback) {
                      if (isDefined(name)) {
                        query('select distinct * from person p where p.' +
                            columnName +'_tsv @@ to_tsquery($1)',
                            [addOrs(name)], function (nameResults) {
                              similarResults += lineBreak +
                                  'names similar to "' + name + '": ';
                              appendSimilarResults(nameResults, columnName);
                              callback(); }); }
                      else { callback(); }}
                    doOneName(lastName, 'surname', function () {
                      doOneName(firstName, 'given_name_s', doOnePerson); }); }
                  else { // done with all people

                    var textToAdd = '',
                        thingToPush = undefined;
                    if (exactResults == undefined) {
                      pushIsThisCorrect('no');
                      textToAdd += 'ERROR: There was a problem searching the ' +
                          'database for matching citations. (Perhaps your year ' +
                          'field is not a number and thus the wrong type, or ' +
                          'there are invisible characters in text that you ' +
                          'copied and pasted from another source, etc?)';
                    } else if (!citationIsValid) {
                      pushIsThisCorrect('no');
                      textToAdd += 'ERROR: This citation is invalid.';
                    } else if (exactResults.length == 1) {
                      citationID = exactResults[0].id;
                      textToAdd += 'There is 1 citation in the database that ' +
                          'exactly matches your criteria. Please confirm that ' +
                          'this is the correct citation (as opposed to a different ' +
                          'citation than the one you intended, but which matched ' +
                          'anyways because your criteria are underspecified).';
                      // TODO NOW: get the full citation
                      thingToPush = 'oldCite';
                    } else {
                      textToAdd += 'There are ' + exactResults.length + ' ' + 
                          'citations in the database that match your criteria. ' +
                          'Do you want to create a new citation with these ' +
                          'specifications, or are your criteria underspecified ' +
                          '(ie, your title is correct but you left off one person ' +
                          'from the authors list of the actual citation, etc)?';
                      thingToPush = 'newCite';
                    }

                    textToAdd += perhapsYouMeant + similarResults;
                    returnInfo.push(textToAdd);
                    if (thingToPush != undefined) {
                      pushIsThisCorrect(thingToPush); }

                    nextGroup();

                  }
                }

                query('select distinct * from source s where s.title_tsv @@ ' +
                    'to_tsquery($1)', [addOrs(title)], function (titleResults) {
                  if (!isDefined(title)) {
                    citationIsValid = false;
                    similarResults += lineBreak + 'You have not specified ' +
                        'a title! Titles are required!' }
                  else {
                    similarResults += lineBreak +
                        'titles similar to "' + title + '": ';
                    appendSimilarResults(titleResults, 'title'); }

                  query('select distinct * from publisher p where ' +
                      'p.name_tsv @@ to_tsquery($1)', [addOrs(publisher)], 
                      function (publisherResults) {
                    if (!isDefined(publisher)) {
                      citationIsValid = false;
                      similarResults += lineBreak + 'You have not specified ' +
                          'a publisher! Publishers are required!' }
                    else {
                      similarResults += lineBreak +
                          'publishers similar to "' + publisher + '": ';
                      appendSimilarResults(publisherResults, 'name'); }

                    if (authors.length == 0) {
                      citationIsValid = false;
                      similarResults += lineBreak + 'You have not specified ' +
                          'any authors! Authors are required!' }
                    if (sourceType == 2 && editors.length == 0) {
                      citationIsValid = false;
                      similarResults += lineBreak + 'You have not specified any ' +
                          'editors! Editors are required for edited collections!' }
                    if (!isDefined(year)) {
                      citationIsValid = false;
                      similarResults += lineBreak + 'You have not specified ' +
                          'a year! A year is required!' }
                    if (sourceType == 3 && !isDefined(volume)) {
                      citationIsValid = false;
                      similarResults += lineBreak + 'You have not specified ' +
                          'a volume! A volume is required for periodicals!' }

                    doOnePerson();

                  });

                });

              });
            }
          } else { // done with all groups

            // data validation

            var informationIsValid = true,
                usingAssertions = numAssertions > 0,
                usingPremises = numPremises > 0,
                usingConclusions = numConclusions > 0;

            if (numCitations != 1) {
              informationIsValid = false;
              pushIsThisCorrect('no');
              returnInfo.push('ERROR: You must have exactly one citation.'); }
            
            if (!(usingAssertions || usingPremises || usingConclusions)) {
              informationIsValid = false;
              pushIsThisCorrect('no');
              returnInfo.push('ERROR: You have not submitted any content.'); }
            else if (usingAssertions && (usingPremises || usingConclusions)) {
              informationIsValid = false;
              pushIsThisCorrect('no');
              returnInfo.push('ERROR: You cannot contribute both assertions ' +
                  'and arguments (premises and conclusions) at the same time.'); }
            else if ((!usingAssertions) && (!(usingPremises
                && usingConclusions) || (numConclusions != 1))) {
              informationIsValid = false;
              pushIsThisCorrect('no');
              returnInfo.push('ERROR: All arguments must contain both ' +
                  'premises and exactly one conclusion.'); }
            else if (usingAssertions && (numAssertions > 1)) {
              informationIsValid = false;
              pushIsThisCorrect('no');
              returnInfo.push('ERROR: You may only submit ' +
                  'one assertion at a time.'); }

            // argument overview
            else if (!usingAssertions) {
              var textToAdd = 'Argument Overview' + lineBreak + 'Lastly, ' +
                  'it\'s time to evaluate the semantic interpretation of the ' +
                  'argument as a whole. Please ensure that the individual ' +
                  'assertions (which you have already checked and confirmed ' +
                  'above) have been correctly combined into an argument (ie, ' +
                  'correctly marked as premises vs conclusion, that the argument ' +
                  'ought not be further broken down into sub-arguments, etc).';
              premisesText.forEach( function (text) {
                textToAdd += lineBreak + 'PREMISE' + lineReturn + text; });
              textToAdd += lineBreak + 'CONCLUSION' + lineReturn + conclusionText;
              returnInfo.push(textToAdd);
              pushIsThisCorrect('logic'); }

            var confirmation = false,
                pageLow = parseInt(queryObj['pagelow']),
                pageHigh = parseInt(queryObj['pagehigh']);
            if (informationIsValid) {
              confirmation = true;
              // TODO: replace numCorrect with a list of confirmation types
              // (reuse the strings passed to pushIsThisCorrect, add values
              // to the web form for each one, make sure they match)
              for (var i = 1; i <= numCorrect; i++) {
                if (parseInt(queryObj['yes' + i]) != 1) {
                  confirmation = false; }}
              if (isNaN(pageLow) || isNaN(pageHigh)) {
                confirmation = false; }}

            // console.log(' ');
            // console.log('groupLocations = ' + JSON.stringify(groupLocations));
            // console.log('groupPropQueries = ' + JSON.stringify(groupPropQueries));
            // console.log('groupSolvedIDs = ' + JSON.stringify(groupSolvedIDs));
            // console.log('groupLogicalRequirements = ' + 
            //     JSON.stringify(groupLogicalRequirements));
            // console.log('groupLogicalDependencies = ' + 
            //     JSON.stringify(groupLogicalDependencies));
            // console.log('citationID = ' + JSON.stringify(citationID));
            // console.log('authors = ' + JSON.stringify(authors));
            // console.log('editors = ' + JSON.stringify(editors));
            // console.log('title = ' + JSON.stringify(title));
            // console.log('publisher = ' + JSON.stringify(publisher));
            // console.log('year = ' + JSON.stringify(year));
            // console.log('volume = ' + JSON.stringify(volume));
            // console.log('sourceType = ' + JSON.stringify(sourceType));
            // console.log('pageLow = ' + JSON.stringify(pageLow));
            // console.log('pageHigh = ' + JSON.stringify(pageHigh));
            // console.log(' ');

            if (!confirmation) {

              done();
              callback(returnInfo); }

            else {

              logAllQueries = true;

              function getOrInsert (getQuery, getParams, 
                  insertQuery, insertParams, callback) {
                query(getQuery, getParams, function (getResults) {
                  if (getResults && getResults.length == 1) {
                    callback(getResults[0].id, false); }
                  else { query(insertQuery, insertParams, 
                      function (insertResults) {
                    if (insertResults != undefined &&
                        insertResults[0] != undefined) {
                      callback(insertResults[0].id, true); }
                    else { callback(insertResults, true); }}); }}); }

              function getOrInsertCitation (citationCallback) {
                if (citationID != undefined) {
                  citationCallback(); }
                else {

                  function getOrInsertPerson (person, callback) {
                    var lastName = person.sn,
                        firstName = person.gn,
                        getQuery = 'select * from person p where p.surname = $1',
                        getParams = [lastName],
                        firstNameIsDefined = false;
                    if (isDefined(firstName)) {
                      firstNameIsDefined = true;
                      getQuery += ' and p.given_name_s = $2';
                      getParams.push(firstName); }
                    var insertQuery = 'insert into person values (default, $1, ' +
                        'default, ' + (firstNameIsDefined ? '$2' : 'null') + 
                        ', default, ' + 'null, ' + (firstNameIsDefined ? '$3' :
                        '$2') + ', \'now\') returning id;',
                        insertParams = [];
                    getParams.forEach( function (param) {
                      insertParams.push(param); });
                    insertParams.push(userID);
                    getOrInsert(getQuery, getParams, 
                        insertQuery, insertParams, callback); }

                  function doPeopleList (peopleList, callback) {
                    var newPeopleList = [];
                    function doOnePerson () {
                      var person = peopleList.pop();
                      if (person != undefined) {
                        getOrInsertPerson(person, function (personID) {
                          person.id = personID;
                          newPeopleList.push(person);
                          doOnePerson(); }); }
                      else {
                        newPeopleList.reverse();
                        query('insert into list_of_people values (default) ' +
                            'returning id', [], function (peopleListID) {
                          peopleListID = peopleListID[0].id;
                          var valuesToAdd = '',
                              valueParams = [],
                              valueIndex = 1,
                              listIndex = 1,
                              first = true;
                          newPeopleList.forEach( function (person) {
                            if (first) { first = false; }
                            else { valuesToAdd += ', '; }
                            valuesToAdd += '($' + (valueIndex++) + ', $' +
                                (valueIndex++) + ', $' + (valueIndex++) + ')';
                            valueParams.push(peopleListID);
                            valueParams.push(listIndex++);
                            valueParams.push(person.id); });
                          query('insert into list_of_people_element values ' + 
                              valuesToAdd, valueParams, function () {
                            callback(peopleListID); }); }); }}
                    doOnePerson(); }

                  doPeopleList(authors, function (authorsListID) {
                    doPeopleList(editors, function (editorsListID) {
                      // console.log('authorsListID = ' + JSON.stringify(authorsListID));
                      // console.log('editorsListID = ' + JSON.stringify(editorsListID));

                      function getOrInsertSource (callback) {
                        getOrInsert('select * from source s where s.type = $1 ' +
                            'and s.title = $2', [sourceType, title], 'insert ' +
                            'into source values (default, $1, $2, default, $3, ' +
                            '\'now\') returning id', [sourceType, title, userID],
                            function (sourceID, inserted) {
                          if (inserted) {
                            if (sourceType == 1) {
                              query('insert into monograph values ($1)',
                                  [sourceID], function () {
                                callback(sourceID); }); }
                            else if (sourceType == 2) {
                              query('insert into edited_collection values ($1, $2)',
                                  [sourceID, editorsListID], function () {
                                callback(sourceID); }); }
                            else if (sourceType == 3) {
                              query('insert into periodical values ($1, $2)',
                                  [sourceID, volume], function () {
                                callback(sourceID); }); }
                            else { /* TODO: error handling */ }}
                          else { callback(sourceID); }}); }

                      getOrInsertSource( function (sourceID) {
                        // console.log('sourceID = ' + JSON.stringify(sourceID));

                        getOrInsert('select * from publisher p where p.name = $1',
                            [publisher], 'insert into publisher values (default, ' +
                            '$1, default, $2, \'now\') returning id', [publisher,
                            userID], function (publisherID) {
                          // console.log('publisherID = ' + JSON.stringify(publisherID));

                          getOrInsert('select * from work w where w.source = $1 ' +
                              'and w.publisher = $2 and w.year = $3', [sourceID,
                              publisherID, year], 'insert into work values (' +
                              'default, $1, $2, $3, $4, $5, \'now\') ' +
                              'returning id', [authorsListID, year, sourceID,
                              publisherID, userID], function (workID) {
                            // console.log('workID = ' + JSON.stringify(workID));

                            getOrInsert('select * from citation c where c.work ' +
                                '= $1 and c.page_range_low = $2 and ' +
                                'c.page_range_high = $3', [workID, pageLow,
                                pageHigh], 'insert into citation values (' +
                                'default, $1, $2, $3, $4, \'now\') returning id',
                                [workID, pageLow, pageHigh, userID],
                                function (newCitationID) {

                              citationID = newCitationID;
                              citationCallback();

                            });
                          });
                        });
                      });
                    });
                  });
                }
              }

              getOrInsertCitation( function () {
                // console.log('citationID = ' + JSON.stringify(citationID));

                function newListOfMetadataTags (metadataCallback) {
                  query('insert into list_of_metadata_tags values (default) ' +
                      'returning id', [], function (listID) {
                    metadataCallback(listID[0].id); }); }

                var groups = Object.keys(groupLocations),
                    premises = [],
                    conclusion = -1;
                function doOneGroup () {
                  var group = groups.pop(),
                      lastAssertable = undefined;
                  if (group != undefined) {
                    // console.log('group = ' + JSON.stringify(group));
                    var assertables = groupSolvedIDs[group],
                        assertableToDBID = {},
                        propQueries = groupPropQueries[group],
                        requirements = groupLogicalRequirements[group],
                        dependencies = groupLogicalDependencies[group];
                    assertables.reverse();
                    function doOneAssertable () {
                      var assertable = assertables.pop();
                      if (assertable != undefined) {
                        lastAssertable = assertable;
                        // console.log('assertable = ' + JSON.stringify(assertable));
                        if (assertable in propQueries) {
                          var propText = propQueries[assertable];
                          getOrInsert('select distinct * from proposition p ' +
                              'where p.proposition = $1', [propText], 
                              'insert into assertable values ' +
                              '(default, 3, $1, \'now\') returning id',
                              [userID], function (assertableID, inserted) {
                            assertableToDBID[assertable] = assertableID;
                            if (inserted) {
                              newListOfMetadataTags( function (listID) {
                                query('insert into proposition values ($1, $2, ' +
                                    'default, $3)', [assertableID, propText,
                                    listID], function () {
                                  doOneAssertable();
                                });
                              });
                            } else {
                              doOneAssertable();
                            }
                          });
                        }
                        else if (assertable in requirements) {
                          var requirement = requirements[assertable],
                              op = requirement.op,
                              left = requirement.left,
                              leftID = assertableToDBID[left],
                              right = requirement.right,
                              rightID = assertableToDBID[right];
                          if (inArr(unaryOps, op)) {
                            var dbType = unaryToType[op];
                            getOrInsert('select distinct * from unary_assertable ' +
                                'u where u.type = $1 and u.assertable = $2',
                                [dbType, rightID], 'insert into assertable values ' +
                                '(default, 1, $1, \'now\') returning id',
                                [userID], function (assertableID, inserted) {
                              assertableToDBID[assertable] = assertableID;
                              if (inserted) {
                                query('insert into unary_assertable values ' +
                                    '($1, $2, $3)', [assertableID, dbType,
                                    rightID], function () {
                                  doOneAssertable();
                                });
                              }
                              else {
                                doOneAssertable();
                              }
                            });
                          }
                          else if (inArr(binaryOps, op)) {
                            var dbType = binaryToType[op];
                            getOrInsert('select distinct * from binary_assertable ' +
                                'b where b.type = $1 and b.assertable1 = $2 ' +
                                'and b.assertable2 = $3', [dbType, leftID, rightID],
                                'insert into assertable values ' +
                                '(default, 2, $1, \'now\') returning id',
                                [userID], function (assertableID, inserted) {
                              assertableToDBID[assertable] = assertableID;
                              if (inserted) {
                                query('insert into binary_assertable values ' +
                                    '($1, $2, $3, $4)', [assertableID, dbType,
                                    leftID, rightID], function () {
                                  doOneAssertable();
                                });
                              }
                              else {
                                doOneAssertable();
                              }
                            });
                          }
                          else {
                            // TODO: error handling
                          }
                        }
                        else if (assertable in dependencies) {
                          assertableToDBID[assertable] = 
                              assertableToDBID[dependencies[assertable].id];
                          doOneAssertable();
                        } else {
                          // TODO: error handling
                        }
                      }
                      else {
                        // console.log('assertableToDBID = ' + JSON.stringify(assertableToDBID));
                        var location = groupLocations[group],
                            lastAssertableID = assertableToDBID[lastAssertable];
                        if (location == 1) {
                          getOrInsert('select distinct * from claim c, assertion ' +
                              'a where c.citation = $1 and a.assertable = $2 and ' +
                              'a.id = c.id', [citationID, lastAssertableID],
                              'insert into claim values (default, 1, $1, 5, ' +
                              'true, $2, \'now\') returning id', [citationID,
                              userID], function (claimID, inserted) {
                            if (inserted) {
                              query('insert into assertion values ($1, $2)',
                                  [claimID, lastAssertableID], function () {
                                doOneGroup();
                              });
                            } else {
                              doOneGroup();
                            }
                          });
                        }
                        else if (location == 2) {
                          premises.push(lastAssertableID);
                          doOneGroup();
                        }
                        else if (location == 3) {
                          conclusion = lastAssertableID;
                          doOneGroup();
                        } else {
                          // TODO: error handling
                        }
                      }
                    }
                    doOneAssertable();
                  }
                  else {
                    if (conclusion == -1) {
                      // done!
                      logAllQueries = false;
                      callback('success');
                    } else {
                      // TODO: search for existing arguments
                      // TODO: similarly, search through existing list_of_X
                      // entries throughout this entire file (authors, etc)
                      query('insert into claim values (default, 2, $1, 5, ' +
                          'true, $2, \'now\') returning id', [citationID,
                          userID], function (claimID) {
                        claimID = claimID[0].id;
                        query('insert into list_of_assertables values ' +
                            '(default) returning id', [], function (listID) {
                          listID = listID[0].id;
                          var premiseNum = 1;
                          function doOnePremise () {
                            var premise = premises.pop();
                            if (premise != undefined) {
                              query('insert into list_of_assertables_element ' +
                                  'values ($1, $2, $3)', [listID, premiseNum++,
                                  premise], function () {
                                doOnePremise();
                              });
                            }
                            else {
                              newListOfMetadataTags( function (tagsID) {
                                query('insert into argument values ($1, $2, $3, $4)',
                                    [claimID, conclusion, listID, tagsID],
                                    function () {
                                  // done!
                                  logAllQueries = false;
                                  callback('success');
                                });
                              });
                            }
                          }
                          doOnePremise();
                        });
                      });
                    }
                  }
                }
                doOneGroup();
              });
            }
          }
        }
        handleGroup();
      });
    }

}};
