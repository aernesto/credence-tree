
function textInputChanged (textInputElement) {
  var element = $(textInputElement);
  element.attr('value', element.val()); }

function selectChanged (selectElement, skipTextInputChanged) {
  if (skipTextInputChanged) {}
  else { textInputChanged(selectElement); }
  var select = $(selectElement)
  select.find('option').each(function (i, optionElement) {
    var option = $(optionElement);
    if (option.attr('description')) {
      option.html(option.attr('short') + 
          '&nbsp;'.repeat(parseInt(option.attr('spaces')) + 4) +
          option.attr('description')); }});
  var selected = select.find('option:selected').last();
  selected.html(selected.attr('short')); }

function moveContentFromTo (element1, element2) {
  element2.html(element1.html());
  $(element2).find('select').each(function (i, selectElement) {
    selectChanged(selectElement, true);
    var select = $(selectElement);
    select.val(select.attr('value')); });
  // special case the value of the source radio buttons
  // TODO: generalized for use with all radio buttons
  // TODO: refactor with the code in search-forms.js
  for (var groupID in radioGroupToVal) {
    var sourceName = 'g' + groupID + 'source',
        radios = $('form [name="' + sourceName + '"]');
        sourceVal = radioGroupToVal[groupID];
    if (sourceVal != undefined) {
      radios.val([sourceVal]);
      radioInputClicked(radios[sourceVal - 1]); }}}
