
// constants (as defined in the database schema)

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
      unaryWordToType = {
        'not': 2,
        'possibly': 3,
        'necessarily': 4},
      // binary types
      IMPLICATION = 3,
      binaryTypeToWord = {
        1: 'and',
        2: 'or',
        3: 'implies',
        4: 'if and only if',
        5: 'is identical to'},
      binaryWordToType = {
        'and': 1,
        'or': 2,
        'implies': 3,
        'if and only if': 4,
        'is identical to': 5},
      // html form elements
      OPEN_PAREN = 1,
      CLOSE_PAREN = 1,
      unaryFormOps = [2, 3, 4],
      binaryFormOps = [5, 6, 7, 8, 9],
      unaryFormToJsonType = {2: 2, 3: 4, 4: 3},
      binaryFormToJsonType = {5: 1, 6: 2, 7: 3, 8: 4, 9: 5},
      contentGroupLocations = [1, 2, 3],
      citationGroupLocations = [4, 5, 6, 7],
      fullCitationGroupLocations = [8];



// helper functions

function noResults (results) {
  return (results == undefined) || (results.length == 0);
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

// like PSQL's plainto_tsquery() but with ORs instead of ANDs
function addOrs (queryText) {
  if (queryText == undefined) {
    return undefined;
  } else {
    return queryText.trim().replace(/\s/g, ' | ');
  }
}

// simple <element in array> operator
function inArr (array, element) {
  return array.indexOf(element) != -1;
}



// fetch functions (retrieve records by their id's)

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



// search functions (retrieve records by their similarity to given data)

function searchProposition (query, searchString, callback) {

  query('select distinct * from proposition p where ' +
      'p.proposition_tsv @@ to_tsquery(\'english\', $1)',
      [addOrs(searchString)], function (results) {

    if (noResults(results)) {
      callback(undefined);
    } else {

      // fetchListOfThings(query, fetchAssertable, extractIDs(results), callback);
      callback(extractIDs(results));
    }
  });
}

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



// translation functions

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

        var curGroupIsValid = true,
            groupLocationKey = curGroupPrefix() + 'in',
            groupLocation = parseInt(queryObject[groupLocationKey]);

        if (groupLocation == undefined || isNaN(groupLocation)) {

          errorMessages.push('ERROR: Group ' + curGroup + ': You have ' +
              'not specified a location for this group.');
          curGroupIsValid = false;

        } else if (inArr(contentGroupLocations, groupLocation)) {

          // see FSM explanation above
          var state = EXPECTING,
              curGroupJson = undefined,
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

              var curRowJson = inArr(keys, curRowPrefix()) ? {
                    'proposition': queryObject[curRowPrefix()]
                  } : undefined;

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

          // handle the group location

          var locationWrapper = '';
          if (groupLocation == 1) {
            locationWrapper = 'assertion';
          } else if (groupLocation == 2) {
            locationWrapper = 'premise';
          } else if (groupLocation == 3) {
            locationWrapper = 'conclusion';
          } else {
            errorMessages.push('ERROR: Group ' + curGroup +
                ': No group location specified.');
            curGroupIsValid = false;
          }

          var newJson = {};
          newJson[locationWrapper] = curGroupJson;
          curGroupJson = newJson;

        } else {
          // TODO: citation group
        }

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

    callback(json, errorMessages, curGroup - 1);
  }
}
// TODO: if insertion (as opposed to search) throw error
//   if there are any undefined values in the json object



// set-up the database interface

module.exports = function (environment, pg) {

  // streamline the process of connecting to the database

  var logAllQueries = true;

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

  // controller: view-to-model communication

  return {

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
        htmlFormToJson(htmlForm, function (json, errorMessages, numGroups) {
          done();
          callback({
            'json': json,
            'errorMessages': errorMessages,
            'numGroups': numGroups
          });
        });
      });
    },

  };
}
