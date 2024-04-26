import URL from 'url';
import querystring from 'querystring';
import { Router } from './router';
import { meta } from './util';
import { connector } from './connector';

const middlewares = [];

function abs(curl, url) {
  if (!url) return '/';
  if (url[0] === '/') return url;
  if (!curl) return '/' + url;

  return URL.resolve(curl, url);
}

function resolveURL(dir, url) {
  if (!url) return '/';
  if (url.trim()[0] === '/') return url;
  if (!dir) dir = '/';
  if (!dir.endsWith('/')) dir += '/';

  return URL.resolve(dir, url);
}

export const Application = function (id) {
  var router = Router(id),
    debug = meta('debug') === 'true' ? true : false,
    config = {},
    session = {},
    defparams = {},
    history = [],
    referer,
    currenthref,
    committedhref;

  if (debug) console.debug('app created', id);

  // init middlewares
  middlewares.forEach(function (middleware) {
    router.use(middleware(router));
  });

  // config
  router.debug = function (b) {
    if (!arguments.length) return debug;
    debug = !!b;
    return this;
  };

  router.config = function (key, value) {
    if (arguments.length <= 1) return config[key];
    if (value === null || value === undefined) delete config[key];
    else config[key] = value;
    return this;
  };

  router.set = function (key, value) {
    router.config(key, value);
    return this;
  };

  router.session = function () {
    if (!arguments.length) return session;
    if (arguments.length === 1) return session[key];
    if (value === undefined) delete session[key];
    session[key] = value;
    return this;
  };

  router.params = function (key, value) {
    if (!arguments.length) return defparams;
    if (arguments.length === 1) return defparamgs[key];
    if (value === undefined) delete defparams[key];
    defparams[key] = value;
    return this;
  };

  // history
  var pushhistory = function (href, replace) {
    if (replace) history[history.length - 1] = href;
    else history.push(href);

    if (history.length > 30) history = history.slice(history.length - 30);
  };

  router.state = function (index) {
    index = +index || 0;
    return history[history.length - 1 + index];
  };

  router.history = function () {
    return history;
  };

  router.referer = function () {
    return referer;
  };

  // request
  const prepare = (href) => {
    var resconfig = {};
    var finished = false;
    var parsed = URL.parse(href);
    var params = defparams;

    const request = {
      app: router,
      method: 'get',
      fullhref: href,
      href,
      url: href,
      parsed,
      hash: parsed.hash,
      query: querystring.parse(parsed.query),
      session,
      options: {},
      body: {},
      params
    };

    const response = {
      get(key) {
        return resconfig[key];
      },
      set(key, value) {
        response.config(key, value);
        return response;
      },
      config(key, value) {
        if (!arguments.length) return resconfig;
        if (arguments.length === 1) return resconfig[key];
        if (value === null || value === undefined) delete resconfig[key];
        else resconfig[key] = value;
        return response;
      },
      end() {
        if (finished) throw new Error("[@attrs/router] request '" + request.href + "' already finished.");
        finished = true;
        router.fire('end', {
          url: request.url,
          href: request.href,
          request: request,
          response: response
        });
      }
    }

    return {
      request,
      response
    };
  };

  router.href = (requesthref, body, options) => {
    if (!requesthref) return console.error("[@attrs/router] missing 'href'");
    if (typeof requesthref === 'number') url = url + '';
    if (typeof requesthref !== 'string') return console.error("[@attrs/router] argument 'href' must be a string but, ", requesthref);
    if (typeof body === 'boolean') (options = { writestate: body }), (body = null);
    if (typeof options === 'boolean') options = { writestate: options };
    if (!options || typeof options !== 'object') options = {};

    var href = abs(router.state(), requesthref);
    var force = options.force === true ? true : false;
    var writestate = options.writestate === false ? false : true;
    var replace = options.replace === true ? true : false;
    var pop = options.pop === true ? true : false;

    if (debug)
      console.debug('href', requesthref, {
        href: href,
        currenthref: currenthref,
        committedhref: committedhref,
        force: force,
        writestate: writestate,
        prevstate: router.state()
      });

    /*
    if (!force) {
      if (currenthref === href || committedhref === href) {
        if (debug) console.debug('ignored', href, currenthref, committedhref);
      }
    }
    */

    const { request, response } = prepare(href);

    request.requesthref = requesthref;
    request.referer = currenthref;
    request.options = options;
    request.body = body = body || {};

    if (
      router.fire('beforerequest', {
        href: href,
        request: request,
        response: response
      })
    ) {
      if (writestate) {
        pushhistory(href, replace);
        router.fire('writestate', {
          href: href,
          pop: pop,
          replace: replace,
          commit: false,
          request: request,
          response: response
        });
      }

      currenthref = href;
      router(request, response);

      router.fire('request', {
        href: href,
        request: request,
        response: response
      });
    } else if (debug) {
      console.debug('[@attrs/router] beforerequest event prevented');
    }

    return router;
  };

  router.refresh = function (statebase) {
    statebase = statebase === false ? false : true;

    if (!statebase) {
      if (currenthref) return router.href(currenthref, null, { force: true });
      return;
    }

    var state = router.state();
    if (state) return router.href(state, null, { force: true });
  };

  router.on('end', function (e) {
    var href = e.detail.href;
    var request = e.detail.request;
    var response = e.detail.response;
    var writestate = request.options.writestate === false ? false : true;

    if (writestate) {
      committedhref = href;
      pushhistory(href, true);

      router.fire('writestate', {
        href: href,
        commit: true,
        replace: true,
        request: request,
        response: response
      });
    }
  });

  router.on('replace', function (e) {
    if (debug) console.debug('[@attrs/router] replace', e.detail.previous, '->', e.detail);
    if (e.detail.request.app !== router) return;

    var request = e.detail.request;
    if (request.options.writestate !== false) {
      pushhistory(e.detail.href, true);

      router.fire('writestate', {
        href: e.detail.href,
        replace: true,
        commit: false,
        request: request,
        response: e.detail.response
      });
    }
  });

  router.listen = function (options) {
    router.connector = connector.connect(router, options);
    return router;
  };

  router.close = function () {
    connector.disconnect(router);
    delete router.connector;
    return router;
  };

  return router;
};

Application.connector = connector;
Application.Router = Router;
Application.middleware = {
  add(fn) {
    middlewares.push(fn);
    return this;
  },
  remove(fn) {
    if (~middlewares.indexOf(fn)) middlewares.splice(middlewares.indexOf(fn), 1);
    return this;
  },
  list() {
    return middlewares;
  }
};
