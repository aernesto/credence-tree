
// global pointers to specific DOM elements

var curSearchForm = 'basic', searchFormArea, basicSearchStagingArea, 
    advancedSearchStagingArea, leftLogicTemplate, rightLogicTemplate, 
    searchInputTemplate, contentGroupLocationTemplate, 
    citationGroupLocationTemplate, groupLogicTemplate, fullCitationTemplate;

// miscellaneous helper functions

function thisIsContributionPage () {
  return $('div#contribution-page').size() > 0; }

function maybeSubmit (event) {
  if (event && event.keyCode == 13) {
    $('form').first().submit(); }}

function inArr (array, element) {
  return array.indexOf(element) != -1; }

// set-up the initial structure of the form

$(document).ready( function () {

  searchFormArea = $('#search-form-area');
  basicSearchStagingArea = $('#basic-search-staging-area');
  advancedSearchStagingArea = $('#advanced-search-staging-area');
  leftLogicTemplate = $('#left-logic-template');
  rightLogicTemplate = $('#right-logic-template');
  searchInputTemplate = $('#search-input-template');
  contentGroupLocationTemplate = $('#content-group-location-template');
  citationGroupLocationTemplate = $('#citation-group-location-template');
  groupLogicTemplate = $('#group-logic-template');
  fullCitationTemplate = $('#full-citation-template');

  if (thisIsContributionPage()) {
    $('form.search > div.left-label').html('contribute to Credence Tree!');
    $('div#content-group-location-template option[value="1"]').html('IN: assertions');
    $('div#citation-group-location-template option[value="4"]').remove();
    $('div#citation-group-location-template option[value="5"]').remove();
    $('div#citation-group-location-template option[value="6"]').remove();
    $('div#citation-group-location-template option[value="7"]').remove();
    $('div#group-logic-template option[value="2"]').remove();
    $('div#group-logic-template option[value="3"]').remove();
    $('div#group-logic-template option[value="5"]').remove();
    $('div#group-logic-template option[value="6"]').remove();
  }

  advancedSearchStagingArea.append(newContentGroup(1))
      .append(newGroupLogic(2)).append(newSubmit());

  var previousQuery = $('#previous-query');
  function thisHasPreviousQuery () {
    return previousQuery.size() > 0; }

  if (thisHasPreviousQuery()) {
    switchToAdvancedSearch(); }

  if (thisIsContributionPage()) {
    switchToAdvancedSearch();
    groupLogicalChanged($('select[name="g1in"]').val(1)); }

  // recreate the form if data for it already exists
  if (thisHasPreviousQuery()) {
    try { // call JSON.parse() safely
      var query = JSON.parse(previousQuery.html()),
          inQuery = function (element) {
            return Object.keys(query).indexOf(element) != -1; },
          getByName = function (name) {
            return $('form [name="' + name + '"]')};

      // handle all the groups
      var groupID = 1,
          groupPrefix = function () { 
            return 'g' + groupID; },
          nextGroupAndValue = 4;
      while (true) {

        if (inArr([4, 5, 6], nextGroupAndValue)) { // content group

          // handle all the rows in this group
          var rowID = 1,
              rowPrefix = function () { 
                return groupPrefix() + 'r' + rowID; };
          while (true) {

            var thisRowIsEmpty = true,
                thisRowIsNotEmpty = function () {
                  if (thisRowIsEmpty && (rowID != 1)) {
                    var link = $('form table[group="' + groupID +
                        '"] div.another-row a').last();
                    addAnotherRow(link); }
                  thisRowIsEmpty = false; };

            // handle all the befores
            var beforeID = 1,
                beforePrefix = function () { 
                  return rowPrefix() + 'b' + beforeID; };
            while (inQuery(beforePrefix())) {
              thisRowIsNotEmpty();
              var select = getByName(beforePrefix());
              select.val(query[beforePrefix()]);
              logicalChanged(select);
              beforeID++; }

            // handle all the afters
            // TODO: refactor with befores code
            var afterID = 1,
                afterPrefix = function () { 
                  return rowPrefix() + 'a' + afterID; };
            while (inQuery(afterPrefix())) {
              thisRowIsNotEmpty();
              var select = getByName(afterPrefix());
              select.val(query[afterPrefix()]);
              logicalChanged(select);
              afterID++; }

            // handle the text input
            if (inQuery(rowPrefix())) {
              thisRowIsNotEmpty();
              var input = getByName(rowPrefix());
              input.val(query[rowPrefix()]);
              textInputChanged(input); }

            if (!thisRowIsEmpty) {
              rowID++; }
            else {
              // done with all rows in this group
              break; }

          }

        } else if (inArr([1, 2, 3], nextGroupAndValue)) { // citation group

          // handle the title
          var titleName = groupPrefix() + 'title',
              textInput = getByName(titleName),
              titleVal = query[titleName];
          if (titleVal != undefined) {
            textInput.val(titleVal);
            textInputChanged(textInput); }

          // handle the publisher
          var publisherName = groupPrefix() + 'publisher',
              textInput = getByName(publisherName),
              publisherVal = query[publisherName];
          if (publisherVal != undefined) {
            textInput.val(publisherVal);
            textInputChanged(textInput); }

          // handle the year
          var yearName = groupPrefix() + 'year',
              textInput = getByName(yearName),
              yearVal = query[yearName];
          if (yearVal != undefined) {
            textInput.val(yearVal);
            textInputChanged(textInput); }

          // handle the source
          var sourceName = groupPrefix() + 'source',
              radios = getByName(sourceName),
              sourceVal = query[sourceName];
          if (sourceVal != undefined) {
            radios.val([sourceVal]);
            // TODO: this will break if the source values change
            radioInputClicked(radios[sourceVal - 1]); }

          // handle the volume
          var volumeName = groupPrefix() + 'volume',
              textInput = getByName(volumeName),
              volumeVal = query[volumeName];
          if (volumeVal != undefined) {
            textInput.val(volumeVal);
            textInputChanged(textInput); }

          function handlePeople (shortName, longName) {
            var personID = 1;
            while (true) {
              var snKey = groupPrefix() + shortName + 'sn' + personID,
                  gnKey = groupPrefix() + shortName + 'gn' + personID,
                  snInput = getByName(snKey),
                  gnInput = getByName(gnKey),
                  snVal = query[snKey],
                  gnVal = query[gnKey],
                  foundOne = false,
                  needNewRows = personID != 1,
                  checkIfNeedNewRow = function () {
                    foundOne = true;
                    if (needNewRows) {
                      needNewRows = false;
                      var link = $('form div.content-panel.citation[group="' + 
                          groupID + '"] div.add-' + longName + ' a').last();
                      addAnotherPerson(link);
                      snInput = getByName(snKey);
                      gnInput = getByName(gnKey); }};
              if (snVal != undefined && snVal != '') {
                checkIfNeedNewRow();
                snInput.val(snVal);
                textInputChanged(snInput); }
              // TODO: refactor gn code with sn code
              if (gnVal != undefined && gnVal != '') {
                checkIfNeedNewRow();
                gnInput.val(gnVal);
                textInputChanged(gnInput); }
              if (foundOne) {
                personID++;
              } else {
                break;
              }
            }
          }

          // handle all the authors
          handlePeople('a', 'author');
          // handle all the editors
          handlePeople('e', 'editor');

        } else {
          console.log('OTHER: nextGroupAndValue = ' + nextGroupAndValue); }

        // handle this group's IN operator
        var inPrefix = groupPrefix() + 'in',
            select = getByName(inPrefix),
            inVal = query[inPrefix];
        if (groupID == 1 && inVal == undefined) {
          inVal = 1; }
        select.val(inVal);
        selectChanged(select);

        groupID++;

        // handle the next group's AND operator
        var andPrefix = groupPrefix() + 'and',
            select = getByName(andPrefix),
            andValue = query[andPrefix];
        if (andValue != undefined) {
          andValue = parseInt(andValue);
          nextGroupAndValue = andValue;
          select.val(andValue);
          groupLogicalChanged(select); }
        else { break; }

      }
    } catch (error) {
      console.log('error: ' + error);
    }
  }

  if (thisIsContributionPage) {
    $('table.submit').before($('#contribution-confirmation-area').html()); }

  // $('form').first().submit( function () {
  //   $('form select, form input').each( function (i, domElemen) {
  //     var element = $(domElemen), value = element.val();
  //     // if (value == null || value == 0 || value == '') {
  //     if (value == null || value == 0) {
  //       element.removeAttr('name'); }}); });
  
});

