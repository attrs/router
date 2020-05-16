export const domready = (fn) => {
  if( document.body ) {
    window.setTimeout(fn, 1);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      window.setTimeout(fn, 1);
    });
  }
};