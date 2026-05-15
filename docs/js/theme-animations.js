document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealElements = Array.from(document.querySelectorAll('[data-reveal]'));
  const introFold = window.innerHeight * 0.95;

  revealElements.forEach((element, index) => {
    element.classList.add('pb-reveal');
    const isHero = Boolean(element.closest('[data-reveal-zone="hero"]'));
    const isHeaderReveal = element.hasAttribute('data-reveal-header');
    if (isHeaderReveal) {
      element.classList.add('pb-reveal-header');
      element.style.setProperty('--pb-reveal-duration', '980ms');
    }

    const isIntro = element.getBoundingClientRect().top <= introFold;
    if (isIntro && !isHeaderReveal) {
      element.classList.add('pb-reveal-intro');
    }

    if (isHero) {
      element.style.setProperty('--pb-reveal-intro-duration', '1150ms');
    }

    const customDelay = Number.parseInt(element.dataset.revealDelay || '', 10);
    const step = Number.isNaN(customDelay) ? index % 4 : customDelay;
    const stagger = isHeaderReveal ? 160 : (isHero ? 120 : (isIntro ? 240 : 90));
    element.style.transitionDelay = `${Math.max(step, 0) * stagger}ms`;
  });

  const startReveal = () => {
    revealElements.forEach(element => element.classList.add('is-visible'));
  };

  // Ensure initial hidden state is painted before we toggle visibility.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(startReveal);
  });

  const parallaxLayers = Array.from(document.querySelectorAll('[data-parallax]'));
  if (!reduceMotion && parallaxLayers.length > 0) {
    let currentY = 0;
    let targetY = window.scrollY;
    let rafId = null;

    const updateParallax = () => {
      const delta = targetY - currentY;
      currentY += delta * 0.08;

      parallaxLayers.forEach(layer => {
        const speed = Number.parseFloat(layer.dataset.parallax || '0.06');
        layer.style.transform = `translate3d(0, ${(currentY * speed).toFixed(2)}px, 0)`;
      });

      if (Math.abs(delta) > 0.1) {
        rafId = window.requestAnimationFrame(updateParallax);
      } else {
        rafId = null;
      }
    };

    const onScroll = () => {
      targetY = window.scrollY;
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateParallax);
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const offerImageWraps = Array.from(document.querySelectorAll('.pb-offer-image-wrap'));
  if (!reduceMotion && offerImageWraps.length > 0) {
    const shimmerIntervalMs = 4000;

    offerImageWraps.forEach((offerImageWrap) => {
      const shimmerTriggerTarget = offerImageWrap.closest('.pb-offer-glow') || offerImageWrap;
      let shimmerTimerId = null;

      const runShimmer = () => {
        if (document.hidden) {
          scheduleNextShimmer();
          return;
        }

        offerImageWrap.classList.remove('is-shimmering');
        void offerImageWrap.offsetWidth;
        offerImageWrap.classList.add('is-shimmering');
        scheduleNextShimmer();
      };

      const scheduleNextShimmer = () => {
        if (shimmerTimerId) window.clearTimeout(shimmerTimerId);
        shimmerTimerId = window.setTimeout(runShimmer, shimmerIntervalMs);
      };

      scheduleNextShimmer();
      shimmerTriggerTarget.addEventListener('mouseenter', runShimmer);
      shimmerTriggerTarget.addEventListener('focusin', runShimmer);
      shimmerTriggerTarget.addEventListener('click', runShimmer);
      shimmerTriggerTarget.addEventListener('touchstart', runShimmer, { passive: true });
    });
  }

  const flipGalleryImage = document.querySelector('[data-flip-gallery]');
  if (!reduceMotion && flipGalleryImage) {
    const imageList = (flipGalleryImage.dataset.flipImages || '')
      .split(',')
      .map((path) => path.trim())
      .filter(Boolean);
    const intervalSeconds = Number.parseFloat(flipGalleryImage.dataset.flipInterval || '6');
    const intervalMs = Math.max(2, Number.isFinite(intervalSeconds) ? intervalSeconds : 6) * 1000;
    const flipOutDurationMs = 300;
    const flipInDurationMs = 380;
    const flipTriggerTarget = flipGalleryImage.closest('.pb-flip-frame') || flipGalleryImage;
    let activeIndex = 0;
    let isFlipping = false;
    let flipTimerId = null;

    if (imageList.length > 0) {
      // Keep the initial frame in sync with the configured order.
      activeIndex = 0;
      flipGalleryImage.src = imageList[activeIndex];

      const scheduleNextFlip = () => {
        if (flipTimerId) window.clearTimeout(flipTimerId);
        flipTimerId = window.setTimeout(() => {
          runFlip();
        }, intervalMs);
      };

      const runFlip = (triggerEvent) => {
        const focusTarget = triggerEvent?.type === 'focusin' && triggerEvent.target instanceof HTMLElement
          ? triggerEvent.target
          : null;
        if (document.hidden || isFlipping) {
          if (focusTarget && document.activeElement === focusTarget) focusTarget.blur();
          scheduleNextFlip();
          return;
        }

        scheduleNextFlip();
        isFlipping = true;
        flipGalleryImage.classList.remove('is-flipping-in', 'is-flipping-in-active');
        flipGalleryImage.classList.add('is-flipping-out');

        window.setTimeout(() => {
          activeIndex = (activeIndex + 1) % imageList.length;
          flipGalleryImage.src = imageList[activeIndex];
          flipGalleryImage.classList.remove('is-flipping-out');
          flipGalleryImage.classList.add('is-flipping-in');
          void flipGalleryImage.offsetWidth;
          flipGalleryImage.classList.add('is-flipping-in-active');

          window.setTimeout(() => {
            flipGalleryImage.classList.remove('is-flipping-in', 'is-flipping-in-active');
            isFlipping = false;
            if (focusTarget && document.activeElement === focusTarget) focusTarget.blur();
          }, flipInDurationMs);
        }, flipOutDurationMs);
      };

      scheduleNextFlip();
      flipTriggerTarget.addEventListener('mouseenter', runFlip);
      flipTriggerTarget.addEventListener('focusin', runFlip);
      flipTriggerTarget.addEventListener('click', runFlip);
      flipTriggerTarget.addEventListener('touchstart', runFlip, { passive: true });
    }
  }
});