// switch between the two types of search

function switchToBasicSearch () {
  if (curSearchForm == 'advanced') {
    moveContentFromTo(searchFormArea, advancedSearchStagingArea);
    moveContentFromTo(basicSearchStagingArea, searchFormArea);
    curSearchForm = 'basic'; }}

function switchToAdvancedSearch () {
  if (curSearchForm == 'basic') {
    moveContentFromTo(searchFormArea, basicSearchStagingArea);
    moveContentFromTo(advancedSearchStagingArea, searchFormArea);
    curSearchForm = 'advanced'; }}

// trigger automatic form element creation/insertion

function logicalChanged (selectElement) {
  selectChanged(selectElement);
  updateLogical(selectElement); }

function groupLogicalChanged (selectElement) {
  var select = $(selectElement),
      oldValue = parseInt(select.attr('value'));
  selectChanged(selectElement);
  updateGroupLogical(selectElement, oldValue); }

function citationChanged (selectElement) {
  var select = $(selectElement),
      oldValue = parseInt(select.attr('value'));
  selectChanged(selectElement);
  updateCitation(selectElement, oldValue); }

function updateLogical (selectElement) {
  var select = $(selectElement),
      groupID = select.attr('group'),
      rowID = select.attr('row');
  if (select.is('[before]')) {
    if (select.attr('before') == select.attr('of')) {
      addNewBefore(groupID, rowID); }}
  else if (select.is('[after]')) {
    if (select.attr('after') == select.attr('of')) {
      addNewAfter(groupID, rowID); }}}

