var path = require('path');
var URL = require('url');
var RoutePattern = require('../util/route-pattern');
var tinyevent = require('tinyevent');

const patternize = (source, ignoresubdir) => {
  var pettern = RoutePattern.fromString(source);
  var ap = RoutePattern.fromString(source + '/*after');

  return {
    match(url) {
      if (source === '/' && ignoresubdir) return true;

      if (pettern.matches(url)) {
        return pettern.match(url).namedParams;
      } else if (ignoresubdir && ap.matches(url)) {
        var params = ap.match(url).namedParams;
        delete params.after;
        return params;
      }
      return false;
    },
    matches(url) {
      return pattern.matches(url) ? true : ignoresubdir && ap.matches(url) ? true : false;
    }
  };
};

const dividepath = (axis, full) => {
  if (axis[0] === '/') axis = axis.substring(1);
  if (full[0] === '/') full = full.substring(1);
  if (axis.endsWith('/')) axis = axis.substring(0, axis.length - 1);
  if (full.endsWith('/')) full = full.substring(0, full.length - 1);
  if (!axis)
    return {
      sub: '/' + full,
      parent: ''
    };

  while (~axis.indexOf('//')) axis.split('//').join('/');
  while (~full.indexOf('//')) full.split('//').join('/');

  axis = axis.split('/');
  full = full.split('/');
  var sub = [],
    parent = [];

  for (var i = 0; i < full.length; i++) {
    if (axis[i] && !(~axis[i].indexOf(':') || ~axis[i].indexOf('*')) && full[i] !== axis[i]) return null;

    if (i >= axis.length) sub.push(full[i]);
    else parent.push(full[i]);
  }

  return {
    parent: '/' + parent.join('/'),
    sub: '/' + sub.join('/')
  };
};

const mix = (...arg) => {
  const result = {};
  arg.forEach((o) => {
    if (o && typeof o === 'object') {
      for (const k in o) result[k] = o[k];
    }
  });
  return result;
};

