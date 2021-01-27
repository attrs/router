import path from 'path';

export const href = () => {
  return async function Href(request, response, next) {
    response.href = (href, body, options) => {
      if( href[0] !== '#' && href[0] !== '/' ) {
        href = path.resolve(path.join(request.parentURL, request.url), href);
      }
      
      request.app.href(href, body, options);
      return response;
    };
    
    await next();
  };
};