function updateGroupLogical (selectElement, oldValue) {
  var select = $(selectElement),
      groupID = parseInt(select.attr('group-id')),
      first = select.attr('first'),
      newValue = parseInt(select.val()),
      elementsToRemove = ['table', 'div.citation'],
      defaultInSelectVal = undefined;
  select.attr('first', 'false');
  if (newValue == 0 && oldValue != 0) {
    removeGroup(groupID, elementsToRemove); }
  else if (checkValueDelta([1, 2, 3], oldValue, newValue)) {
    addGroup(groupID, first, newBasicCitationGroup, elementsToRemove);
    defaultInSelectVal = thisIsContributionPage() ? 8 : 4; }
  else if (checkValueDelta([4, 5, 6], oldValue, newValue)) {
    addGroup(groupID, first, newContentGroup, elementsToRemove);
    defaultInSelectVal = 1; }
  if (defaultInSelectVal != undefined) {
    var inSelect = $('form select[name="g' + groupID + 'in"]');
    inSelect.val(defaultInSelectVal);
    citationChanged(inSelect); }}

function updateCitation (selectElement, oldValue) {
  var select = $(selectElement),
      groupID = parseInt(select.attr('group')),
      newValue = parseInt(select.val()),
      elementsToRemove = ['table.citation', 'div.citation'];
  if (checkValueDelta([8], oldValue, newValue)) {
    addGroup(groupID, false, updateFullCitationGroup, elementsToRemove); }
  else if (checkValueDelta([4, 5, 6, 7], oldValue, newValue)) {
    addGroup(groupID, false, updateBasicCitationGroup, elementsToRemove); }}

function checkValueDelta (trueValues, oldValue, newValue) {
  return trueValues.indexOf(newValue) != -1 && 
      trueValues.indexOf(oldValue) == -1; }

// create and insert new elements into the form

function updateAllFormElements () {
  moveContentFromTo(searchFormArea, searchFormArea); }

function addNewBefore (groupID, rowID) {
  var befores = $('form select[group=\"' + groupID + 
      '\"][row=\"' + rowID + '\"][before]'),
      lastBefore = befores.last(),
      newNumBefores = parseInt(lastBefore.attr('of')) + 1;
  befores.attr('of', newNumBefores);
  lastBefore.parents('td').first()
      .after(newBefore(groupID, rowID, newNumBefores))
      .after(newPadding());
  updateAllFormElements(); }

function addNewAfter (groupID, rowID) {
  var afters = $('form select[group=\"' + groupID + 
      '\"][row=\"' + rowID + '\"][after]'),
      firstAfter = afters.first(),
      newNumAfters = parseInt(firstAfter.attr('of')) + 1;
  afters.attr('of', newNumAfters);
  firstAfter.parents('td').first()
      .before(newAfter(groupID, rowID, newNumAfters))
      .before(newPadding());
  updateAllFormElements(); }

function addAnotherRow (linkElement) {
  var link = $(linkElement),
      div = link.parents('div').first().hide(),
      search = link.parents('td').first().find('input').first(),
      groupID = parseInt(search.attr('group')),
      rowID = parseInt(search.attr('row'));
  $('form table[group=\"' + groupID + '\"][row=\"' + 
      rowID + '\"]').after(newContentRow(groupID, rowID + 1));
  updateAllFormElements(); }

function addGroup (groupID, first, newGroupFunction, listOfElementsToRemove) {
  // note that newGroupFunction is newContentGroup(), newBasicCitationGroup(),
  //     updateBasicCitationGroup(), or updateFullCitationGroup()
  removeGroup(groupID, listOfElementsToRemove);
  var after = first == 'true' ? newGroupLogic(groupID + 1) : '';
  $('form table[group-id=\"' + groupID + '\"]').last()
      .after(newGroupFunction(groupID) + after);
  updateAllFormElements(); }

