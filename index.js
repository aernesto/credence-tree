
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

var pg = require('pg');     
pg.defaults.ssl = true;

// routing information

app.get('/', function(request, response) {
  response.render('pages/home');
});

app.get('/basic-search', urlencodedParser, function(request, response) {
  pg.connect(process.env.DATABASE_URL, function(error, client, done) {
    query_text = request.query['query'];
    client.query('select * from search_propositions($1)',
          [query_text], function(error, result) {
      done();
      if (error) {
        console.error(err);
        response.send("error: " + err);
      } else {
        response.render('pages/basic-search', {
          query: query_text,
          results: result.rows
        });
      }
    });
  });
});

// run the app

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
