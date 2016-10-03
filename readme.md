
## site description

a database of assertions and arguments made by professional philosophers

## technical information

### technologies / our stack

* platform:
  [Heroku](https://www.heroku.com/)
* runtime:
  [Node](https://nodejs.org/en/),
  [Express](http://expressjs.com/)
* storage:
  [PostgreSQL](https://www.postgresql.org/),
  [Redis](http://redis.io/)
* convenience:
  [EJS](http://ejs.co/),
  [Less](http://lesscss.org/),
  [jQuery](https://jquery.com/),
  [Markdown](http://daringfireball.net/projects/markdown/)
* ubiquitous:
  [HTML](https://www.w3.org/html/),
  [CSS](https://www.w3.org/style/css/),
  [JavaScript](https://www.javascript.com/)

### initial set-up instructions

1. `git clone git@github.com:nicholashh/credence-tree.git`
1. `git remote add heroku git@heroku.com:[YOUR-ID-HERE].git`
1. `heroku addons:create heroku-postgresql:hobby-dev`
1. `heroku addons:create heroku-redis:hobby-dev`
1. create an `.env` file and populate it using `heroku config`
1. run `/psql/schema-users.sql` and `-data` using `heroku pg:psql`
1. `npm install` to install all Node dependencies
1. `heroku local` to spin-up a local instance

### recommendations for future development

* better back-end support for:
  * storage of graphical data
    * querying with graph search algorithms
  * storage of (propositional) logical data
    * querying with logical expressions
* better front-end support for:
  * interfacing with graphical/logical data
  * creating (and re-creating) complex forms
* improve client-server communication

### other miscellaneous information

* total development time: approximately 175 hours
