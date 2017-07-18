
/* helper functions for constants section */

function invert (object) {
  var inversion = {};
  for (var key in object) {
    inversion[object[key]] = key; }
  return inversion; }



/* constants / definitions */

var logAllQueries = false;

const // assertable types
      UNARY = 1,
      BINARY = 2,
      PROPOSITION = 3,
      ATTRIBUTION = 4,
      // claim types
      ASSERTION = 1,
      ARGUMENT = 2,
      // unary types
      unaryTypeToWord = {
        2: 'not',
        3: 'possibly',
        4: 'necessarily'},
      unaryWordToType = invert(unaryTypeToWord),
      // binary types
      IMPLICATION = 3,
      binaryTypeToWord = {
        1: 'and',
        2: 'or',
        3: 'implies',
        4: 'if and only if',
        5: 'is identical to'},
      binaryWordToType = invert(binaryTypeToWord),
      // html form elements
      OPEN_PAREN = 1,
      CLOSE_PAREN = 1,
      unaryFormOps = [2, 3, 4],
      binaryFormOps = [5, 6, 7, 8, 9],
      unaryFormToJsonType = {2: 2, 3: 4, 4: 3},
      binaryFormToJsonType = {5: 1, 6: 2, 7: 3, 8: 4, 9: 5},
      contentGroupLocations = [1, 2, 3],
      basicCitationGroupLocations = [4, 5, 6, 7],
      fullCitationGroupLocations = [8],
      // json format structure keys
      groupConnectives = ['group and', 'group or', 'group not'],
      groupTypes = ['assertion', 'premise', 'conclusion'];
      unaryTypes = Object.keys(unaryWordToType),
      binaryTypes = Object.keys(binaryWordToType),
      propositionType = 'proposition',
      fullCitationType = 'full citation';

// TODO: if we wanted to be really hardcore we could create a meta-database
// format (in js) that could be just through a (js) script that compiles the
// format definition into psql code to initialize the databases (ie, generate
// the code that is currently housed in the schema-data.sql file, etc)



/* other helper functions */

function noResults (results) {
  return (results == undefined) || (results.length == 0);
}

function empty (result) {
  return (result == undefined) || (result == '');
}

function extractData (list, attributeName) {
  var resultList = [];
  while (!noResults(list)) {
    resultList.push(list.pop()[attributeName]);
  }
  return resultList;
}

function extractIDs (list) {
  return extractData(list, 'id');
}

function sanitize (text) {
  if (text == undefined) {
    return undefined;
  } else {
    var textOld = text.trim().replace('\t', ' ');
    while (true) {
      var textNew = textOld.replace('  ', ' ');
      if (textNew == textOld) {
        return textNew;
      } else {
        textOld = textNew;
      }
    }
  }
}

// like PSQL's plainto_tsquery() but with ORs instead of ANDs
function addOrs (queryText) {
  if (queryText == undefined) {
    return undefined;
  } else {
    return sanitize(queryText).replace(/\s/g, ' | ');
  }
}

// simple <element in array> operator
function inArr (array, element) {
  return array.indexOf(element) != -1;
}



/* fetch functions (retrieve records by their id's) */

function _fetchList (query, listTableName, listItemName, listID, callback) {

  query('select distinct * from ' + listTableName + ' where list = $1',
      [listID], function (listResults) {

    if (noResults(listResults)) {
      callback(undefined);
    } else {

      callback(extractData(listResults, listItemName));
    }
  });
}

function fetchListOfAssertables (query, listID, callback) {
  _fetchList(query, 'list_of_assertables_element',
      'assertable', listID, callback);
}

function fetchListOfThings (query, fetchFunction, listOfIDs, callback) {

  if (noResults(listOfIDs)) {
    callback(undefined);
  } else {

    var curResults = [];

    function fetchListOfThingsHelper () {

      if (noResults(listOfIDs)) {
        callback(curResults);
      } else {

        var curID = listOfIDs.pop();

        fetchFunction(query, curID, function (curResult) {

          if (noResults(curResult)) {
            callback(undefined);
          } else {

            curResults.push(curResult);

            fetchListOfThingsHelper();
          }
        });
      }
    }

    fetchListOfThingsHelper();
  }
}

function _fetchSimple (query, thingID, callback,
    tableName, itemName, nameColumn) {

  query('select distinct * from '+tableName+' '+itemName+' where '+
      itemName+'.id = $1', [thingID], function (results) {

    if (noResults(results)) {
      callback(undefined);
    } else {

      callback(results[0][nameColumn]);
    }
  });
}

function fetchTitle (query, titleID, callback) {
  _fetchSimple(query, titleID, callback, 'source', 's', 'title');
}

function fetchPublisher (query, publisherID, callback) {
  _fetchSimple(query, publisherID, callback, 'publisher', 'p', 'name');
}

function fetchProposition (query, propositionID, callback) {
  _fetchSimple(query, propositionID, callback,
      'proposition', 'p', 'proposition');
}

function fetchPerson (query, personID, callback) {
  // TODO: refactor with _fetchSimple() ?

  query('select distinct * from person p where '+
      'p.id = $1', [personID], function (results) {

    if (noResults(results)) {
      callback(undefined);
    } else {

      var result = results[0];
      callback(result['surname'] + ', ' + result['given_name_s']);
    }
  });
}

function fetchAssertable (query, assertableID, callback) {

  query('select distinct * from assertable a where a.id = $1',
      [assertableID], function (assertableResults) {

    if (noResults(assertableResults)) {
      callback(undefined);
    } else {

      var assertableResult = assertableResults[0],
          assertableType = assertableResult.type,
          assertableJSON = {'id': assertableID};

      if (assertableType == PROPOSITION) {

        query('select distinct * from proposition p where p.id = $1',
            [assertableID], function (propositionResults) {

          if (noResults(propositionResults)) {
            callback(undefined);
          } else {

            var propositionResult = propositionResults[0],
                proposition = propositionResult.proposition;

            assertableJSON.proposition = proposition;
            callback(assertableJSON);
          }
        });

      } else if (assertableType == UNARY) {

        query('select distinct * from unary_assertable u where u.id = $1',
            [assertableID], function (unaryResults) {

          if (noResults(unaryResults)) {
            callback(undefined);
          } else {

            var unaryResult = unaryResults[0],
                unaryType = unaryResult.type,
                unaryAssertableID = unaryResult.assertable;

            fetchAssertable(query, unaryAssertableID,
                function (unaryAssertableJSON) {

              assertableJSON[unaryTypeToWord[unaryType]] = unaryAssertableJSON;
              callback(assertableJSON);
            });
          }
        });

      } else if (assertableType == BINARY) {

        query('select distinct * from binary_assertable b where b.id = $1',
            [assertableID], function (binaryResults) {

          if (noResults(binaryResults)) {
            callback(undefined);
          } else {

            var binaryResult = binaryResults[0],
                binaryType = binaryResult.type,
                binaryAssertableID1 = binaryResult.assertable1,
                binaryAssertableID2 = binaryResult.assertable2;

            fetchAssertable(query, binaryAssertableID1,
                function (binaryAssertableJSON1) {
              fetchAssertable(query, binaryAssertableID2,
                  function (binaryAssertableJSON2) {

                assertableJSON[binaryTypeToWord[binaryType]] =
                    [binaryAssertableJSON1, binaryAssertableJSON2];
                callback(assertableJSON);
              });
            });
          }
        });

      } else if (assertableType == ATTRIBUTION) {
        callback(undefined); // TODO

      } else {
        callback(undefined);
      }
    }
  });
}

function fetchCitation (query, claimID, callback) {
  callback(undefined); // TODO
}

