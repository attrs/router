if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position){
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
    var subjectString = this.toString();
    if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
      position = subjectString.length;
    }
    position -= searchString.length;
    var lastIndex = subjectString.indexOf(searchString, position);
    return lastIndex !== -1 && lastIndex === position;
  };
}

var router = module.exports = require('./app.js');
router.initiator.add(require('./initiator/render.js'));
router.initiator.add(require('./initiator/redirect.js'));

router.refresh = function() {
  return router.connector.refresh.apply(router.connector, arguments);
};

router.href = function() {
  return router.connector.href.apply(router.connector, arguments);
};

// browser only
if( typeof window === 'object' ) {
  var closest = function(el, selector) {
    var matches = (window.document || window.ownerDocument).querySelectorAll(selector), i;
    do {
      i = matches.length;
      while (--i >= 0 && matches.item(i) !== el) {};
    } while ((i < 0) && (el = el.parentElement)); 
    return el;
  };
  
  // @deprecated
  router.get = function(id, axis) {
    console.warn('[@attrs/router] @attrs/router.get is deprecated, use router.find instead');
    
    var node = router.find(id, axis);
    return node && node.router;
  };
  
  router.find = function(id, axis) {
    if( !id ) return null;
    if( typeof id == 'string' ) {
      var selector = '[data-router-id="' + id + '"]';
      var matched;
      
      if( axis && axis.nodeType === 1 ) {
        if( axis.closest ) matched = axis.closest(selector);
        else matched = closest(axis, selector);
      }
      
      matched = matched || (window.document || window.ownerDocument).querySelector(selector);
      
      return matched;
    }
    
    var node = id[0] || id;
    if( node.parentNode ) return (function() {
      while( node ) {
        if( node.router ) return node;
        node = node.parentNode;
      }
    })();
  };
  
  router.scanner = require('./scanner.js').start();
  window.router = router;
}