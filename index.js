
// set-up dependencies

var lessMiddleware = require('less-middleware');

var bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({extended: false})

var express = require('express');
var app = express();
app.set('port', (process.env.PORT || 5000));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(lessMiddleware(__dirname + '/public')); // 1
app.use(express.static(__dirname + '/public')); // 2

// routing information

app.get('/', function(request, response) {
  response.render('pages/home');
});

app.get('/basic-search', urlencodedParser, function(request, response) {
  response.render('pages/basic-search', {query: request.param('query')});
});

// run the app

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
