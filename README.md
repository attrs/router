# @attrs/router

[![NPM Version][npm-version]][npm-url] [![NPM Downloads][npm-total]][npm-url] [![NPM Downloads][npm-month]][npm-url] [![NPM Downloads][license]][npm-url] [![Join the chat at https://gitter.im/attrs/@attrs/router][gitter]][gitter-link]

[npm-version]: https://img.shields.io/npm/v/@attrs/router.svg?style=flat
[npm-url]: https://npmjs.org/package/@attrs/router
[npm-total]: https://img.shields.io/npm/dt/@attrs/router.svg?style=flat
[npm-month]: https://img.shields.io/npm/dm/@attrs/router.svg?style=flat
[license]: https://img.shields.io/npm/l/@attrs/router.svg?style=flat

frontend router

## Install
```sh
$ npm install @attrs/router --save
```

```javascript
var router = require('@attrs/router');
var app = router().use(...).listen();
```

## Usage
```javascript
var app = router()
  .config('view target', '#target1')  // default render target
  .config('views', '/')
  .use(function(req, res, next) {
    console.log('hello');
    next();
  })
  .get('/', function(req, res, next) {
    res.render.html('Hello!');
  })
  .use('/sub', router.Router()
     .use(function(req, res, next) {
       console.log('sub routing...');
       res.set('view target', '#target2'); // change render target dynamically
       next();
     })
     .get('/', 'index')  // redirect to `index`
     .get('/index', function(req, res, next) {
       res.render.html('sub index!',  {
         target: '#target3'
       }).end();
     })
     .get('/some', function(req, res, next) {
       res.end();
     })
     .get('/:value', function(req, res, next) {
       var value = req.params.value;
       
       res.render.html('parameter is ' + value, function(err, target) {
         if( err ) return next(err);
         console.log('render target is ', target);
       }).end();
     })
  )
  .on('end', function(e) {
    console.debug('end', e.detail.href);
  })
  .on('writestate', function(e) {
    console.debug('writestate', e.detail);
  })
  .on('notfound', function(e) {
    console.warn('notfound', e.detail.href);
  })
  .on('error', function(e) {
    console.error('error', e.detail.error);
  }).
  .listen();
```

```html
<!DOCTYPE html>

<html>
<head>
  <title></title>
  <meta charset="utf-8">
  <meta name="router.mode" content="auto">
  <script src="dist/@attrs/router.js"></script>
  <script src="app.js"></script>
</head>
<body>
  <a href="/" route>home</a>
  <a href="/sub" route>/sub</a>
  <a href="/sub/index" route>/sub/index</a>
  <a href="/sub/some" route>/sub/some</a>
  <a href="/sub/other" route>/sub/other</a>
  
  <h3>target1</h3>
  <div id="target1"></div>
  
  <h3>target2</h3>
  <div id="target2"></div>
  
  <h3>target3</h3>
  <div id="target3"></div>
</body>
</html>
```

### Configuration
> support both `pushstate` and `hash`, If you have not set up any value automatically using `pushstate` or `hashbang(#!/path)`.

```html
<meta name="router.mode" content="pushstate | hashbang | hash | auto">
<meta name="router.debug" content="false | true">
<meta name="router.observe" content="true | false">
<meta name="router.observe.delay" content="1000">
```


### HTML
```html
<a href="/a/b/c/d/e" route>/a/b</a>
<a href="/a/b/c/d/e" route ghost>/a/c</a>
<a href="javascript:router.href('/a/b/c/d');">router.href('/a/b/c/d')</a>
```

### License
Licensed under the MIT License.
See [LICENSE](./LICENSE) for the full license text.
