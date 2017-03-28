
## site information

### site description

a database of assertions and arguments made by professional philosophers

### current homepage url

http://www.credencetree.com/

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
  [Markdown](http://daringfireball.net/projects/markdown/)
* ubiquitous:
  [HTML](https://www.w3.org/html/),
  [CSS](https://www.w3.org/style/css/),
  [JavaScript](https://www.javascript.com/),
  [jQuery](https://jquery.com/)

### initial set-up instructions

1. `git clone git@github.com:nicholashh/credence-tree.git`
1. `git remote add heroku git@heroku.com:[YOUR-ID-HERE].git`
1. `heroku addons:create heroku-postgresql:hobby-dev`
1. `heroku addons:create heroku-redis:hobby-dev`
1. create an `.env` file and populate it using `heroku config`
1. open a psql shell with `heroku pg:psql`
  1. run the contents of `/psql/schema-users.sql`
  1. run the contents of `/psql/schema-data.sql`
1. `npm install` to install all Node dependencies
1. `heroku local` to spin-up a local instance

### recommendations for future development

* back-end: version 1.1
  * 1.0 (OLD): initial database format
  * 1.1 (CURRENT): added json intermediary
  * 1.2 (PLANNED DEVELOPMENT)
    * storage/querying of graphical data
    * storage/querying of (propositional) logical data
* front-end: version 1.0
  * 1.0 (CURRENT): initial ui format
  * 1.1 (PLANNED DEVELOPMENT)
    * interfacing with graphical/logical data
    * (re-)creating complex forms

### other miscellaneous information

* total development time: approximately ??? hours
