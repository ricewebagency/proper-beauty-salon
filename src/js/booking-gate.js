// Pincode-toegang tot de boekingskalender (tijdelijke klantenstop).
(() => {
  const config = window.PB_BOOKING_LOCK;
  const gate = document.getElementById('booking-gate');
  const calendar = document.getElementById('booking-calendar');
  const form = document.getElementById('booking-pin-form');
  const messageEl = document.getElementById('booking-pin-message');
  if (!config || !gate || !calendar || !form || !messageEl) return;

  const inputs = Array.from(form.querySelectorAll('.pb-pin-input'));
  const SESSION_KEY = 'pb-booking-access';
  const ATTEMPTS_KEY = 'pb-booking-attempts';
  const MAX_ATTEMPTS = 5;
  const LOCK_MS = 60 * 1000;
  const MSG_WRONG = 'Onjuiste pincode. Probeer het opnieuw.';
  const UNLOCK_DELAY_MS = 900;

  const store = {
    get(area, key) {
      try { return JSON.parse(window[area].getItem(key)); } catch { return null; }
    },
    set(area, key, value) {
      try { window[area].setItem(key, JSON.stringify(value)); } catch { /* opslag niet beschikbaar */ }
    },
    remove(area, key) {
      try { window[area].removeItem(key); } catch { /* opslag niet beschikbaar */ }
    },
  };

  const fromB64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

  async function unlock(pin) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: fromB64(config.salt), iterations: config.iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(config.iv) }, key, fromB64(config.data));
      return new TextDecoder().decode(plain);
    } catch {
      return null;
    }
  }

  function showCalendar(formId, animate) {
    gate.hidden = true;
    calendar.hidden = false;

    const embed = document.createElement('div');
    embed.style.width = '100%';
    embed.setAttribute('data-fillout-id', formId);
    embed.setAttribute('data-fillout-embed-type', 'standard');
    embed.setAttribute('data-fillout-inherit-parameters', '');
    embed.setAttribute('data-fillout-dynamic-resize', '');
    calendar.appendChild(embed);

    const script = document.createElement('script');
    script.src = 'https://server.fillout.com/embed/v1/';
    document.body.appendChild(script);

    if (animate) {
      calendar.classList.add('pb-fade-in');
      calendar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Al ontgrendeld in deze browsersessie (en pincode sindsdien niet gewijzigd)?
  const session = store.get('sessionStorage', SESSION_KEY);
  if (session && session.v === config.salt && session.id) {
    showCalendar(session.id, false);
    return;
  }

  // --- Invoervakjes ---
  const pinValue = () => inputs.map((i) => i.value).join('');

  // tone: 'error' | 'info' | 'success'
  function setMessage(message, tone = 'error') {
    messageEl.textContent = message;
    messageEl.dataset.tone = tone;
    inputs.forEach((i) => i.classList.toggle('is-error', Boolean(message) && tone === 'error'));
  }

  const firstEmpty = () => inputs.find((i) => i.value === '');

  function syncFilled() {
    inputs.forEach((i) => i.classList.toggle('is-filled', i.value !== ''));
  }

  function fillFrom(index, digits) {
    let i = index;
    for (const d of digits) {
      if (i >= inputs.length) break;
      inputs[i].value = d;
      i += 1;
    }
    syncFilled();
    if (i < inputs.length) inputs[i].focus();
    else if (firstEmpty()) firstEmpty().focus();
    else form.requestSubmit();
  }

  inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '');
      input.value = '';
      if (messageEl.textContent && !isLocked()) setMessage('');
      if (digits) fillFrom(index, digits);
      else syncFilled();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        form.requestSubmit();
      } else if (e.key === 'Backspace' && !input.value && index > 0) {
        e.preventDefault();
        inputs[index - 1].value = '';
        inputs[index - 1].focus();
        syncFilled();
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        inputs[index - 1].focus();
      } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
        e.preventDefault();
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
      if (digits) fillFrom(index, digits);
    });

    input.addEventListener('focus', () => input.select());
  });

  // --- Beperking foutieve pogingen ---
  let lockTimer = null;

  function lockedUntil() {
    const state = store.get('localStorage', ATTEMPTS_KEY);
    return state && state.until > Date.now() ? state.until : 0;
  }

  const isLocked = () => lockedUntil() > 0;

  function setDisabled(disabled) {
    inputs.forEach((i) => { i.disabled = disabled; });
  }

  function startLockCountdown() {
    clearInterval(lockTimer);
    const tick = () => {
      const remaining = Math.ceil((lockedUntil() - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(lockTimer);
        setDisabled(false);
        setMessage('');
        inputs[0].focus();
        return;
      }
      setDisabled(true);
      setMessage(`Te veel onjuiste pogingen. Probeer het over ${remaining} seconden opnieuw.`);
    };
    tick();
    lockTimer = setInterval(tick, 1000);
  }

  function registerFailure() {
    const state = store.get('localStorage', ATTEMPTS_KEY) || { count: 0, until: 0 };
    state.count += 1;
    if (state.count >= MAX_ATTEMPTS) {
      state.count = 0;
      state.until = Date.now() + LOCK_MS;
    }
    store.set('localStorage', ATTEMPTS_KEY, state);
    return state.until > Date.now();
  }

  function shake() {
    const row = inputs[0].parentElement;
    row.classList.remove('pb-pin-shake');
    void row.offsetWidth;
    row.classList.add('pb-pin-shake');
  }

  if (isLocked()) startLockCountdown();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isLocked()) return startLockCountdown();

    const pin = pinValue();
    if (!/^\d{4}$/.test(pin)) {
      setMessage('Vul alle vier de cijfers in.');
      firstEmpty()?.focus();
      return;
    }

    if (!window.crypto?.subtle) {
      setMessage('Je browser ondersteunt deze controle niet. Neem contact met mij op.');
      return;
    }

    setDisabled(true);
    setMessage('Controleren…', 'info');
    const formId = await unlock(pin);

    if (formId) {
      store.remove('localStorage', ATTEMPTS_KEY);
      store.set('sessionStorage', SESSION_KEY, { id: formId, v: config.salt });
      setMessage('Welkom terug!', 'success');
      gate.classList.add('is-unlocked');
      setTimeout(() => showCalendar(formId, true), UNLOCK_DELAY_MS);
      return;
    }

    inputs.forEach((i) => { i.value = ''; });
    syncFilled();
    shake();
    if (registerFailure()) {
      startLockCountdown();
    } else {
      setDisabled(false);
      setMessage(MSG_WRONG);
      inputs[0].focus();
    }
  });
})();
