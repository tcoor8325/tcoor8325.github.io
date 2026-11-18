const jumpOldest = document.querySelector('.jump-oldest');
const jumpNewest = document.querySelector('.jump-newest');
let scrollAnimation;

function updateJumpButtons() {
  const bottom = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  if (jumpNewest) jumpNewest.hidden = window.scrollY <= 0;
  if (jumpOldest) jumpOldest.hidden = window.scrollY >= bottom - 1;
}

window.addEventListener('scroll', updateJumpButtons, { passive: true });
window.addEventListener('resize', updateJumpButtons);
window.addEventListener('pageshow', updateJumpButtons);
document.addEventListener('load', updateJumpButtons, true);
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(updateJumpButtons).observe(document.documentElement);
}
updateJumpButtons();

function jumpTo(newest) {
  cancelAnimationFrame(scrollAnimation);
  const start = window.scrollY;
  const startedAt = performance.now();
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 550;

  // Begin loading later photos so the destination settles during the scroll.
  if (!newest) {
    document.querySelectorAll('#journal img').forEach(image => {
      image.loading = 'eager';
    });
  }

  function animateScroll(now) {
    const progress = duration ? Math.min((now - startedAt) / duration, 1) : 1;
    const eased = 1 - Math.pow(1 - progress, 3);
    const destination = newest ? 0 : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, start + (destination - start) * eased);
    if (progress < 1) scrollAnimation = requestAnimationFrame(animateScroll);
    else updateJumpButtons();
  }

  scrollAnimation = requestAnimationFrame(animateScroll);
}

jumpOldest?.addEventListener('click', () => jumpTo(false));
jumpNewest?.addEventListener('click', () => jumpTo(true));
