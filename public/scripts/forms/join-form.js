
var curUserType, specializationsArea, 
    additionalInfoArea, stagingArea1, stagingArea2;

$(document).ready( function () {

  specializationsArea = $('#specializations-area');
  additionalInfoArea = $('#additional-form-info-area');
  stagingArea1 = $('#additional-form-info-staging-area-1');
  stagingArea2 = $('#additional-form-info-staging-area-2');

  radioInputClicked($('[name="user_type"][checked]').first()); });

function joinRadioInputClicked (radioInputElement) {

  function switchTo1 () {
    if (curUserType ==  2) {
      moveContentFromTo(additionalInfoArea, stagingArea2); }
    if (curUserType !== 1) {
      moveContentFromTo(stagingArea1, additionalInfoArea); }
    curUserType = 1; }

  function switchTo2 () {
    if (curUserType ==  1) {
      moveContentFromTo(additionalInfoArea, stagingArea1); }
    if (curUserType !== 2) {
      moveContentFromTo(stagingArea2, additionalInfoArea); }
    curUserType = 2; }

  var element = $(radioInputElement);
  if (element.attr('name') == 'user_type') {
    if (element.attr('value') == 1) {
      switchTo1(); }
    else if (element.attr('value') == 2) {
      switchTo2(); }}}

function addAnotherSpecialization () {

  var newDropDown = specializationsArea.find('select').last().clone();
  var newID = parseInt(newDropDown.attr('which')) + 1;
  newDropDown.attr('which', newID);
  newDropDown.attr('name', 'specialization' + newID);
  var titleOption = newDropDown.find('option').first();
  titleOption.html('area of specialization #' + newID);
  specializationsArea.append(newDropDown); }