function fetchClaim (query, claimID, callback) {

  query('select distinct * from claim c where c.id = $1',
      [claimID], function (claimResults) {

    if (noResults(claimResults)) {
      callback(undefined);
    } else {

      var claimResult = claimResults[0],
          claimType = claimResult.type,
          citationID = claimResult.citation,
          visible = claimResult.visible_in_search_results,
          claimJSON = {'id': claimID, 'visible': visible};

      fetchCitation(query, citationID, function (citationJSON) {

        claimJSON.citation = citationJSON;

        if (claimType == ASSERTION) {

          query('select distinct * from assertion a where a.id = $1',
              [claimID], function (assertionResults) {

            if (noResults(assertionResults)) {
              callback(undefined);
            } else {

              var assertionResult = assertionResults[0],
                  assertableID = assertionResult.assertable;

              fetchAssertable(query, assertableID,
                  function (assertableJSON) {

                claimJSON.asserts = assertableJSON;
                callback(claimJSON);
              });
            }
          });

        } else if (claimType == ARGUMENT) {

          query('select distinct * from argument a where a.id = $1',
              [claimID], function (argumentResults) {

            if (noResults(argumentResults)) {
              callback(undefined);
            } else {

              var argumentResult = argumentResults[0],
                  conclusionID = argumentResult.conclusion,
                  premisesListID = argumentResult.premises;

              fetchAssertable(query, conclusionID,
                  function (conclusionJSON) {
                fetchListOfAssertables(query, premisesListID,
                    function (premisesIDs) {
                  fetchListOfThings(query, fetchAssertable,
                      premisesIDs, function (premisesJSON) {

                    claimJSON.premises = premisesJSON;
                    claimJSON.conclusion = conclusionJSON;
                    callback(claimJSON);
                  });
                });

              });
            }
          });

        } else {
          callback(undefined);
        }
      });
    }
  });
}



/* search functions (retrieve records by their similarity to given data) */

// accepts string of a proposition, returns a list of ids
function searchProposition (query, searchString, callback) {

  query('select distinct * from proposition p where ' +
      'p.proposition_tsv @@ to_tsquery(\'english\', $1)',
      [addOrs(searchString)], function (results) {

    if (noResults(results)) {
      callback(undefined);
    } else {

      callback(extractIDs(results));
    }
  });
}

// accepts json of an assertable, returns a list of ids
function searchAssertable (query, assertableJSON, callback) {

  if (noResults(assertableJSON)) {
    callback(undefined);
  } else {

    if ('proposition' in assertableJSON) {
      searchProposition(query, assertableJSON.proposition, callback);

    } else {

      var foundSomething = false;

      for (var word in unaryWordToType) {
        if (word in assertableJSON && !foundSomething) {
          foundSomething = true;

          var type = unaryWordToType[word],
              json = assertableJSON[word];

          searchAssertable(query, json, function (results1) {
                
            var queryText = 'select distinct * ' +
                'from unary_assertable u where ',
                params = [];
            if (!noResults(results1)) {
              params.push(results1);
              queryText += '$' + params.length +
                  ' && u.dependencies and ';
            }
            params.push(type);
            queryText += '$' + params.length + ' = u.type';
          
            query(queryText, params, function (results2) {

              if (noResults(results2)) {
                callback(undefined);
              } else {
                
                callback(extractIDs(results2));
              }
            });
          });
        }
      }

      for (var word in binaryWordToType) {
        if (word in assertableJSON && !foundSomething) {
          foundSomething = true;

          var type = binaryWordToType[word],
              jsonList = assertableJSON[word];

          if (jsonList.length != 2) {
            callback(undefined);
          } else {

            searchAssertable(query, jsonList[0], function (results1) {
              searchAssertable(query, jsonList[1], function (results2) {

                var list1 = [], list2 = [];

                if (!noResults(results1)) {
                  for (var i = 0; i < results1.length; i++) {
                    var element = results1[i];
                    if (!inArr(list1, element)) {
                      list1.push(element);
                    }
                    if (type != IMPLICATION && !inArr(list2, element)) {
                      list2.push(element);
                    }
                  }
                }

                if (!noResults(results2)) {
                  for (var i = 0; i < results2.length; i++) {
                    var element = results2[i];
                    if (!inArr(list2, element)) {
                      list2.push(element);
                    }
                    if (type != IMPLICATION && !inArr(list1, element)) {
                      list1.push(element);
                    }
                  }
                }
              
                var queryText = 'select distinct * ' +
                    'from binary_assertable b where ',
                    params = [];
                if (!noResults(list1)) {
                  params.push(list1);
                  queryText += '$' + params.length +
                      ' && b.dependencies1 and ';
                }
                if (!noResults(list2)) {
                  params.push(list2);
                  queryText += '$' + params.length +
                      ' && b.dependencies2 and ';
                }
                params.push(type);
                queryText += '$' + params.length + ' = b.type';

                query(queryText, params, function (results3) {

                  if (noResults(results3)) {
                    callback(undefined);
                  } else {
                    
                    callback(extractIDs(results3));
                  }
                });
              });
            });
          }
        }
      }

      if (!foundSomething) {
        callback(undefined);
      }
    }
  }
}

// TODO: actual searching
// function searchJson (query, json, callback1) {

//   // TODO: factor this out with the other traverse() function?
//   function traverse (something, callback2) {

//     var key = Object.keys(something)[0];

//     if (inArr(groupConnectives, key)) {
//       traverse(something[key][0], function (results1) {
//         traverse(something[key][1], function (results2) {
//           // TODO: combine the group results
//           callback2(results1.concat(results2));
//         });
//       });

//     } else if (inArr(groupTypes, key)) {
//       searchAssertable(query, something[key], callback2);

//     } else { // full citation
//       // TODO: handle the citation information
//     }

//     traverse(json, callback1);
// }



/* search similar exact functions (retrieve records by (1) their
   similarity to and (2) their exact matching with given data) */

// TODO: split these up into two functions, searchSimilar() and
// searchExact(), so that the contribution's insert() function
// only has to call the exact version to avoid duplicated code

// TODO: make the exact version of these functions return one thing
// (instead of a list of things of exactly length one)

// returns two id lists (similar and exact)
function _searchSimilarExact (query, searchString, callback,
    tableName, itemName, tsvColumn, nameColumn) {

  query('select distinct * from '+tableName+' '+itemName+' where ' +
      itemName+'.'+tsvColumn+' @@ to_tsquery(\'english\', $1)',
      [addOrs(searchString)], function (similarResults) {

    var returnSimilarResults;
    if (noResults(similarResults)) {
      returnSimilarResults = undefined;
    } else {
      returnSimilarResults = extractIDs(similarResults);
    }

    query('select distinct * from '+tableName+' '+itemName+
        ' where '+itemName+'.'+nameColumn+' = $1',
        [searchString], function (exactResults) {

      var returnExactResults;
      if (noResults(exactResults)) {
        returnExactResults = undefined;
      } else {
        returnExactResults = extractIDs(exactResults);
      }

      callback(returnSimilarResults, returnExactResults);
    });
  });
}

// accepts string of a proposition, returns two id lists (similar and exact)
function searchPropositionSimilarExact (query, searchArguments, callback) {
  // TODO: refactor with searchProposition() ?
  if (searchArguments.length != 1) {
    callback(undefined, undefined);
  } else {
    _searchSimilarExact(query, searchArguments[0], callback,
        'proposition', 'p', 'proposition_tsv', 'proposition');
  }
}

// accepts string of a title, returns two id lists (similar and exact)
function searchTitleSimilarExact (query, searchArguments, callback) {
  if (searchArguments.length != 1) {
    callback(undefined, undefined);
  } else {
    _searchSimilarExact(query, searchArguments[0], callback,
        'source', 's', 'title_tsv', 'title');
  }
}

// accepts string of a publisher, returns two id lists (similar and exact)
function searchPublisherSimilarExact (query, searchArguments, callback) {
  if (searchArguments.length != 1) {
    callback(undefined, undefined);
  } else {
    _searchSimilarExact(query, searchArguments[0], callback,
        'publisher', 'p', 'name_tsv', 'name');
  }
}

