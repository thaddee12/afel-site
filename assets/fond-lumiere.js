// <fond-lumiere> : fond animé discret (canvas) : halos lumineux, éclats scintillants, éléments qui tombent lentement.
// Attributs : color (hex, défaut #B8964E), colors (plusieurs hex séparés par des virgules : chaque élément prend une couleur au hasard, remplace color), density (0.25 à 2.5, défaut 1), shape ("losange" | "feuillet" | "petale" | "aucun", défaut "losange"),
// paused (présent : l'animation s'arrête, utile quand le bloc est recouvert par une autre scène).
// Usage : <section style="position:relative;overflow:hidden"> <fond-lumiere color="#B8964E" density="0.8"></fond-lumiere> … </section>
(function () {
  if (customElements.get('fond-lumiere')) return;
  const hexToRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); const n = parseInt(m ? m[1] : 'B8964E', 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const mobile = () => matchMedia('(max-width: 760px)').matches;
  class FondLumiere extends HTMLElement {
    connectedCallback() {
      if (this._on) return; this._on = true;
      Object.assign(this.style, { position: 'absolute', inset: '0', pointerEvents: 'none', display: 'block' });
      const r = this.shadowRoot || this.attachShadow({ mode: 'open' });
      r.innerHTML = '<canvas style="display:block;width:100%;height:100%;opacity:0;transition:opacity 2.4s ease"></canvas>';
      this.c = r.querySelector('canvas'); this.ctx = this.c.getContext('2d');
      const list = (this.getAttribute('colors') || '').split(',').map(x => x.trim()).filter(Boolean);
      this.pal = (list.length ? list : [this.getAttribute('color')]).map(hexToRgb);
      this.density = Math.max(0.25, Math.min(2.5, parseFloat(this.getAttribute('density')) || 1));
      this.shape = this.getAttribute('shape') || 'losange';
      this.mouse = { x: -1e4, y: -1e4 }; this.t = 0;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.onMove = e => { const b = this.c.getBoundingClientRect(); this.mouse.x = e.clientX - b.left; this.mouse.y = e.clientY - b.top; };
      window.addEventListener('pointermove', this.onMove, { passive: true });
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this); this.resize();
      requestAnimationFrame(() => { this.c.style.opacity = '1'; });
      this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: '120px' }); this.io.observe(this);
      let drawn = false;
      const loop = () => { if (this.visible !== false && !document.hidden && !this.hasAttribute('paused') && !(this.reduced && drawn)) { this.draw(); drawn = true; } this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
    }
    disconnectedCallback() { cancelAnimationFrame(this.raf); this.ro && this.ro.disconnect(); this.io && this.io.disconnect(); window.removeEventListener('pointermove', this.onMove); this._on = false; }
    pick() { return this.pal[Math.floor(Math.random() * this.pal.length)]; }
    item(w, h, top) { const sc = this.sc || 1; return { c: this.pick(), x: rnd(0, w), y: top ? rnd(-h * 0.2, -20) : rnd(0, h), s: rnd(5, 11) * sc, vy: rnd(0.15, 0.4), sway: rnd(0.4, 1.2), ph: rnd(0, 6.28), rot: rnd(0, 6.28), vr: rnd(-0.01, 0.01), op: Math.min(0.9, rnd(0.3, 0.65) + (this.opB || 0)), dx: 0 }; }
    resize() {
      const w = this.clientWidth, h = this.clientHeight; if (!w || !h) return;
      const dpr = Math.min(mobile() ? 1.5 : 2, window.devicePixelRatio || 1);
      this.w = w; this.h = h; this.c.width = w * dpr; this.c.height = h * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const mob = mobile();
      this.sc = mob ? 1.4 : 1; this.opB = mob ? 0.2 : 0;   // sur téléphone : éléments plus grands et plus francs, sinon ils disparaissent
      const k = mob ? this.density * 1.1 : this.density * Math.min(1.5, Math.max(0.4, (w * h) / (1280 * 900)));
      this.orbs = Array.from({ length: Math.max(6, Math.round(16 * k)) }, () => ({ c: this.pick(), x: rnd(0, w), y: rnd(0, h), r: rnd(40, 140), vy: rnd(0.05, 0.18), ph: rnd(0, 6.28), op: rnd(0.05, 0.12) }));
      this.items = this.shape === 'aucun' ? [] : Array.from({ length: Math.max(8, Math.round(22 * k)) }, () => this.item(w, h, false));
      this.glints = Array.from({ length: Math.max(10, Math.round(36 * k)) }, () => ({ c: this.pick(), x: rnd(0, w), y: rnd(0, h), ph: rnd(0, 6.28), sp: rnd(0.01, 0.03), s: rnd(1.5, 3.2) * this.sc }));
    }
    draw() {
      const { ctx, w, h, mouse } = this; if (!w) return;
      let R, G, B; const use = c => { [R, G, B] = c; }, col = a => `rgba(${R},${G},${B},${a})`;
      const speed = this.reduced ? 0.15 : 1; this.t += speed;
      ctx.clearRect(0, 0, w, h);
      this.orbs.forEach(o => {
        use(o.c);
        o.y -= o.vy * speed; if (o.y + o.r < 0) { o.y = h + o.r; o.x = rnd(0, w); }
        const x = o.x + Math.sin(this.t * 0.004 + o.ph) * 30, a = o.op * (0.7 + 0.3 * Math.sin(this.t * 0.01 + o.ph));
        const g = ctx.createRadialGradient(x, o.y, 0, x, o.y, o.r);
        g.addColorStop(0, col(a)); g.addColorStop(0.6, col(a * 0.4)); g.addColorStop(1, col(0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, o.y, o.r, 0, 6.2832); ctx.fill();
      });
      this.glints.forEach(s => {
        use(s.c);
        s.ph += s.sp * speed; const a = Math.max(0, Math.sin(s.ph)) ** 3; if (a < 0.02) return;
        const d = Math.hypot(mouse.x - s.x, mouse.y - s.y), boost = d < 160 ? 1 + (1 - d / 160) : 1, L = s.s * (1 + a) * boost;
        ctx.strokeStyle = col(Math.min(1, a * 0.8 * boost)); ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(s.x - L, s.y); ctx.lineTo(s.x + L, s.y); ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y + L); ctx.stroke();
        ctx.fillStyle = col(a * boost * 0.9); ctx.beginPath(); ctx.arc(s.x, s.y, 0.9, 0, 6.2832); ctx.fill();
      });
      this.items.forEach((p, i) => {
        use(p.c);
        p.y += p.vy * speed; p.rot += p.vr * speed;
        const d = Math.hypot(mouse.x - p.x, mouse.y - p.y);
        if (d < 140) p.dx += ((p.x - mouse.x) / (d || 1)) * 0.08 * (1 - d / 140);
        p.dx *= 0.96; p.x += p.dx * speed;
        const x = p.x + Math.sin(this.t * 0.012 * p.sway + p.ph) * 22 * p.sway;
        if (p.y > h + 20) this.items[i] = this.item(w, h, true);
        ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.rot + Math.sin(this.t * 0.02 + p.ph) * 0.4);
        const s = p.s, g = ctx.createLinearGradient(0, -s, 0, s);
        g.addColorStop(0, col(p.op * 0.8)); g.addColorStop(1, col(p.op * 0.2));
        if (this.shape === 'petale') {
          ctx.fillStyle = g; ctx.beginPath();
          ctx.moveTo(0, -s); ctx.bezierCurveTo(s * 0.9, -s * 0.5, s * 0.6, s * 0.7, 0, s); ctx.bezierCurveTo(-s * 0.6, s * 0.7, -s * 0.9, -s * 0.5, 0, -s); ctx.fill();
        } else if (this.shape === 'losange') {
          ctx.rotate(-(p.rot + Math.sin(this.t * 0.02 + p.ph) * 0.4) + Math.PI / 4 + Math.sin(this.t * 0.012 * p.sway + p.ph) * 0.25);
          ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.fillStyle = col(p.op * 0.1);
          ctx.beginPath(); ctx.rect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4); ctx.fill(); ctx.stroke();
        } else {
          // feuillet : petite feuille de papier avec 3 lignes de texte
          const fw = s * 0.75, fh = s;
          ctx.strokeStyle = g; ctx.lineWidth = 0.8; ctx.strokeRect(-fw, -fh, fw * 2, fh * 2);
          ctx.fillStyle = col(p.op * 0.08); ctx.fillRect(-fw, -fh, fw * 2, fh * 2);
          ctx.beginPath(); [-0.4, 0, 0.4].forEach((ly, j) => { ctx.moveTo(-fw * 0.6, fh * ly); ctx.lineTo(fw * (j === 2 ? 0.2 : 0.6), fh * ly); }); ctx.stroke();
        }
        ctx.restore();
      });
    }
  }
  customElements.define('fond-lumiere', FondLumiere);
})();
