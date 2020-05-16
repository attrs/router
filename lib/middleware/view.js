export const view = (app) => {
  const renderers = {
    html: async (html, options, target) => {
      if( typeof html !== 'string' ) throw new Error(`html must be a string`);
      target.innerHTML = html;
    }
  };
  
  app.view = (name, fn) => {
    if( !name || typeof name !== 'string' ) throw new Error('renderer name must be a string');
    if( !fn || typeof fn !== 'function' ) throw new Error('renderer fn must be a function');
    renderers[name] = fn;
    return app;
  };
  
  return (request, response, next) => {
    response.view = async (src, options, type) => {
      if( !src ) throw new Error('missing src');
      if( typeof options === 'string' ) type = options, options = null;
      options = options || {};
      
      const renderer = renderers[type || response.config('view.default') || app.config('view.default') || 'html'];
      if( !renderer ) throw new Error(`view type "${type}" not found`);
      
      if( !options ) options = {};
      if( typeof options === 'string' ) options = {target:options};
      if( typeof options !== 'object' ) return done(new TypeError('options must be an object or string(target)'));
      
      const target = response.config('view.target') || app.config('view.target');
      const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
      if( !targetElement ) throw new Error(`render target element "${target}" not found`);
      
      if( !await app.fire('beforerender', {
        href: request.href,
        options,
        src,
        target: targetElement,
        url: request.url,
        request,
        response
      }) ) {
        // render process prevented
        throw new Error(`"${request.url}" rendering prevented`);
      }

      if( app.id ) targetElement.setAttribute('data-router-scope', app.id);
      else target.setAttribute('data-router-scope', '');
      targetElement.setAttribute('data-router-base', request.parentURL);
      
      const result = await renderer(src, options, targetElement);

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
    };

    // access it with res.view.{typename}(...)
    Object.keys(renderers).forEach((type) => {
      response.view[type] = async (src, options) => {
        return response.view(src, options, type);
      };
    });
    
    next();
  };
};