// accepts strings of a person's name, returns two id lists (similar and exact)
function searchPersonSimilarExact (query, searchArguments, callback) {
  // TODO: refactor with _searchSimilarExact() ?

  if (searchArguments.length != 2) {
    callback(undefined, undefined);
  } else {

    var firstName = searchArguments[0],
        lastName = searchArguments[1];

    query('select distinct * from person p where ' +
        'p.given_name_s_tsv @@ to_tsquery(\'english\', $1) ' +
        'or p.surname_tsv @@ to_tsquery(\'english\', $2)',
        [addOrs(firstName), addOrs(lastName)], function (similarResults) {

      var returnSimilarResults;
      if (noResults(similarResults)) {
        returnSimilarResults = undefined;
      } else {
        returnSimilarResults = extractIDs(similarResults);
      }

      var newQueryString, newArguments;
      if (empty(firstName)) {
        newQueryString = 'p.given_name_s is null and p.surname = $1';
        newArguments = [lastName];
      } else {
        newQueryString = 'p.given_name_s = $1 and p.surname = $2';
        newArguments = [firstName, lastName];
      }

      query('select distinct * from person p where ' +
          newQueryString, newArguments, function (exactResults) {

        var returnExactResults;
        if (noResults(exactResults)) {
          returnExactResults = undefined;
        } else {
          returnExactResults = extractIDs(exactResults);
        }

        callback(returnSimilarResults, returnExactResults);
      });
    });
  }
}



/* search similar functions (retrieve records by their similarity 
   to lists of given data; mainly for use during contribution) */

// returns list of comments on similarity of propositions in json
function searchForSimilar (query, listOfPropositions, citation, callback) {

  if (noResults(listOfPropositions)) {
    callback(undefined);
  } else {

    var commentsOnPropositions = [],
        commentsOnCitationPeople = [],
        commentsOnCitationOther = [],
        citationKeys = Object.keys(citation);

    function getSimilarTo () {

      function searchSimple (searchFunction, fetchFunction,
          searchArguments, typeString, whichComments) {

        searchFunction(query, searchArguments,
            function (similarIDs, exactIDs) {

          if ((!noResults(similarIDs))&&(!noResults(exactIDs))) {
            var exactID = exactIDs[0];
            for (var i = 0; i < similarIDs.length; i++) {
              if (similarIDs[i] == exactID) {
                similarIDs.splice(i, 1);
                break;
              }
            }
          }

          fetchListOfThings(query, fetchFunction,
              similarIDs, function (similarResults) {
            fetchListOfThings(query, fetchFunction,
                exactIDs, function (exactResults) {

              function flattenArguments (arguments) {
                var result = '',
                    first = true;
                arguments.reverse();
                arguments.forEach( function (argument) {
                  if (first) {
                    first = false;
                  } else {
                    result += ', ';
                  }
                  result += argument;
                });
                return result;
              }

              var exactResult = undefined;
              if (!noResults(exactResults)) {
                exactResult = exactResults[0];
              }

              whichComments.push({
                'type': typeString,
                'quote': flattenArguments(searchArguments),
                'similar': similarResults,
                'exact': exactResult
              });

              getSimilarTo();
            });
          });
        });
      }

      if (listOfPropositions.length > 0) {

        searchSimple(searchPropositionSimilarExact, fetchProposition,
            [listOfPropositions.pop()], 'proposition', commentsOnPropositions);

      } else {

        if (citationKeys.length > 0) {

          var key = citationKeys.pop();

          if (key.includes('title')) {

            searchSimple(searchTitleSimilarExact, fetchTitle,
                [citation[key]], 'title', commentsOnCitationOther);

          } else if (key.includes('publisher')) {

            searchSimple(searchPublisherSimilarExact, fetchPublisher,
                [citation[key]], 'publisher', commentsOnCitationOther);

          } else if (key.includes('name')) {

            var firstName, lastName, otherKey;
            if (key.includes('given ')) {
              firstName = key;
              lastName = key.replace('given ', 'sur');
              otherKey = lastName;
            } else { // key.includes('sur')
              firstName = key.replace('sur', 'given ');
              lastName = key;
              otherKey = firstName;
            }

            var otherKeyIndex = citationKeys.indexOf(otherKey);
            if (otherKeyIndex != -1) {
              citationKeys.splice(otherKeyIndex, 1);
            }

            searchSimple(searchPersonSimilarExact, fetchPerson,
                [citation[firstName], citation[lastName]],
                'person', commentsOnCitationPeople);

          } else { // skip this key
            getSimilarTo();
          }

        } else { // done!
          commentsOnPropositions.reverse();
          callback(commentsOnPropositions.concat(
              commentsOnCitationOther, commentsOnCitationPeople));
        }
      }
    }

    getSimilarTo(); // start the process
  }
}



/* translation functions */

const EXPECTING = 1,
      SOMETHING = 2;

// this function operates like a Finite State Machine when parsing the input
//   form data. there are additional operations occurring in this function,
//   obviously, especially with regard to keeping track of the result of the
//   translation throughout the parse, etc, however such book-keeping is
//   relativity straightforward compared to the FSM, explained herein
// definitions:
//   states:
//     E = expecting additional input
//     S = something already parsed
//     ? = error (ie, terminate)
//   transitions:
//     R = row / proposition
//     U = unary operator
//     B = binary operator
//     ( = open parenthesis
//     ) = close parenthesis
// state transition matrix:
//     E S
//   R S ?
//   U E ?
//   B ? E
//   ( E ?
//   ) ? S

