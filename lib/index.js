import { Application } from './Application';
import { scanner } from './scanner';
import { view, redirect } from './middleware';

Application.middleware.add(view);
Application.middleware.add(redirect);

Application.refresh = () => {
  return Application.connector.refresh.apply(Application.connector, arguments);
};

Application.href = () => {
  return Application.connector.href.apply(Application.connector, arguments);
};

// browser only
if (typeof window === 'object') {
  const closest = (el, selector) => {
    const matches = (window.document || window.ownerDocument).querySelectorAll(selector);
    let i;
    do {
      i = matches.length;
      while (--i >= 0 && matches.item(i) !== el) {}
    } while (i < 0 && (el = el.parentElement));
    return el;
  };

  // @deprecated
  Application.get = (id, axis) => {
    console.warn('[@attrs/router] @attrs/router.get is deprecated, use router.find instead');

    const node = Application.find(id, axis);
    return node && node.router;
  };

  Application.find = (id, axis) => {
    if (!id) return null;
    if (typeof id == 'string') {
      const selector = '[data-router-id="' + id + '"]';
      let matched;

      if (axis && axis.nodeType === 1) {
        if (axis.closest) matched = axis.closest(selector);
        else matched = closest(axis, selector);
      }

      matched = matched || (window.document || window.ownerDocument).querySelector(selector);

      return matched;
    }

    const node = id[0] || id;
    if (node.parentNode)
      return (() => {
        while (node) {
          if (node.router) return node;
          node = node.parentNode;
        }
      })();
  };

  Application.scanner = scanner.start();
}

export default Application;
export { Application };
