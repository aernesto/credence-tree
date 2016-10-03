
gapi.load('auth2', function () {

  var clientID = '192586835739-25ptn67tpin84bnr34f8ei8qu5pcjaeo';
  var auth2 = gapi.auth2.init({
    client_id: clientID + '.apps.googleusercontent.com' });

  function onSignIn (googleUser) {

    var idToken = googleUser.getAuthResponse().id_token;

    function handleSignIn () {
      var url = JSON.parse(this.responseText).redirectURL;
      if (url) { window.location.href = url; }}

    var xhr = new XMLHttpRequest();
    xhr.open('post', '/google-sign-in');
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
    xhr.onload = handleSignIn;
    xhr.send('idtoken=' + idToken); }

  function onFailure (error) {
    console.log('error: ' + JSON.stringify(error, undefined, 2)); }

  if ($('#login').size() > 0) {
    [$('#login')[0], $('#join')[0]].forEach(function (button) {
      auth2.attachClickHandler(button, {}, onSignIn, onFailure); }); }});
