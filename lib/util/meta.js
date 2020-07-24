export const meta = (name, alt) => {
  if( typeof document === 'object' && document.head ) {
    const tag = document.head.querySelector('meta[name="router.' + name + '"]');
    return (tag && tag.getAttribute('content')) || alt || null;
  }
  
  return alt || null;
};
