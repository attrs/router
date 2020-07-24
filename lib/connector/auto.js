import { pushstate } from './pushstate';
import { hash } from './hash';

export const auto = (app, ctx) => {
  if( typeof history == 'object' && history && history.pushState )
    return pushstate(app, ctx);
  
  return hash(app, ctx);
};
