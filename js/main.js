// Lexonia Group - Shared JS

// Signal JS is running (gates hide-then-reveal animations)
document.documentElement.classList.add('js-ready');

// Nav scroll shadow
(function() {
  var nav = document.querySelector('nav.main-nav');
  if (!nav) return;
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
// Mobile hamburger
(function() {
  var btn   = document.querySelector('.nav-hamburger');
  var links = document.querySelector('.nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', function() {
    var open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  links.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() {
      links.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', function(e) {
    if (!btn.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();

// Mark active nav link
(function() {
  var path = window.location.pathname.replace(/\/$/, '');
  var filename = path.split('/').pop() || 'index.html';
  if (filename === '') filename = 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function(a) {
    if (a.classList.contains('nav-cta')) return;
    var href = (a.getAttribute('href') || '').split('#')[0];
    var hFile = href.split('/').pop();
    if (!hFile) return;
    if (hFile === filename) {
      a.classList.add('active');
    }
  });
})();
// Fade-in on scroll
(function() {
  var els = document.querySelectorAll('.fade-in');
  if (!els.length) return;
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(function(el) { obs.observe(el); });
})();

// Stat counter - counts from 0 to target, staggered on page load
(function() {
  var stats = document.querySelectorAll('.stat-roll');
  if (!stats.length) return;

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function runCount(el) {
    var to     = parseFloat(el.dataset.to) || 0;
    var suffix = el.dataset.suffix !== undefined ? el.dataset.suffix : '';
    var dur    = 2200;
    var start  = null;
    el.textContent = '0' + suffix;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / dur, 1);
      var current  = Math.round(to * easeOutExpo(progress));
      el.textContent = current + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = to + suffix;
      }
    }
    requestAnimationFrame(step);
  }

  stats.forEach(function(el) {
    var delay = parseInt(el.dataset.delay, 10) || 0;
    setTimeout(function() {
      el.classList.add('rolled');
      if (el.dataset.text) {
        setTimeout(function() { el.textContent = el.dataset.text; }, 300);
      } else {
        runCount(el);
      }
    }, 600 + delay);
  });
})();
// Back-to-top button
(function() {
  var btn = document.createElement('button');
  btn.textContent = '^';
  btn.setAttribute('aria-label', 'Back to top');
  btn.style.cssText = 'position:fixed;bottom:28px;right:28px;width:44px;height:44px;border-radius:50%;background:var(--navy);color:#fff;border:none;font-size:20px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(43,57,144,.35);z-index:200;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;pointer-events:none';
  document.body.appendChild(btn);
  function updateBtn() {
    var show = window.scrollY > 400;
    btn.style.opacity  = show ? '1' : '0';
    btn.style.transform = show ? 'translateY(0)' : 'translateY(8px)';
    btn.style.pointerEvents = show ? 'auto' : 'none';
  }
  window.addEventListener('scroll', updateBtn, { passive: true });
  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// Smooth anchor scroll for in-page links
(function() {
  document.querySelectorAll('a[href*="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var href  = a.getAttribute('href') || '';
      var parts = href.split('#');
      var hash  = parts[1];
      if (!hash) return;
      var file    = parts[0];
      var curFile = window.location.pathname.split('/').pop() || 'index.html';
      if (file && file !== '' && file !== curFile) return;
      var target = document.getElementById(hash);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top: top, behavior: 'smooth' });
      history.pushState(null, '', '#' + hash);
    });
  });
})();

// Service nav pill highlight on scroll
(function() {
  var pills = document.querySelectorAll('.service-nav a[href^="#"]');
  if (!pills.length) return;
  var sections = [];
  pills.forEach(function(p) {
    var id = p.getAttribute('href').slice(1);
    var el = document.getElementById(id);
    if (el) sections.push({ el: el, pill: p });
  });
  function setActive() {
    var scrollY = window.scrollY + 130;
    var active  = null;
    sections.forEach(function(s) {
      if (s.el.offsetTop <= scrollY) active = s;
    });
    pills.forEach(function(p) { p.classList.remove('active'); });
    if (active) active.pill.classList.add('active');
  }
  window.addEventListener('scroll', setActive, { passive: true });
  setActive();
})();

// Scroll progress bar
(function() {
  var bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:0%;background:var(--navy);z-index:9999;transition:width .08s linear;pointer-events:none;';
  document.body.appendChild(bar);
  window.addEventListener('scroll', function() {
    var total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (total > 0 ? (window.scrollY / total * 100) : 0) + '%';
  }, { passive: true });
})();
