import path from 'path';

export const redirect = () => {
  return async (request, response, next) => {
    response.redirect = (href, body, options) => {
      response.end();
      
      options = options || {};
      options.redirect = true;
      body = body || request.body;
      
      if( href[0] !== '#' && href[0] !== '/' ) {
        href = path.resolve(path.join(request.parentURL, request.url), href);
      }
      
      /*request.app.fire('redirect', {
        options: options,
        body: body,
        href: href,
        request: request,
        response: response
      });*/
      
      request.app.href(href, body, options);
      return this;
    };
    
    await next();
  };
};
