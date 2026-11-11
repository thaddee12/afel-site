/* afel-scroll.js : animations au défilement des pages intérieures de l'AFEL.
   Même langage que l'accueil : les blocs montent, les titres se dévoilent, les photos se
   découvrent en balayage, les fonds d'en-tête défilent plus lentement que la page, les
   bandeaux glissent sur le côté.

   Pose : charger GSAP puis ce fichier, et marquer le conteneur du contenu avec data-pmain.
   Le contenu est rendu après le chargement et change sans recharger la page : le module
   repère seul les nouveaux éléments.

   Règles de maison :
   - seul ce qui est encore sous l'écran est caché, rien de ce qu'on voit déjà ne disparaît ;
   - une apparition ne se rejoue pas ;
   - mouvement réduit : rien ne bouge ;
   - onglet masqué : tout est révélé, pour qu'aucun bloc ne reste invisible. */
(function () {
  if (window.AFELScroll) return;
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hidden = [], heroes = [], io = null, scanT = 0, ticking = false, side = 0;

  function G() { return window.gsap; }
  function main() { return document.querySelector('[data-pmain]'); }
  function below(el) { return el.getBoundingClientRect().top > window.innerHeight * 0.92; }
  function abs(el) { var p = getComputedStyle(el).position; return p === 'absolute' || p === 'fixed'; }
  function out(el) { return !!el.closest('[role=dialog], header, nav'); }
  function busy(el) { return el.style.transform || el.style.opacity || el.style.clipPath; }

  /* ---------- départ : l'état caché de chaque type ---------- */
  var FROM = {
    up: function (g, el) { g.set(el, { y: 36, opacity: 0 }); },
    title: function (g, el) { g.set(el, { y: 30, clipPath: 'inset(0% 0% 100% 0%)' }); },
    img: function (g, el) { g.set(el, { clipPath: 'inset(0% 100% 0% 0%)' }); var i = el.querySelector('img'); if (i) g.set(i, { scale: 1.2 }); },
    band: function (g, el) { el.__rvX = (side++ % 2 ? 1 : -1) * 90; g.set(el, { x: el.__rvX, opacity: 0 }); }
  };
  /* ---------- arrivée ---------- */
  var TO = {
    up: function (g, el, d) { g.to(el, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: d, clearProps: 'transform,opacity' }); },
    title: function (g, el, d) { g.to(el, { y: 0, clipPath: 'inset(0% 0% -20% 0%)', duration: 0.8, ease: 'power3.out', delay: d, clearProps: 'transform,clipPath' }); },
    img: function (g, el, d) {
      g.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut', delay: d, clearProps: 'clipPath' });
      var i = el.querySelector('img'); if (i) g.to(i, { scale: 1, duration: 1.4, ease: 'power3.out', delay: d, clearProps: 'transform' });
    },
    band: function (g, el, d) { g.to(el, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: d, clearProps: 'transform,opacity' }); }
  };

  function observer() {
    if (io) return io;
    io = new IntersectionObserver(function (es) {
      var g = G(), n = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; io.unobserve(el);
        hidden = hidden.filter(function (x) { return x !== el; });
        if (g && el.__rvT) TO[el.__rvT](g, el, Math.min(n++, 4) * 0.08);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    return io;
  }

  function arm(el, type) {
    if (el.__rvT || busy(el) || out(el)) return;
    el.__rvT = type;
    if (!below(el)) return;            // déjà à l'écran : on n'y touche pas
    FROM[type](G(), el); hidden.push(el); observer().observe(el);
  }

  function scan() {
    var g = G(), m = main();
    if (!g || !m || reduced || document.visibilityState !== 'visible') return;

    // Fonds d'en-tête : parallaxe (photos posées directement dans une section, pas les ornements)
    m.querySelectorAll('section > img').forEach(function (i) {
      if (i.__par || !abs(i) || out(i) || /\.svg(\?|$)/i.test(i.currentSrc || i.getAttribute('src') || '')) return; i.__par = 1; heroes.push(i);
      var s = i.parentElement; if (getComputedStyle(s).overflow === 'visible') s.style.overflow = 'hidden';
    });
    heroes = heroes.filter(function (i) { return i.isConnected; });

    // Bandeaux d'appel et colonnes du pied de page
    m.querySelectorAll('[aria-label="Comment agir"] > a').forEach(function (a) { arm(a, 'band'); });
    m.querySelectorAll('footer > div').forEach(function (d) { arm(d, 'up'); });

    // Photos de contenu : balayage de leur cadre
    m.querySelectorAll('img').forEach(function (i) {
      var box = i.parentElement;
      if (!abs(i) || !box || box.tagName === 'SECTION' || i.closest('footer, [aria-label="Comment agir"]')) return;
      if (box.clientWidth < 120 || box.clientHeight < 90) return;
      arm(box, 'img');
    });

    // Titres
    m.querySelectorAll('h2').forEach(function (h) { if (!h.closest('footer, [aria-label="Comment agir"]')) arm(h, 'title'); });

    // Blocs de texte, listes, cartes
    var picked = [];
    m.querySelectorAll('p, ul, ol, figure, blockquote, form, article, [data-rv]').forEach(function (el) {
      if (el.closest('footer, [aria-label="Comment agir"]') || abs(el)) return;
      for (var k = 0; k < picked.length; k++) if (picked[k].contains(el)) return;
      for (var p = el.parentElement; p && p !== m; p = p.parentElement) if (p.__rvT === 'up') return;
      picked.push(el); arm(el, 'up');
    });
    parallax();
  }

  function parallax() {
    ticking = false;
    var vh = window.innerHeight;
    for (var k = 0; k < heroes.length; k++) {
      var i = heroes[k], s = i.parentElement; if (!s) continue;
      var r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      i.style.translate = '0 ' + Math.max(0, -r.top * 0.3).toFixed(1) + 'px';
    }
  }

  function revealAll() {
    var g = G();
    hidden.forEach(function (el) {
      if (g) { g.killTweensOf(el); g.set(el, { clearProps: 'transform,opacity,clipPath' }); var i = el.querySelector && el.querySelector('img'); if (i && el.__rvT === 'img') g.set(i, { clearProps: 'transform' }); }
    });
    hidden = []; if (io) { io.disconnect(); io = null; }
  }

  function later() { clearTimeout(scanT); scanT = setTimeout(scan, 140); }

  function start() {
    if (reduced) return;
    var tries = 0;
    (function wait() {
      if (main() && G()) {
        scan();
        new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
        window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
        window.addEventListener('resize', later);
        document.addEventListener('visibilitychange', function () { if (document.hidden) revealAll(); });
      } else if (tries++ < 100) setTimeout(wait, 60);
    })();
  }

  window.AFELScroll = { scan: scan, revealAll: revealAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
