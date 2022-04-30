import tinyevent from 'tinyevent';
import { meta } from '../util';
import { pushstate } from './pushstate';
import { auto } from './auto';
import { hash } from './hash';

const debug = meta('debug') === 'true' ? true : false;
const defmode = meta('mode');

const apps = [];
const instances = [];
let chref;

export const connector = {};

const dispatcher = tinyevent(connector);
const types = connector.types = {
  pushstate: pushstate,
  hashbang: hash('!'),
  hash: hash(),
  auto
};

connector.href = function (href, body, options) {
  if (!arguments.length) return chref;

  const args = arguments;
  apps.forEach((app) => {
    app.href.apply(app, args);
  });

  return connector;
};

connector.refresh = function (statebase) {
  var args = arguments;
  apps.forEach((app) => {
    app.refresh.apply(app, args);
  });

  return connector;
};

connector.instances = () => {
  return apps.slice();
};

connector.connect = (app, options) => {
  if (!app) return console.error('missing argument:app');
  if (~apps.indexOf(app)) return console.error('already listening', app.id);

  options = options || {};
  const mode = options.mode || defmode || 'auto';

  if (debug) console.debug('[@attrs/router] mode:', mode);
  let type = types[mode];
  if (!type) {
    console.warn('[@attrs/router] unsupported mode: ', mode);
    type = types['auto'];
  }

  const instance = type(app, connector);
  apps.push(app);
  instances.push(instance);
  return instance;
};

connector.disconnect = (app) => {
  const pos = apps.indexOf(app);
  if (~pos) {
    instances[pos].disconnect();
    instances.splice(pos, 1);
  }
  if (~pos) apps.splice(pos, 1);
  return this;
};

connector.on = (type, fn) => {
  dispatcher.on(type, fn);
  return this;
};

connector.once = (type, fn) => {
  dispatcher.once(type, fn);
  return this;
};

connector.off = (type, fn) => {
  dispatcher.off(type, fn);
  return this;
};

connector.fire = (type, detail) => {
  if (type === 'writestate') chref = detail.href;
  dispatcher.fire(type, detail);
  return this;
};