function htmlFormToJson (queryObject, callback) {

  if (noResults(queryObject)) {
    callback(undefined);
  } else {

    var keys = Object.keys(queryObject),
        errorMessages = [],
        listOfPropositions = [],
        listOfFullCitations = [],
        json = {};

    // handle one group at a time

    var curGroup = 0;
    function curGroupPrefix () {
      return 'g' + curGroup;
    }

    while (true) {

      curGroup++;

      var curGroupKeys = [];
      keys.forEach( function (key) {
        if (inArr(key, curGroupPrefix())) {
          curGroupKeys.push(key);
        }
      });

      if (curGroupKeys.length > 0) {

        var curGroupJson = undefined,
            curGroupIsValid = true,
            groupLocationKey = curGroupPrefix() + 'in',
            groupLocation = parseInt(queryObject[groupLocationKey]),
            groupLocationIsValid = true,
            groupLocationWrapper = '';

        if (groupLocation == undefined || isNaN(groupLocation)) {

          groupLocationIsValid = false;

        } else if (inArr(contentGroupLocations, groupLocation)) {

          if (groupLocation == 1) {
            groupLocationWrapper = 'assertion';
          } else if (groupLocation == 2) {
            groupLocationWrapper = 'premise';
          } else if (groupLocation == 3) {
            groupLocationWrapper = 'conclusion';
          }

          // see FSM explanation above
          var state = EXPECTING,
              curGroupJsonStack = [],
              curRowOperators = [],
              curRowOperatorsStack = [];

          // handle one row in this group at a time

          var curRow = 0;
          function curRowPrefix () {
            return curGroupPrefix() + 'r' + curRow;
          }

          while (true) {

            curRow++;

            var curRowKeys = [];
            keys.forEach( function (key) {
              if (inArr(key, curRowPrefix())) {
                curRowKeys.push(key);
              }
            });

            if (curRowKeys.length > 0) {

              // handle one before in this row at a time

              var curBefore = 0;
              function curBeforePrefix () {
                return curRowPrefix() + 'b' + curBefore;
              }

              while (true) {

                curBefore++;

                if (inArr(keys, curBeforePrefix())) {

                  var before = parseInt(queryObject[curBeforePrefix()]);
                  
                  if (before == OPEN_PAREN) {

                    if (state == EXPECTING) {

                      curGroupJsonStack.push(curGroupJson);
                      curGroupJson = undefined;

                      curRowOperatorsStack.push(curRowOperators);
                      curRowOperators = [];

                    } else { // state == SOMETHING

                      errorMessages.push('ERROR: Group ' + curGroup +
                          ': Row ' + curRow + ': Unexpectedly ' +
                          'encountered an open parenthesis.');
                      curGroupIsValid = false;
                      break;
                    }

                  } else if (inArr(unaryFormOps, before)) {

                    var word = unaryTypeToWord[unaryFormToJsonType[before]];

                    if (state == EXPECTING) {

                      curRowOperators.push(['unary', word]);

                    } else { // state == SOMETHING

                      errorMessages.push('ERROR: Group ' + curGroup +
                          ': Row ' + curRow + ': Unexpectedly encountered ' +
                          'the unary operator "' + word + '".');
                      curGroupIsValid = false;
                      break;
                    }

                  } else if (inArr(binaryFormOps, before)) {

                    var word = binaryTypeToWord[binaryFormToJsonType[before]];

                    if (state == SOMETHING) {

                      state = EXPECTING;
                      curRowOperators.push(['binary', word]);

                    } else { // state == EXPECTING

                      errorMessages.push('ERROR: Group ' + curGroup +
                          ': Row ' + curRow + ': Unexpectedly encountered ' +
                          'the binary operator "' + word + '".');
                      curGroupIsValid = false;
                      break;
                    }
                  }

                } else { // done with all befores in this row
                  break;
                }
              }

              if (!curGroupIsValid) {
                break;
              }

              // handle the row itself

              var curRowJson = undefined;
              if (inArr(keys, curRowPrefix())) {
                var newProposition = sanitize(queryObject[curRowPrefix()]);
                listOfPropositions.push(newProposition);
                curRowJson = {'proposition': newProposition};
              }

              function handleAllPrevOperators () {

                while (curRowOperators.length > 0) {

                  var curRowOperator = curRowOperators.pop();

                  if (curRowOperator[0] == 'unary') {

                    var newRowJson = {};
                    newRowJson[curRowOperator[1]] = curRowJson;
                    curRowJson = newRowJson;

                  } else { // curRowOperator[0] == 'binary'

                    var newRowJson = {};
                    newRowJson[curRowOperator[1]] = [curGroupJson, curRowJson];
                    curRowJson = newRowJson;
                  }
                }

              }

              if (state == EXPECTING) {

                state = SOMETHING;

                handleAllPrevOperators();
                curGroupJson = curRowJson;

              } else { // state == SOMETHING

                errorMessages.push('ERROR: Group ' + curGroup + ': Row ' +
                    curRow + ': Unexpectedly encountered this proposition.');
                break;
              }

              // handle one after in this row at a time

              var curAfter = 0;
              function curAfterPrefix () {
                return curRowPrefix() + 'a' + curAfter;
              }

              while (true) {

                curAfter++;

                if (inArr(keys, curAfterPrefix())) {

                  var after = parseInt(queryObject[curAfterPrefix()]);
                  
                  if (after == CLOSE_PAREN) {

                    if (state == SOMETHING &&
                        curGroupJsonStack.length > 0 &&
                        curRowOperatorsStack.length > 0) {

                      curRowJson = curGroupJson;
                      curGroupJson = curGroupJsonStack.pop();
                      curRowOperators = curRowOperatorsStack.pop();

                      handleAllPrevOperators();
                      curGroupJson = curRowJson;

                    } else {

                      errorMessages.push('ERROR: Group ' + curGroup +
                          ': Row ' + curRow + ': Unexpectedly ' +
                          'encountered a close parenthesis.');
                      curGroupIsValid = false;
                      break;
                    }
                  }

                } else { // done with all afters in this row
                  break;
                }
              }

              if (!curGroupIsValid) {
                break;
              }

            } else { // done with all rows in this group
              break;
            }
          }

        } else if (inArr(basicCitationGroupLocations, groupLocation)) {

          groupLocationWrapper = 'basic citation';

          // handle the one-off information

          var citationType = '';
          if (groupLocation == 4) {
            citationType = 'anywhere';
          } else if (groupLocation == 5) {
            citationType = 'author';
          } else if (groupLocation == 6) {
            citationType = 'title';
          } else if (groupLocation == 7) {
            citationType = 'year';
          }

          var newJson = {},
              citationKey = curGroupPrefix() + 'r1';
          if (inArr(keys, citationKey)) {
            var value = sanitize(queryObject[citationKey]);
            if (value != '') {
              newJson[citationType] = value;
            } else {
              errorMessages.push('ERROR: Group ' + curGroup +
                  ': This basic citation group is empty.');
              curGroupIsValid = false;
            }
          } else {
            newJson = undefined;
          }

          curGroupJson = newJson;

        } else if (inArr(fullCitationGroupLocations, groupLocation)) {

          groupLocationWrapper = 'full citation';
          curGroupJson = {};

          // handle all the people

          var key = '',
              value = '',
              personID = 0;

          while (true) {

            personID++;

            var foundSomething = false;

            function doOnePerson (htmlKeyString, jsonString1, jsonString2) {
              var key = curGroupPrefix() + htmlKeyString + 'n' + personID;
              if (inArr(keys, key)) {
                value = sanitize(queryObject[key]);
                if (value != '') {
                  key = jsonString1 + ' ' + personID + ' ' + jsonString2;
                  curGroupJson[key] = value;
                }
                foundSomething = true;
              }
            }

            doOnePerson('ag', 'author', 'given name');
            doOnePerson('as', 'author', 'surname');
            doOnePerson('eg', 'editor', 'given name');
            doOnePerson('es', 'editor', 'surname');

            if (!foundSomething) {
              break;
            }

          }

          // handle the one-off information

          function doOneKey (htmlKey, jsonKey) {

            if (jsonKey == undefined) {
              jsonKey = htmlKey;
            }

            key = curGroupPrefix() + htmlKey;
            if (inArr(keys, key)) {
              value = sanitize(queryObject[key]);
              if (value != '') {
                curGroupJson[jsonKey] = value;
              }
            }

          }

          doOneKey('title');
          doOneKey('publisher');
          doOneKey('year');
          doOneKey('volume');

          key = curGroupPrefix() + 'source';
          var missingCitationSource = false;
          if (inArr(keys, key)) {

            var citationSourceString = '',
                citationSourceInt = parseInt(queryObject[key]);
            if (citationSourceInt == 1) {
              citationSourceString = 'monograph';
            } else if (citationSourceInt == 2) {
              citationSourceString = 'edited collection';
            } else if (citationSourceInt == 3) {
              citationSourceString = 'periodical';
            } else {
              missingCitationSource = true;
            }

            curGroupJson['source type'] = citationSourceString;

          } else {
            missingCitationSource = true;
          }

          if (missingCitationSource) {
            curGroupIsValid = false;
          }

          listOfFullCitations.push(curGroupJson);

        } else {

          groupLocationIsValid = false;

        }

        // handle the group location

        if (!groupLocationIsValid || groupLocationWrapper == '') {
          errorMessages.push('ERROR: Group ' + curGroup +
              ': No group location specified.');
          curGroupIsValid = false;
        }

        var newJson = {};
        newJson[groupLocationWrapper] = curGroupJson;
        curGroupJson = newJson;

        // handle the group connective

        var curGroupAnd = curGroupPrefix() + 'and',
            groupConnective = parseInt(queryObject[curGroupAnd]);

        var connectiveWrapper = '';
        if (groupConnective == 1 || groupConnective == 4) {
          connectiveWrapper = 'group and';
        } else if (groupConnective == 2 || groupConnective == 5) {
          connectiveWrapper = 'group or';
        } else if (groupConnective == 3 || groupConnective == 6) {
          connectiveWrapper = 'group not';
        }

        if (connectiveWrapper == '') {
          if (isNaN(groupConnective) && curGroup == 1) {
            // this is fine (group 1 does not have a connective)
          } else {
            errorMessages.push('ERROR: Group ' + curGroup +
                ': No group connective specified.');
            curGroupIsValid = false;
          }
        } else {
          var newJson = {};
          newJson[connectiveWrapper] = [json, curGroupJson];
          curGroupJson = newJson;
        }

        // lastly, add this group's json to the running total

        if (curGroupIsValid) {
          json = curGroupJson;
        }

      } else { // done with all groups
        break;
      }
    }

    callback(json, errorMessages, listOfPropositions, listOfFullCitations);
  }
}



