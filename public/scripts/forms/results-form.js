
function showAssertionsArguments (linkElement, which) {
  var link = $(linkElement),
      resultsRow = link.parents('tr').first().next(),
      assertionsDiv = resultsRow.find('div.assertions').first(),
      argumentsDiv = resultsRow.find('div.arguments').first();
  if (which == 1) {
    argumentsDiv.addClass('hidden');
    assertionsDiv.removeClass('hidden'); }
  else if (which == 2) {
    assertionsDiv.addClass('hidden');
    argumentsDiv.removeClass('hidden'); }}

function showAssertions (linkElement) {
  showAssertionsArguments(linkElement, 1); }

function showArguments (linkElement) {
  showAssertionsArguments(linkElement, 2); }