let seq = 0;
export const Router = (id) => {
  id = id || seq++;
  let boot = true;
  let routes = [];

  const body = async (req, res, onext) => {
    const oRequest = (req = req || {});
    const oResponse = (res = res || {});
    const oParentURL = (req.parentURL = req.parentURL || '');
    let oURL = (req.url = req.url || '/');
    const oHref = (req.href = req.href || req.url);
    const oParams = (req.params = req.params || {});
    let finished = false;

    req._routes = req._routes || [];
    req._routes.splice(0, 0, body);

    const next = async (err) => {
      if (finished) return console.warn('[warning] next function twice called.', id, err);
      finished = true;
      boot = false;
      req.parentURL = oParentURL;
      req.url = oURL;
      req.href = oHref;
      req.params = oParams;

      if (err) {
        return events.fire(
          'error',
          {
            router: body,
            href: req.href,
            url: req.url,
            request: req,
            response: res,
            error: err
          },
          req._routes
        );
        // return onext && (await onext(err));
      }

      events.fire('notfound', {
        router: body,
        href: req.href,
        url: req.url,
        request: req,
        response: res
      });

      onext && (await onext());
    };

    try {
      let index = 0;
      const forward = async (err) => {
        if (err) return await next(err);

        try {
          const route = routes[index++];

          if (!route) return await next();
          if (!boot && route.type === 'boot') return await forward();
          //console.log(route, boot, route.pattern, route.pattern.match(req.url));

          const fn = route.fn;
          const type = route.type;
          const routepath = route.path;
          const params = route.pattern && route.pattern.match(req.url);

          if (!params) return await forward();
          req.params = mix(oParams, req.params, params);
          req.parentURL = oParentURL;
          req.url = oURL;
          req.boot = boot;

          if (!fn) console.warn('null fn', fn);

          // replace
          if (typeof fn == 'string') {
            if (fn[0] == '/' || fn[0] == '.') {
              return console.error('illegal replace url', fn);
            }

            const ohref = req.href;
            req.url = oURL = '/' + fn;
            req.href = path.join(oParentURL || '/', fn);

            /*console.debug('replace', {
              ohref: ohref,
              oParentURL: oParentURL,
              to: fn,
              'req.parentURL': req.parentURL,
              'req.href': req.href,
              'req.url': req.url
            });*/

            events.fire(
              'replace',
              {
                router: body,
                previous: ohref,
                href: req.href,
                url: req.url,
                request: req,
                response: res
              },
              req._routes
            );

            return await forward();
          }

          // sub routing
          if (fn.__router__ || fn.Routable) {
            /*console.info('-------');
            console.info('id', fn.id);
            console.info('routepath', routepath);
            console.info('url', req.url);*/

            var div = dividepath(routepath, URL.parse(req.url).pathname);
            if (!div) return await forward();
            req.parentURL = div && div.parent ? path.join(oParentURL, div.parent) : oParentURL;
            req.url = req.url.substring(div && div.parent.length);

            //console.log('sub routing', routepath, oURL, '->', req.url);

            /*console.info('result parent', req.parentURL);
            console.info('result url', req.url);
            console.info('div', div);
            console.info('-------');*/
          }

          events.fire(
            'route',
            {
              router: body,
              config: route,
              href: req.href,
              url: req.url,
              request: req,
              response: res
            },
            req._routes
          );

          let forwarded = false;
          await route.fn.apply(body, [req, res, async () => {
            forwarded = true;
            return await forward();
          }]);
          if (!forwarded) {
            finished = true;
            boot = false;
          }
        } catch (err) {
          await next(err);
        }
      };
      await forward();
    } catch (err) {
      events.fire(
        'error',
        {
          router: body,
          href: req.href,
          url: req.url,
          request: req,
          response: res,
          error: err
        },
        req._routes
      );
    }
  };

  body.Routable = true;
  body.id = id;

  body.exists = (url) => {
    let exists = false;
    routes.forEach((route) => {
      if (exists) return;
      if (route.type === 'get') {
        if (route.pattern.match(url)) exists = true;
      } else if (route.type === 'use') {
        exists = route.fn.exists(url.substring(route.path.length));
      }
    });
    return exists;
  };

  const add = (route, index) => {
    const path = route.path;
    let fn = route.fn;

    //if( !~['function', 'string'].indexOf(typeof fn) ) console.error(fn);

    if (typeof path !== 'string') throw new TypeError('path must be a string, but ' + typeof path);
    if (!fn)
      fn = route.fn = (req, res) => {
        res.end();
      };
    if (!~['function', 'string'].indexOf(typeof fn)) throw new TypeError('router must be a function or string, but ' + typeof fn);
    if (fn === body) throw new Error('cannot add router itself: ' + fn.id);

    if (typeof index == 'number' && index >= 0) routes.splice(index, 0, route);
    else routes.push(route);

    return body;
  };

  const remove = (route) => {
    route && route.fn && route.fn.disconnect && route.fn.disconnect(body);
    routes.splice(routes.indexOf(route), 1);
  };

  body.use = (path, fn) => {
    if (typeof path === 'function') (fn = path), (path = '/');

    return add({
      type: 'use',
      path: path || '/',
      pattern: patternize(path, true),
      fn: fn
    });
  };

  body.before = (path, fn) => {
    return body.use(path, fn, 0);
  };

  body.get = (path, fn) => {
    if (typeof path === 'function') (fn = path), (path = '/');

    return add({
      type: 'get',
      path: path || '/',
      pattern: patternize(path),
      fn: fn
    });
  };

  body.boot = (path, fn) => {
    if (typeof path === 'function') (fn = path), (path = '/');

    return add({
      type: 'boot',
      path: path || '/',
      pattern: patternize(path, true),
      fn: fn
    });
  };

  body.drop = body.remove = (fn) => {
    var dropfns = [];
    routes.forEach((route) => {
      if (route.fn === fn) dropfns.push(route);
    });

    dropfns.forEach((route) => {
      remove(route);
    });
    return body;
  };

  body.clear = () => {
    routes.forEach((route) => remove(route));
    routes = [];
    return body;
  };

  const events = tinyevent(body);
  body.on = (type, fn) => {
    events.on(type, fn);
    return body;
  };

  body.once = (type, fn) => {
    events.once(type, fn);
    return body;
  };

  body.off = (type, fn) => {
    events.off(type, fn);
    return body;
  };

  body.fire = (type, detail) => {
    return events.fire(type, detail);
  };

  return body;
};
