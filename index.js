
// set-up the environment

var environment = process.env;

const clientID = '192586835739-25ptn67tpin84bnr34f8ei8qu5pcjaeo';
const appID = clientID + '.apps.googleusercontent.com';

// include Node dependencies

var express = require('express'),
    app = express();
app.set('port', (environment.PORT || 5000));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

var cookieParser = require('cookie-parser');
app.use(cookieParser());

var lessMiddleware = require('less-middleware');
app.use(lessMiddleware(__dirname + '/public')); // 1
app.use(express.static(__dirname + '/public')); // 2

var session = require('express-session'),
    RedisStore = require('connect-redis')(session);
app.use(session({
  store: new RedisStore({
    url: environment.REDIS_URL }),
  secret: environment.SESSION_SECRET,
  saveUninitialized: false,
  resave: false }));

var bodyParser = require('body-parser'),
    urlencodedParser = bodyParser.urlencoded({extended: false});
app.use(urlencodedParser);

var pg = require('pg');     
pg.defaults.ssl = true;

var https = require('https');

var fs = require('fs');

var marked = require ('marked');
var md = function (filename) {
  var path = __dirname + '/public/files/' + filename,
      include = fs.readFileSync(path, 'utf8'),
      html = marked(include);
  return html; };

// include other Credence Tree files

var database = require('./psql/queries')(environment, pg);
var database2 = require('./psql/queries-2')(environment, pg);

// define custom helper functions

function getNaryRequestParameters (data, parameterName) {
  var naryData = {}, i;
  for (i = 1; ; i++) {
    var thisParameter = parameterName + i;
    if (data[thisParameter]) {
      naryData[thisParameter] = data[thisParameter]; }
    else { break; }}
  return naryData; }

function mergeObjects (object1, object2) {
  for (var parameterName in object2) {
    object1[parameterName] = object2[parameterName]; }
  return object1; }

function redirectTo (response, location) {
  response.writeHead(302, {'Location': location});
  response.end(); }

function redirectToUserPage (response, id) {
  redirectTo(response, '/user?id=' + id); }

function alreadyLoggedIn (request, response) {
  if (request && request.session && request.session.userInfo) {
    var userID = request.session.userInfo.id;
    if (userID) {
      redirectToUserPage(response, userID);
      return true; }}
  return false; }

function setUpNewUserSession (request, user) {
  request.session.userInfo = {};
  request.session.userInfo.id = user.id;
  request.session.userInfo.canContribute = user.can_contribute;
  request.session.userInfo.canAdministrate = user.can_administrate; }

function canContribute (request) {
  return request && request.session && request.session.userInfo 
      && request.session.userInfo.canContribute; }
function canAdministrate (request) {
  return request && request.session && request.session.userInfo 
      && request.session.userInfo.canAdministrate; }
function getUserID (request) {
  if (request && request.session && request.session.userInfo) {
    return request.session.userInfo.id; }
  else { return undefined; }}

// set-up routing and app logic

// FOR TESTING NEW DB LAYER
app.get('/fetchAssertable', function (request, response) {
  database2.fetchAssertable(request.query['id'], function (result) {
    response.write(JSON.stringify(result, null, 5)); response.end(); }); });
app.get('/fetchClaim', function (request, response) {
  database2.fetchClaim(request.query['id'], function (result) {
    response.write(JSON.stringify(result, null, 5)); response.end(); }); });
app.get('/searchProposition', function (request, response) {
  database2.searchProposition(request.query['query'], function (result) {
    response.write(JSON.stringify(result, null, 5)); response.end(); }); });
app.get('/searchAssertable', function (request, response) {
  database2.searchAssertable(request.query['query'], function (result) {
    response.write(JSON.stringify(result, null, 5)); response.end(); }); });
app.get('/parseForm', function (request, response) {
  database2.parseForm(request.query, function (result) {
    response.write(JSON.stringify(result, null, 5)); response.end(); }); });

app.get('/', function (request, response) {
  response.render('pages/home', {
    userInfo: request.session.userInfo}); });

app.get('/logout', function (request, response) {
  request.session.regenerate( function () {
    redirectTo(response, '/'); }); });

app.get('/terms-and-conditions', function (request, response) {
  response.render('pages/md-file-wrapper', {
    userInfo: request.session.userInfo, md: md,
    filename: 'terms-and-conditions.md'}); });
app.get('/privacy-statement', function (request, response) {
  response.render('pages/md-file-wrapper', {
    userInfo: request.session.userInfo, md: md,
    filename: 'privacy-statement.md'}); });
