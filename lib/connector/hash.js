import { domready } from '../util';

const chref = (n) => {
  return location.hash.substring(n) || '/';
};

export const hash = (prefix) => {
  prefix = '#' + (prefix || '');
  const n = prefix.length;

  return (app, ctx) => {
    let lasthref;
    const hashchangelistener = () => {
      var href = chref(n);
      if (location.hash.startsWith(prefix + '/') && lasthref !== href) app.href(href);
    };

    if (window.attachEvent) window.attachEvent('hashchange', hashchangelistener);
    else window.addEventListener('hashchange', hashchangelistener);

    const writestatelistener = (e) => {
      ctx && ctx.fire('writestate', e.detail);
      if (e.detail.pop) return;

      var href = prefix + e.detail.href;
      if (href === lasthref) return;

      lasthref = e.detail.href;
      if (e.detail.replace) {
        location.replace(href);
      } else {
        location.assign(href);
      }
    };

    app.on('writestate', writestatelistener);

    domready(() => {
      if (location.hash.startsWith(prefix + '/')) app.href(chref(n));
      else app.href('/');
    });

    return {
      disconnect() {
        if (window.detachEvent) window.detachEvent('hashchange', hashchangelistener);
        else window.removeEventListener('hashchange', hashchangelistener);
        app.off('writestate', writestatelistener);
      }
    };
  };
};
