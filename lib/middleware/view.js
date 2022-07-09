import xmodal from '@attrs/modal';

export const view = (app) => {
  const views = {
    html: async (html, options, target) => {
      if (typeof html === 'object' && (html.__esModule || typeof html.default === 'string')) html = html.default;
      if (typeof html !== 'string') throw new Error(`html must be a string`);
      target.innerHTML = html;
      return target;
    }
  };

  app.view = (name, fn) => {
    if (!name || typeof name !== 'string') throw new Error('view name must be a string');
    if (!fn || typeof fn !== 'function') throw new Error('view fn must be a function');
    views[name] = fn;
    return app;
  };

  app.modal = (options) => {
    app.config('view.modal.options', options);
    return app;
  }

  return function ViewRenderer(request, response, next) {
    response.view = (src, options, type) => {
      if (!src) throw new Error('src cannot be null');
      if (typeof options === 'string') (type = options), (options = null);
      options = options || {};

      const viewtype = views[type || response.config('view.default') || app.config('view.default') || 'html'];
      if (!viewtype) throw new Error(`view type "${type}" not found`);

      if (typeof options !== 'object') throw new TypeError('options must be an object or string(target)');

      const fns = {
        render: async (target) => {
          target = target || response.config('view.target') || app.config('view.target');
          const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
          if (!targetElement) throw new Error(`render target element "${target}" not found`);

          if (
            !(await app.fire('beforerender', {
              href: request.href,
              options,
              src,
              target: targetElement,
              url: request.url,
              request,
              response
            }))
          ) {
            // render process prevented
            throw new Error(`"${request.url}" rendering prevented`);
          }

          const result = await viewtype(src, options, targetElement);
          app.fire('render', {
            href: request.href,
            options,
            src,
            target: targetElement,
            url: request.url,
            request: request,
            response: response
          });

          return result;
        },
        modal: async (options) => {
          if (typeof options === 'string') options = { id: options };
          if (typeof options === 'number') options = { width: options };
          if (typeof options === 'boolean') options = { closable: options };
          if (!options || typeof options !== 'object') options = {};

          const defaultoptions = Object.assign({}, app.config('view.modal.options') || {}, response.config('view.modal.options') || {});
          const modal = await xmodal.open(Object.assign({}, defaultoptions, options));
          return await fns.render(modal.body);
        }
      };

      return fns;
    };

    // access it with res.view.{typename}(...)
    Object.keys(views).forEach((type) => {
      response.view[type] = (src, options) => {
        return response.view(src, options, type);
      };
    });

    response.view.modal = xmodal;
    next();
  };
};