function removeGroup (groupID, listOfElementsToRemove) {
  listOfElementsToRemove.forEach( function (element) {
    $('form ' + element + '[group=\"' + groupID + '\"]').remove(); }); }

// create new form elements from templates

function newBefore (groupID, rowID, ofID) {
  leftLogicTemplate.find('select').first()
      .attr('name', 'g' + groupID + 'r' + rowID + 'b' + ofID)
      .attr('group', groupID).attr('row', rowID)
      .attr('before', ofID).attr('of', ofID);
  return '<td class="logic">' + leftLogicTemplate.html() + '</td>'; }

function newAfter (groupID, rowID, ofID) {
  rightLogicTemplate.find('select').first()
      .attr('name', 'g' + groupID + 'r' + rowID + 'a' + ofID)
      .attr('group', groupID).attr('row', rowID)
      .attr('after', ofID).attr('of', ofID);
  return '<td class="logic">' + rightLogicTemplate.html() + '</td>'; }

function newSearch (groupID, rowID, skipRowLink) {
  searchInputTemplate.find('input').first()
      .attr('name', 'g' + groupID + 'r' + rowID)
      .attr('group', groupID).attr('row', rowID);
  return '<td class="text">' + searchInputTemplate.html() +
      (skipRowLink ? '' : newAnotherRowLink()) + '</td>'; }

function newContentGroupLocation (groupID) {
  var select = contentGroupLocationTemplate.find('select').first()
      .attr('name', 'g' + groupID + 'in').attr('group', groupID);
  selectChanged(select.val(1)[0]);
  return '<table group=\"' + groupID + '\" class="centered">' +
      '<tr><td class="text">' + contentGroupLocationTemplate.html() + 
      '</td></tr></table>'; }

function newCitationGroupLocation (groupID) {
  var select = citationGroupLocationTemplate.find('select').first()
      .attr('name', 'g' + groupID + 'in').attr('group', groupID);
  selectChanged(select.val(1)[0]);
  return '<table group=\"' + groupID + '\" class="centered">' +
      '<tr><td class="text">' + citationGroupLocationTemplate.html() + 
      '</td></tr></table>'; }

function newGroupLogic (groupID) {
  // note the use of the 'group-id' attribute instead of 'group'
  groupLogicTemplate.find('select').first()
      .attr('name', 'g' + groupID + 'and').attr('group-id', groupID);
  return '<table group-id=\"' + groupID + '\" class="centered">' +
      '<tr><td class="text">' + groupLogicTemplate.html() + 
      '</td></tr></table>'; }

function newFullCitation (groupID) {
  fullCitationTemplate.find('div.citation').attr('group', groupID);
  fullCitationTemplate.find('input').each(function (i, inputElement) {
    var input = $(inputElement), 
        name = input.attr('name-template'),
        which = input.attr('which');
    input.attr('name', 'g' + groupID + name + 
        (which !== undefined ? which : ''))
        .attr('group', groupID); });
  return fullCitationTemplate.html(); }

// create new form elements from whole cloth

function newPadding () {
  return '<td class="padding"></td>'; }

function newAnotherRowLink () {
  return '<div class="another-row"><a href="#" ' +
      'onclick="addAnotherRow(this)">add another row</a></div>'; }

function newSubmit () {
  return '<table class="centered submit"><tr><td class="text">' +
      '<input type="submit"></td></tr></table>'; }

// create new compound form elements

function newContentRow (groupID, rowID) {
  return '<table group=\"' + groupID + '\" row=\"' + rowID + '\"><tr>' +
      newBefore(groupID, rowID, 1) + newPadding() + 
      newSearch(groupID, rowID) + newPadding() + 
      newAfter(groupID, rowID, 1) + '</tr></table>'; }

function newBasicCitationRow (groupID) {
  return '<table class="citation" group=\"' + groupID + '\"><tr>' +
      newSearch(groupID, 1, true) + '</tr></table>'; }

function newContentGroup (groupID) {
  return newContentRow(groupID, 1) + newContentGroupLocation(groupID); }

function newBasicCitationGroup (groupID) {
  return newBasicCitationRow(groupID) + newCitationGroupLocation(groupID); }

function newFullCitationGroup (groupID) {
  return newFullCitation(groupID) + newCitationGroupLocation(groupID); }

function updateBasicCitationGroup (groupID) {
  return newBasicCitationRow(groupID); }

function updateFullCitationGroup (groupID) {
  return newFullCitation(groupID); }
