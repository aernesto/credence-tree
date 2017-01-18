
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
        'is identical to': 5};



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

  };
}
