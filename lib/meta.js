module.exports = function(name, alt) {
  if( typeof document === 'object' && document.head ) {
    var tag = document.head.querySelector('meta[name="router.' + name + '"]');
    return (tag && tag.getAttribute('content')) || alt || null;
  }
  
  return alt || null;
};