/* other miscellaneous validation and confirmation functions */

function contributionValidation (json, errors, propositions, fullCitations) {

  var propositionError = false;
  propositions.forEach( function (proposition) {
    if ((!propositionError) && empty(proposition)) {
      errors.push('ERROR: At least one of your propositions is empty or ' +
          'undefined. This is now allowed when contributing new content.');
      propositionError = true;
    }
  });

  if (fullCitations.length != 1) {
    errors.push('ERROR: You must have exactly one ' +
        'full citation when contributing new content.');

  } else {

    var citation = fullCitations[0];

    if (empty(citation['title'])) {
      errors.push('ERROR: Citation title not specified.');
    }

    if (empty(citation['publisher'])) {
      errors.push('ERROR: Citation publisher not specified.');
    }

    var year = citation['year'];
    if (empty(year)) {
      errors.push('ERROR: Citation year not specified.');
    } else if (isNaN(parseInt(year))) {
      errors.push('ERROR: Citation year is not an integer.');
    }

    // returns the number of people of that kind
    function testListOfPeople (personType) {
      var personID = 1;
      while (true) {
        var surname = citation[personType + ' ' + personID + ' surname'],
            givenName = citation[personType + ' ' + personID + ' given name'],
            surnameEmpty = empty(surname),
            givenNameEmpty = empty(givenName);
        if (surnameEmpty && givenNameEmpty) {
          return personID - 1;
        } else if (surnameEmpty && !givenNameEmpty) {
          errors.push('ERROR: While ' + personType + ' given name ' +
              'is optional, ' + personType + ' surname is required.');
        }
        personID++;
      }
    }

    var numAuthors = testListOfPeople('author');
    if (numAuthors == 0) {
      errors.push('ERROR: At least one author is required.');
    }

    var citationType = citation['source type'];
    if (empty(citationType)) {
      errors.push('ERROR: Citation type not specified.');

    } else {

      if (citationType == 'periodical') {
        var volume = citation['volume'];
        if (empty(volume)) {
          errors.push('ERROR: Citation volume not specified.');
        } else if (isNaN(parseInt(volume))) {
          errors.push('ERROR: Citation volume is not an integer.');
        }

      } else if (citationType == 'edited collection') {
        var numEditors = testListOfPeople('editor');
        if (numEditors == 0) {
          errors.push('ERROR: At least one editor is required.');
        }
      }
    }
  }

  var foundAnEmpty = false,
      numConclusions = 0,
      numAssertion = 0,
      numPremises = 0;

  function findEmpties (something) {
    if (empty(something)) {
      foundAnEmpty = true;
    } else if (typeof something == 'object') {
      if (Array.isArray()) {
        something.forEach( function (value) {
          findEmpties(value);
        });
      } else {
        Object.keys(something).forEach( function (key) {
          if (key == 'conclusion') { numConclusions++; }
          if (key == 'assertion') { numAssertion++; }
          if (key == 'premise') { numPremises++; }
          findEmpties(something[key]);
        });
      }
    }
  }

  findEmpties(json);

  if (foundAnEmpty && !propositionError) {
    errors.push('ERROR: Something went wrong when parsing your query.');
  }

  if (numAssertion == 0) {
    if (numConclusions != 1) {
      errors.push('ERROR: Arguments must have exactly one conclusion.');
    }
  } else {
    if (numPremises > 0 || numConclusions > 0) {
      errors.push('ERROR: You may not submit assertions and ' +
          'arguments at the same time.');
    } else if (numAssertion > 1) {
      errors.push('ERROR: You may only submit one assertion at a time.');
    }
  }
}

function contributionConfirmation (html, comments) {

  var returnVal = {'valid': false};

  if (noResults(html)) {
    return returnVal;
  } else {

    for (var i = 1; i <= comments.length; i++) {
      var key = 'yes' + i;
      if (key in html) {
        if (html[key] != '1') {
          return returnVal;
        }
      } else {
        return returnVal;
      }
    }

    var low = 0;
    if ('pagelow' in html) {
      low = parseInt(html['pagelow']);
      if (isNaN(low)) {
        return returnVal;
      }
    } else {
      return returnVal;
    }

    var high = 0;
    if ('pagehigh' in html) {
      high = parseInt(html['pagehigh']);
      if (isNaN(high)) {
        return returnVal;
      }
    } else {
      return returnVal;
    }

    return {
      'valid': true,
      'low': low,
      'high': high,
    };
  }
}



/* insertion functions
   (note: by this point, i assume that the json IS valid) */

function getID (entry) {
  return entry[0].id;
}

function newListOfMetadataTags (query, callback) {
  query('insert into list_of_metadata_tags values (default) ' +
      'returning id', [], function (result) {
    callback(getID(result));
  });
}

function newListOfPeople (query, callback) {
  query('insert into list_of_people values (default) ' +
      'returning id', [], function (result) {
    callback(getID(result));
  });
}

function newListOfAssertables (query, callback) {
  query('insert into list_of_assertables values (default) ' +
      'returning id', [], function (result) {
    callback(getID(result));
  });
}

function newAssertable (query, type, userID, callback) {
  query('insert into assertable values (default, $1, $2, \'now\') ' +
      'returning id', [type, userID], function (result) {
    callback(getID(result));
  });
}

function getOrInsertPerson (query, first, last, userID, callback) {
  searchPersonSimilarExact(query, [first, last], function (similar, exact) {
    if (!noResults(exact)) {
      // console.log('old person ' + exact[0]);
      callback(exact[0]);
    } else {
      query('insert into person values (default, $1, default, ' +
          '$2, default, -1, $3, \'now\') returning id',
          [last, first, userID], function (result) {
        // console.log('new person ' + getID(result));
        callback(getID(result));
      });
    }
  });
}

