
var radioGroupToVal = {};

function radioInputClicked (radioInputElement) {
  var input = $(radioInputElement),
      value = input.attr('value'),
      group = input.attr('group'),
      parent = input.parents('div').first(),
      additional1 = parent.find('#additional-1'),
      additional2 = parent.find('#additional-2'),
      additional3 = parent.find('#additional-3');
  if (group != undefined) {
    radioGroupToVal[group] = value; }
  if (value == 1) {
    additional1.show();
    additional2.hide();
    additional3.hide(); }
  else if (value == 2) {
    additional1.hide();
    additional2.show();
    additional3.hide(); }
  else if (value == 3) {
    additional1.hide();
    additional2.hide();
    additional3.show(); }}

function addAnotherPerson (linkElement) {
  var link = $(linkElement),
      nameArea = link.parents('.outer-area').first().find('.inner-area').first(),
      gn = nameArea.find('input:eq(-1)').last(),
      sn = nameArea.find('input:eq(-2)').last(),
      gnName = gn.attr('name-template'),
      snName = sn.attr('name-template'),
      groupID = parseInt(gn.attr('group')),
      whichID = parseInt(gn.attr('which')) + 1,
      newGN = gn.clone(), newSN = sn.clone();
  newGN.attr('which', whichID).attr('name', 'g' + groupID + gnName + whichID);
  newSN.attr('which', whichID).attr('name', 'g' + groupID + snName + whichID);
  // add the two new text fields
  nameArea.append(newSN); nameArea.append(newGN);
  // clear the text of the new fields
  gn = nameArea.find('input:eq(-1)').last();
  sn = nameArea.find('input:eq(-2)').last();
  gn.val(''); textInputChanged(gn);
  sn.val(''); textInputChanged(sn);
  updateAllFormElements(); }