app.get('/legal-disclaimer', function (request, response) {
  response.render('pages/md-file-wrapper', {
    userInfo: request.session.userInfo, md: md,
    filename: 'legal-disclaimer.md'}); });

app.get('/user', function (request, response) {
  response.render('pages/md-file-wrapper', {
    userInfo: request.session.userInfo, md: md,
    filename: 'coming-soon.md'}); });
app.get('/admin', function (request, response) {
  response.render('pages/md-file-wrapper', {
    userInfo: request.session.userInfo, md: md,
    filename: 'coming-soon.md'}); });

app.get('/search', function (request, response) {
  var queryObj = request.query;
  database.search(queryObj, function (dbResults) {
    response.render('pages/search', {
      userInfo: request.session.userInfo,
      assertionResults: dbResults.assertions,
      argumentResults: dbResults.arguments,
      query: dbResults.query,
      text: dbResults.text }); }); });

app.get('/contribute', function (request, response) {
  console.log('user ' + getUserID(request) + ', with user agent ' +
      request.headers['user-agent'] + ', just navigated to url ' +
      request.protocol + '://' + request.get('host') + request.originalUrl);
  if (canContribute(request)) {
    var queryObj = request.query;
    database.contribute(queryObj, getUserID(request), function (results) {
      response.render('pages/contribute', {
        userInfo: request.session.userInfo,
        contributionPage: true,
        query: queryObj,
        contribResults: results }); }); }
  else { // TODO: "you do not have the permissions to do x" page
    redirectTo(response, '/'); }});

app.post('/google-sign-in', function (request, response) {
  if (!alreadyLoggedIn(request, response)) {
    https.request({
      host: 'www.googleapis.com',
      path: '/oauth2/v3/tokeninfo?id_token=' + request.body.idtoken },
    function (oauthResponse) {
      var responseText = '';
      oauthResponse.on('data', function (chunk) {
        responseText += chunk; });
      oauthResponse.on('end', function () {
        responseClaims = JSON.parse(responseText);
        if (responseClaims.aud.indexOf(appID) != -1) {
          database.googleIdToUser(responseClaims.sub, function (user) {
            if (user != undefined) {
              setUpNewUserSession(request, user);
              response.send({'redirectURL': '/user?id=' + user.id}); }
            else {
              request.session.googleResponseClaims = responseClaims;
              response.send({'redirectURL': '/join'}); }}); }
        else {
          response.send('error'); }});
    }).end(); }});

app.get('/join', function (request, response) {
  if (!alreadyLoggedIn(request, response)) {
    var defaultData = request.session.googleResponseClaims,
        user_type = request.query['user_type'],
        surname = request.query['surname'] || defaultData.family_name,
        given_name_s = request.query['given_name_s'] || defaultData.given_name,
        department = request.query['department'],
        institution = request.query['institution'],
        academic_email_address = request.query['academic_email_address'],
        preferred_email_address = request.query['preferred_email_address'],
        privacy_setting = request.query['privacy_setting'],
        contact_rate = request.query['contact_rate'],
        legal_notice = request.query['legal_notice'],
        specializations = getNaryRequestParameters(request.query, 'specialization'),
        google_id = defaultData.sub;
    database.makeNewUser(google_id, legal_notice, surname, given_name_s, 
        user_type, department, institution, academic_email_address,
        preferred_email_address, privacy_setting, contact_rate, specializations,
        function (userID_or_failure) {
          if (userID_or_failure) {
            var userID = userID_or_failure;
            database.userIdToUser(userID, function (user) {
              setUpNewUserSession(request, user);
              redirectToUserPage(response, userID); }); }
          else {
            database.getUserSpecializations(2, function (choices_2) {
              // TODO: refactor this object construction, the initial
              // assignment above, and the call to makeNewUser()
              var data = {
                user_type: user_type,
                surname: surname,
                given_name_s: given_name_s,
                department: department,
                institution: institution,
                academic_email_address: academic_email_address,
                preferred_email_address: preferred_email_address,
                privacy_setting: privacy_setting,
                contact_rate: contact_rate,
                specialization_choices_2: choices_2};
              response.render('pages/join', 
                  mergeObjects(data, specializations)); }); }}); }});

// finally, run the app!

var port = app.get('port');
app.listen(port, function () {

  // var test1 = {"implies":[{"proposition":"thing"},undefined]};
  // database2.searchAssertable(test1, function (results1) {
  //   console.log('results1 = ' + results1);

  //   var test2 = {"not":undefined};
  //   database2.searchAssertable(test2, function (results2) {
  //     console.log('results2 = ' + results2);
  //   });

  // });
  
  console.log('Credence Tree is now running on port ' + port + '.'); });

// done