function insert (query, json, userID, pageLow, pageHigh, callback1) {

  var citation = -1,
      assertion = -1,
      conclusion = -1,
      premises = [];

  function traverse (something, callback2) {

    var key = Object.keys(something)[0];

    if (inArr(groupConnectives, key)) {
      // console.log('groupConnective: ' + key);
      traverse(something[key][0], function () {
        traverse(something[key][1], function () {
          callback2();
        });
      });

    } else if (inArr(groupTypes, key)) {
      // console.log('groupType: ' + key);
      traverse(something[key], function (result) {
        if (key == 'assertion') {
          assertion = result;
        } else if (key == 'conclusion') {
          conclusion = result;
        } else if (key == 'premise') {
          premises.push(result);
        }
        callback2();
      });

    } else if (inArr(unaryTypes, key)) {
      // TODO: refactor to getOrInsertUnary()
      // console.log('unaryType: ' + key);
      traverse(something[key], function (result, dependencies) {
        var type = unaryWordToType[key];
        query('select distinct * from unary_assertable u where ' +
            'u.assertable = $1 and u.type = $2',
            [result, type], function (exact) {
          if (!noResults(exact)) {
            var exactID = getID(exact);
            // console.log('old ' + key + ': ' + exactID);
            callback2(exactID, dependencies.concat(exactID));
          } else {
            newAssertable(query, 1, userID, function (assertableID) {
              query('insert into unary_assertable values ' +
                  '($1, $2, $3, $4) returning id',
                  [assertableID, type, result, dependencies],
                  function (unaryID) {
                var newID = getID(unaryID);
                // console.log('new ' + key + ': ' + newID);
                callback2(newID, dependencies.concat(newID));
              });
            });
          }
        });
      });

    } else if (inArr(binaryTypes, key)) {
      // TODO: refactor to getOrInsertBinary()
      // console.log('binaryType: ' + key);
      traverse(something[key][0], function (result1, depend1) {
        traverse(something[key][1], function (result2, depend2) {
          var type = binaryWordToType[key];
          query('select distinct * from binary_assertable b where ' +
              'b.assertable1 = $1 and b.assertable2 = $2 and b.type = $3',
              [result1, result2, type], function (exact) {
            if (!noResults(exact)) {
              var exactID = getID(exact);
              // console.log('old ' + key + ': ' + exactID);
              callback2(exactID, depend1.concat(depend2).concat(exactID));
            } else {
              newAssertable(query, 2, userID, function (assertableID) {
                query('insert into binary_assertable values ' +
                    '($1, $2, $3, $4, $5, $6) returning id',
                    [assertableID, type, result1, result2, depend1, depend2],
                    function (binaryID) {
                  var newID = getID(binaryID);
                  // console.log('new ' + key + ': ' + newID);
                  callback2(newID, depend1.concat(depend2).concat(newID));
                });
              });
            }
          });
        });
      });

    } else if (key == propositionType) {
      // TODO: refactor to getOrInsertProposition()
      var proposition = something[key];
      // console.log('proposition: ' + proposition);
      query('select distinct * from proposition p where p.proposition = $1',
            [proposition], function (exact) {
        if (!noResults(exact)) {
          var exactID = getID(exact);
          // console.log('old ' + key + ': ' + exactID);
          callback2(exactID, [exactID]);
        } else {
          newListOfMetadataTags(query, function (listID) {
            newAssertable(query, 3, userID, function (assertableID) {
              query('insert into proposition values ' +
                  '($1, $2, default, $3) returning id',
                  [assertableID, proposition, listID],
                  function (propositionID) {
                var newID = getID(propositionID);
                // console.log('new ' + key + ': ' + newID);
                callback2(newID, [newID]);
              });
            });
          });
        }
      });

    } else if (key == fullCitationType) {
      // TODO: refactor to getOrInsertFullCitation()?
      // TODO: refactor ALL of the above to functions?
      // console.log('fullCitation');

      var fullCitation = something[key];

      // handle the people

      var authors = [], editors = [];
      function doOnePerson (personType, personNum) {
        var lastKey = personType + ' ' + personNum + ' surname',
            firstKey = personType + ' ' + personNum + ' given name';
        if (lastKey in fullCitation) {
          var last = fullCitation[lastKey],
              first = fullCitation[firstKey];
          getOrInsertPerson(query, first, last, userID, function (id) {
            if (personType == 'author') {
              authors.push(id);
            } else { // editor
              editors.push(id);
            }
            doOnePerson(personType, personNum + 1);
          });
        } else {
          if (personType == 'author') {
            doOnePerson('editor', 1);
          } else { // editor
            doListOfPeople('author');
          }
        }
      }

      var authorsList, editorsList;
      function doListOfPeople (personType) {

        var list;
        if (personType == 'author') {
          list = authors;
        } else { // editor
          list = editors;
        }

        if (list.length > 0) {

          var index = 1, listID;

          // possibly create a new list

          function addOnePersonToList () {
            var personID = list.pop();
            if (personID != undefined) {
              query('insert into list_of_people_element values ($1, $2, $3)',
                  [listID, index++, personID], function () {
                addOnePersonToList();
              });
            } else {
              if (personType == 'author') {
                authorsList = listID;
                doListOfPeople('editor');
              } else { // editor
                editorsList = listID;
                handleSource();
              }
            }
          }

          function needNewListOfPeople () {
            newListOfPeople(query, function (id) {
              index = 1;
              listID = id;
              list.reverse();
              // console.log('new list: ' + listID);
              addOnePersonToList();
            });
          }

          // but first, search for an existing list

          var fromClause = 'select distinct * from ',
              whereClause = 'where ';
          list.forEach( function (person) {
            var thisOne = 'e' + index,
                prevOne = 'e' + (index - 1);
            if (index > 1) {
              fromClause += ', ';
              whereClause += 'and '
            }
            fromClause += 'list_of_people_element ' + thisOne + ' ';
            whereClause += thisOne + '.index = ' + index +
                ' and ' + thisOne + '.person = ' + person + ' ';
            if (index > 1) {
              whereClause += 'and ' + thisOne + '.list = ' + prevOne + '.list ';
            }
            index++;
          });
          whereClause += 'and not exists (select * from list_of_people_element ' +
              'x where x.list = e1.list and x.index = ' + index + ')';

          query(fromClause + whereClause, [], function (result) {
            if (!noResults(result)) {
              // TODO: refactor getID() to take arbitrary arguments
              listID = result[0].list;
              list = [];
              // console.log('old list: ' + listID);
              addOnePersonToList();
            } else {
              needNewListOfPeople();
            }
          });

        } else {
          handleSource();
        }
      }

      // handle the rest of the citation

      var sourceID;
      function handleSource () {

        var sourceType = fullCitation['source type'],
            title = fullCitation['title'];

        if (sourceType == 'monograph') {
          query('select distinct s.id from source s, monograph m where ' +
              's.type = 1 and s.title = $1 and m.id = s.id', 
              [title], function (result) {
            if (!noResults(result)) {
              sourceID = getID(result);
              // console.log('old monograph: ' + sourceID);
              handlePublisher();
            } else {
              query('insert into source values (default, 1, $1, default, $2, ' +
                  '\'now\') returning id', [title, userID], function (id) {
                sourceID = getID(id);
                query('insert into monograph values ($1)',
                    [sourceID], function () {
                  // console.log('new monograph: ' + sourceID);
                  handlePublisher();
                });
              });
            }
          });

        } else if (sourceType == 'periodical') {
          var volume = fullCitation['volume'];
          query('select distinct s.id from source s, periodical p where ' +
              's.type = 2 and s.title = $1 and p.id = s.id and p.volume = $2', 
              [title, volume], function (result) {
            if (!noResults(result)) {
              sourceID = getID(result);
              // console.log('old periodical: ' + sourceID);
              handlePublisher();
            } else {
              query('insert into source values (default, 2, $1, default, $2, ' +
                  '\'now\') returning id', [title, userID], function (id) {
                sourceID = getID(id);
                query('insert into periodical values ($1, $2)',
                    [sourceID, volume], function () {
                  // console.log('new periodical: ' + sourceID);
                  handlePublisher();
                });
              });
            }
          });

        } else { // edited collection
          query('select distinct s.id from source s, edited_collection e where ' +
              's.type = 3 and s.title = $1 and e.id = s.id and e.editors = $2', 
              [title, editorsList], function (result) {
            if (!noResults(result)) {
              sourceID = getID(result);
              // console.log('old edited collection: ' + sourceID);
              handlePublisher();
            } else {
              query('insert into source values (default, 3, $1, default, $2, ' +
                  '\'now\') returning id', [title, userID], function (id) {
                sourceID = getID(id);
                query('insert into edited_collection values ($1, $2)',
                    [sourceID, editorsList], function () {
                  // console.log('new edited collection: ' + sourceID);
                  handlePublisher();
                });
              });
            }
          });
        }
      }

      var publisherID;
      function handlePublisher () {
        var publisherName = fullCitation['publisher'];
        query('select distinct * from publisher p where p.name = $1', 
            [publisherName], function (result) {
          if (!noResults(result)) {
            publisherID = getID(result);
            // console.log('old publisher: ' + publisherID);
            handleWork();
          } else {
            query('insert into publisher values (default, $1, default, $2, ' +
                '\'now\') returning id', [publisherName, userID], function (id) {
              publisherID = getID(id);
              // console.log('new publisher: ' + publisherID);
              handleWork();
            });
          }
        });
      }

      var workID;
      function handleWork () {
        var year = fullCitation['year'];
        query('select distinct * from work w where w.authors = $1 and ' +
            'w.year = $2 and w.source = $3 and w.publisher = $4', 
            [authorsList, year, sourceID, publisherID], function (result) {
          if (!noResults(result)) {
            workID = getID(result);
            // console.log('old work: ' + workID);
            handleCitation();
          } else {
            query('insert into work values (default, $1, $2, ' +
                '$3, $4, $5, \'now\') returning id', [authorsList, year,
                sourceID, publisherID, userID], function (id) {
              workID = getID(id);
              // console.log('new work: ' + workID);
              handleCitation();
            });
          }
        });
      }

      function handleCitation () {
        query('select distinct * from citation c where c.work = $1 and ' +
            'c.page_range_low = $2 and c.page_range_high = $3', 
            [workID, pageLow, pageHigh], function (result) {
          if (!noResults(result)) {
            citation = getID(result);
            // console.log('old citation: ' + citation);
            callback2();
          } else {
            query('insert into citation values (default, $1, $2, ' +
                '$3, $4, \'now\') returning id', [workID, pageLow,
                pageHigh, userID], function (id) {
              citation = getID(id);
              // console.log('new citation: ' + citation);
              callback2();
            });
          }
        });
      }

      // begin the full citation traversal
      doOnePerson('author', 1);

    }

  }

  // begin the json traversal
  traverse(json, function () {

    var claimID;
    if (assertion != -1) { // assertion insertion
      query('select distinct c.id from claim c, assertion a where c.type = 1 ' +
          'and c.citation = $1 and a.id = c.id and a.assertable = $2', 
          [citation, assertion], function (result) {
        if (!noResults(result)) {
          claimID = getID(result);
          // console.log('old assertion: ' + claimID);
          callback1(claimID);
        } else {
          query('insert into claim values (default, 1, $1, true, $2, ' +
              '\'now\') returning id', [citation, userID], function (id) {
            claimID = getID(id);
            query('insert into assertion values ($1, $2)',
                [claimID, assertion], function () {
              // console.log('new assertion: ' + claimID);
              callback1(claimID);
            });
          });
        }
      });

    } else { // argument insertion

      // TODO: factor out this code with the above list search code?

      var index = 1, premisesListID;
      function addOneAssertableToList () {
        var premise = premises.pop();
        if (premise != undefined) {
          query('insert into list_of_assertables_element values ($1, $2, $3)',
              [premisesListID, index++, premise], function () {
            addOneAssertableToList();
          });
        } else {

          // do the actual insertion
          query('select distinct c.id from claim c, argument a where ' +
              'c.type = 2 and c.citation = $1 and a.id = c.id and ' +
              'a.conclusion = $2 and a.premises = $3', [citation,
              conclusion, premisesListID], function (result) {
            if (!noResults(result)) {
              claimID = getID(result);
              // console.log('old argument: ' + claimID);
              callback1(claimID);
            } else {
              query('insert into claim values (default, 2, $1, true, $2, ' +
                  '\'now\') returning id', [citation, userID], function (id) {
                claimID = getID(id);
                newListOfMetadataTags(query, function (metadataID) {
                  query('insert into argument values ($1, $2, $3, $4)', [claimID,
                      conclusion, premisesListID, metadataID], function () {
                    // console.log('new argument: ' + claimID);
                    callback1(claimID);
                  });
                });
              });
            }
          });
        }
      }

      function needNewListOfAssertables () {
        newListOfAssertables(query, function (id) {
          index = 1;
          premisesListID = id;
          // console.log('new list: ' + premisesListID);
          addOneAssertableToList();
        });
      }

      var fromClause = 'select distinct * from ',
          whereClause = 'where ';
      premises.forEach( function (premise) {
        var thisOne = 'e' + index,
            prevOne = 'e' + (index - 1);
        if (index > 1) {
          fromClause += ', ';
          whereClause += 'and '
        }
        fromClause += 'list_of_assertables_element ' + thisOne + ' ';
        whereClause += thisOne + '.assertable = ' + premise + ' ';
        if (index > 1) {
          whereClause += 'and ' + thisOne + '.list = ' + prevOne + '.list ';
        }
        index++;
      });
      whereClause += 'and not exists (select * from list_of_assertables_element ' +
          'x where x.list = e1.list and x.index = ' + index + ')';

      query(fromClause + whereClause, [], function (result) {
        if (!noResults(result)) {
          premisesListID = result[0].list;
          premises = [];
          // console.log('old list: ' + premisesListID);
          addOneAssertableToList();
        } else {
          needNewListOfAssertables();
        }
      });
    }
  });
}



