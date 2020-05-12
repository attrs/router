import URL from 'url';
import { domready } from '../util';

let stateseq = 0;
const genstateseq = (app) => {
  stateseq = stateseq + 1;
  return app.id + ':' + stateseq;
};

const chref = () => {
  return URL.parse(location.href).path;
};

export const pushstate = (app, ctx) => {
  if (typeof history !== 'object' && !(history && history.pushState)) return console.error("[@attrs/router] browser does not support 'history.pushState'");

  const staterefs = {},
    empty = {};
  let laststateid;

  const pathbar_popstate = (e) => {
    // cconsole.debug('pop', e.state, staterefs[e.state], chref());
    if (!(e.state in staterefs)) return;
    var state = staterefs[e.state];
    var body = state.body;
    if (body === empty) body = null;

    app.href(chref(), body, { pop: true });
  };

  const pathbar_writestate = (e) => {
    ctx && ctx.fire('writestate', e.detail);
    if (e.detail.pop) return;

    if (e.detail.replace) {
      //delete staterefs[laststateid];
      const stateid = (laststateid = genstateseq(app));
      staterefs[stateid] = e.detail.body || empty;

      // cconsole.debug('replace', stateid, e.detail.href);
      history.replaceState(stateid, null, e.detail.href);
    } else {
      const stateid = (laststateid = genstateseq(app));
      staterefs[stateid] = e.detail.body || empty;

      // TODO: 현재의 브라우저 경로와 같은 href 라면 replaceState 를 하는게 맞을지.
      // console.debug('push', stateid, e.detail.href);
      history.pushState(stateid, null, e.detail.href);
    }
  };

  window.addEventListener('popstate', pathbar_popstate);
  app.on('writestate', pathbar_writestate);

  domready(() => {
    app.href(chref());
  });

  return {
    disconnect() {
      document.removeEventListener('popstate', pathbar_popstate);
      app.off('writestate', pathbar_writestate);
    }
  };
};