/* set-up the actual database interface */

module.exports = function (environment, pg) {

  /* streamline the process of connecting to the database */

  function connectToDatabase (callback) {

    pg.connect(environment.DATABASE_URL, function (error, client, done) {

      function query (queryString, queryParameters, callback) {

        client.query(queryString, queryParameters, function (error, result) {

          if (logAllQueries) {
            console.log(queryString + ' ' + JSON.stringify(queryParameters) +
                ' => ' + JSON.stringify(result ? result.rows : ''));
          }

          if (error) {
            console.log('ERROR (query): ' + error);
            callback(undefined);

          } else {
            callback(result.rows);
          }
        });
      }

      if (error) {
        console.log('ERROR (connectToDatabase): ' + error);

      } else {
        callback(query, done);
      }
    });
  }

  /* controller: view-to-model communication */

  return {

    // TODO: remove before going live

    fetchAssertable: function (assertableID, callback) {
      connectToDatabase( function (query, done) {
        fetchAssertable(query, assertableID, function (results) {
          done();
          callback(results);
        });
      });
    },

    fetchClaim: function (claimID, callback) {
      connectToDatabase( function (query, done) {
        fetchClaim(query, claimID, function (results) {
          done();
          callback(results);
        });
      });
    },

    searchProposition: function (searchString, callback) {
      connectToDatabase( function (query, done) {
        searchProposition(query, searchString, function (results) {
          done();
          callback(results);
        });
      });
    },

    searchAssertable: function (assertableJSON, callback) {
      connectToDatabase( function (query, done) {
        searchAssertable(query, assertableJSON, function (results) {
          done();
          callback(results);
        });
      });
    },

    parseForm: function (htmlForm, callback) {
      connectToDatabase( function (query, done) {
        htmlFormToJson(htmlForm, function (json,
            errorMessages, listOfPropositions, listOfFullCitations) {
          done();
          callback({
            'json': json,
            'errorMessages': errorMessages,
            'listOfPropositions': listOfPropositions,
            'listOfFullCitations': listOfFullCitations,
          });
        });
      });
    },

    // real functions (public api)

    contribute: function (htmlForm, userID, callback) {

      connectToDatabase( function (query, done) {

        htmlFormToJson(htmlForm, function (json, errorMessages,
            listOfPropositions, listOfFullCitations) {

          contributionValidation(json, errorMessages,
            listOfPropositions, listOfFullCitations);

          if (errorMessages.length > 0) {
            done();
            callback({
              'errors': errorMessages,
            });

          } else {

            searchForSimilar(query, listOfPropositions,
                listOfFullCitations[0], function (comments) {

              var info = contributionConfirmation(htmlForm, comments);

              if (info.valid == false) {
                done();
                callback({
                  'json': json,
                  'comments': comments,
                });
              } else {

                insert(query, json, userID, info.low, 
                    info.high, function (newID) {
                  done();
                  callback({
                    'newID': newID,
                  });
                });
              }
            });
          }
        });
      });
    },

    search: function (htmlForm, callbackOuter) {

      // TODO: actual searching

      // OLD: version 1

      // var json;
      // if ('query' in htmlForm) {
      //   json = {};
      // } else {
      //   htmlFormToJson(htmlForm, function (jsonResult) {
      //     json = jsonResult;
      //   });
      // }

      // connectToDatabase( function (query, done) {
      //   searchJson(query, json, function (results) {
      //     done();
      //     callback(results);
      //   });
      // });

      // OLD: version 2

      // if ('query' in htmlForm) {
      //   connectToDatabase( function (query, done) {
      //     var results = 'basic search results:';
      //     searchProposition(query, htmlForm['query'], function (ids) {
      //       function getOne () {
      //         var id = ids.pop();
      //         if (id != undefined) {
      //           fetchProposition(query, id, function (text) {
      //             results += '</br></br>' + text;
      //             getOne();
      //           });
      //         } else {
      //           done();
      //           callback(results);
      //         }
      //       }
      //       getOne();
      //     });
      //   });
      // } else {
      //   callback('advanced search coming soon!');
      // }

      function doSearch (assertableJSON, callbackMiddle) {

        // console.log('doSearch(): assertableJSON = ' +
        //     JSON.stringify(assertableJSON));

        connectToDatabase( function (query, done) {

          function doOneAssertionSearch (thingToSearch, callbackInner) {

            searchAssertable(query, thingToSearch, function (assertableIDs) {
              // console.log('assertableIDs = ' + assertableIDs);

              if (assertableIDs == undefined) {
                assertableIDs = [];
              }

              var allAssertionJSON = [];
              function getOneAssertable () {
                var assertableID = assertableIDs.pop();
                if (assertableID != undefined) {
                  // console.log('searching assertableID ' + assertableID);
                  query('select distinct c.id from assertion c, ' +
                      'unary_assertable u, binary_assertable b ' +
                      'where (c.assertable = $1) or ($1 = any(u.dependencies) ' +
                      'and c.assertable = u.id) or (($1 = any(b.dependencies1) ' +
                      'or $1 = any(b.dependencies2)) and c.assertable = b.id)',
                      [assertableID], function (assertionIDs) {

                    if (assertionIDs == undefined) {
                      assertionIDs = [];
                    }

                    function getOneAssertion () {
                      var assertionID = assertionIDs.pop();
                      if (assertionID != undefined) {
                        // console.log('fetchClaim ' + JSON.stringify(assertionID));
                        fetchClaim(query, assertionID.id, function (assertionJSON) {
                          allAssertionJSON.push(assertionJSON);
                          getOneAssertion();
                        });
                      } else {
                        getOneAssertable();
                      }
                    }

                    getOneAssertion();

                  });
                } else {
                  // console.log('search results: assertions: ' +
                  //     JSON.stringify(allAssertionJSON));
                  callbackInner({
                    'assertions': allAssertionJSON,
                    'arguments': []
                  });
                }
              }

              getOneAssertable();

              // fetchListOfThings(query, fetchAssertable,
              //     assertableIDs, function (resultJSON) {
              //   done();
              //   console.log('returning from search(), resultJSON = ' +
              //       JSON.stringify(resultJSON));
              //   callback({'assertions':resultJSON});
              // });

            });

          }

          // TODO: refactor for similarity with doOneAssertionSearch?
          function doOneArgumentSearch (thingToSearch, callbackInner) {

            searchAssertable(query, thingToSearch, function (assertableIDs) {
              // console.log('assertableIDs = ' + assertableIDs);

              if (assertableIDs == undefined) {
                assertableIDs = [];
              }

              var allArgumentsJSON = [];
              function getOneAssertable () {
                var assertableID = assertableIDs.pop();
                if (assertableID != undefined) {
                  // console.log('searching assertableID ' + assertableID);
                  query('select distinct c.id from argument c, ' +
                      'unary_assertable u, binary_assertable b, ' +
                      'list_of_assertables_element l ' +
                      'where (c.conclusion = $1 or (l.list = c.premises ' +
                      'and l.assertable = $1)) or ($1 = any(u.dependencies) ' +
                      'and (c.conclusion = u.id or (l.list = c.premises ' +
                      'and l.assertable = u.id))) or (($1 = any(b.dependencies1) ' +
                      'or $1 = any(b.dependencies2)) and (c.conclusion = b.id ' +
                      'or (l.list = c.premises and l.assertable = b.id)))',
                      [assertableID], function (argumentIDs) {

                    if (argumentIDs == undefined) {
                      argumentIDs = [];
                    }

                    function getOneArgument () {
                      var argumentID = argumentIDs.pop();
                      if (argumentID != undefined) {
                        // console.log('fetchClaim ' + JSON.stringify(argumentID));
                        fetchClaim(query, argumentID.id, function (assertionJSON) {
                          allArgumentsJSON.push(assertionJSON);
                          getOneArgument();
                        });
                      } else {
                        getOneAssertable();
                      }
                    }

                    getOneArgument();

                  });
                } else {
                  // console.log('search results: arguments: ' +
                  //     JSON.stringify(allArgumentsJSON));
                  callbackInner({
                    'assertions': [],
                    'arguments': allArgumentsJSON
                  });
                }
              }

              getOneAssertable();

            });

          }

          var thing1 = {},
              thing2 = {},
              twoThings = false;

          if ('assertion' in assertableJSON) {
            doOneAssertionSearch(assertableJSON.assertion,
                function (assertionResults) {
              doOneArgumentSearch(assertableJSON.assertion,
                  function (argumentResults) {
                var allResults = {};
                allResults.assertions = assertionResults.assertions;
                allResults.arguments = argumentResults.arguments;
                console.log('search results: one assertion: ' +
                    JSON.stringify(allResults));
                callbackMiddle(allResults);
              });
            });

          } else if ('group and' in assertableJSON) {
            thing1 = assertableJSON['group and'][0];
            thing2 = assertableJSON['group and'][1];
            twoThings = true;
          } else if ('group or' in assertableJSON) {
            thing1 = assertableJSON['group or'][0];
            thing2 = assertableJSON['group or'][1];
            twoThings = true;
          } else if ('group not' in assertableJSON) {
            thing1 = assertableJSON['group not'][0];
            thing2 = assertableJSON['group not'][1];
            twoThings = true;

          } else if ('basic citation' in assertableJSON) {
            callbackMiddle({
              'assertions': [],
              'arguments': []
            });
          } else if ('full citation' in assertableJSON) {
            callbackMiddle({
              'assertions': [],
              'arguments': []
            });
          }

          if (twoThings) {
            doSearch(thing1, function (leftResults) {
              doSearch(thing2, function (rightResults) {
                var allResults = {};
                allResults.assertions = [];
                leftResults.assertions.forEach( function (assertion) {
                  allResults.assertions.push(assertion); });
                rightResults.assertions.forEach( function (assertion) {
                  allResults.assertions.push(assertion); });
                allResults.arguments = [];
                leftResults.arguments.forEach( function (argument) {
                  allResults.arguments.push(argument); });
                rightResults.arguments.forEach( function (argument) {
                  allResults.arguments.push(argument); });
                // console.log('search results: twoThings: ' +
                //     JSON.stringify(allResults));
                callbackMiddle(allResults);
              });
            });
          }

        });

      }

      if ('query' in htmlForm) {
        doSearch({'assertion':{'proposition':htmlForm['query']}}, callbackOuter);
      } else {
        htmlFormToJson(htmlForm, function (json,
            errorMessages, listOfPropositions, listOfFullCitations) {
          doSearch(json, callbackOuter);
        });
      }

    },

    // old functions (from first database version)
    // TODO later: refactor this (and the index file)

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
    // TODO: change to "false, false, true" after alpha phase is done
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

  };
}

