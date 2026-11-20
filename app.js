// Анимации и блок хитов (стиль как у сайта «Моя Анечка»). Корзина и каталог живут в cart.js и catalog.js.
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(pointer: fine)").matches;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  // Шапка прячется при прокрутке вниз
  var lastY = 0;
  addEventListener("scroll", function () {
    $(".header").classList.toggle("hide", scrollY > lastY && scrollY > 300);
    lastY = scrollY;
  }, { passive: true });

  // Плавный переход по ссылкам (CSS scroll-behavior: smooth ломает ScrollTrigger)
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var el = document.querySelector(a.getAttribute("href"));
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }
    });
  });

  // Хиты: цена и кнопка «В корзину» берутся из каталога
  function fillHits() {
    var items = window.CATALOG_ITEMS || [];
    $$(".hit").forEach(function (h) {
      var it = items.find(function (x) { return x.name === h.dataset.name; });
      if (!it) { h.hidden = true; return; } // товар убрали из каталога – прячем
      h.hidden = false;
      var pr = h.querySelector(".hit-price"), small = document.createElement("small");
      small.textContent = " / " + it.unit;
      pr.textContent = CartCore.money(it.price);
      pr.appendChild(small);
      h.querySelector(".buy").replaceWith(window.CatalogBuyBox(it));
    });
  }
  function onCatalog() {
    fillHits();
    var n = (window.CATALOG_ITEMS || []).length;
    if (n) $(".numbers [data-count]").dataset.count = n;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  document.addEventListener("catalog:ready", onCatalog);
  document.addEventListener("cart:change", fillHits);
  if (window.CATALOG_ITEMS) onCatalog(); // каталог мог загрузиться раньше этого скрипта

  if (!window.gsap || !window.ScrollTrigger || reduce) {
    document.documentElement.classList.add("no-gsap");
    $$("[data-count]").forEach(function (el) { el.textContent = el.dataset.count; });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  function splitWords(el) {
    var esc = function (w) { return w.replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w"><span>' + esc(w) + "</span></span>"; }).join(" ");
    return el.querySelectorAll(".w > span");
  }

  // 1. Вступление после прелоадера
  gsap.timeline({ delay: 1.9 })
    .from(".blob", { scale: 0, duration: 1.3, ease: "elastic.out(1, .6)" }, 0)
    .from(".hero-main", { scale: 0.3, rotate: -25, opacity: 0, duration: 1.1, ease: "back.out(1.6)" }, 0.15)
    .from(".hero .line > span", { yPercent: 115, duration: 1, ease: "expo.out", stagger: 0.12 }, 0.1)
    .from(".hero .hand", { opacity: 0, y: 20, duration: 0.6 }, 0.1)
    .from(".hero-sub, .hero .btns", { opacity: 0, y: 30, stagger: 0.1, duration: 0.8, ease: "power3.out" }, 0.6)
    .from(".float, .sticker", { scale: 0, opacity: 0, stagger: 0.12, duration: 0.8, ease: "back.out(2.2)" }, 0.5);

  // 2. «Это не просто круассан / пирог / хлеб…»
  var words = $$(".swap b"), wi = 0;
  gsap.set(words.slice(1), { opacity: 1, yPercent: 110 });
  (function next() {
    gsap.delayedCall(wi === 0 && !next.started ? 4 : 2.2, function () {
      next.started = true;
      var cur = words[wi];
      wi = (wi + 1) % words.length;
      gsap.to(cur, { yPercent: -110, duration: 0.55, ease: "power3.in" });
      gsap.fromTo(words[wi], { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: "back.out(1.8)", delay: 0.4 });
      next();
    });
  })();

  // 3. Парящие вкусняшки: качаются и следуют за мышью
  gsap.to(".float", { rotation: 7, yoyo: true, repeat: -1, duration: 2.6, ease: "sine.inOut", stagger: 0.5 });
  gsap.to(".sticker", { rotation: -10, yoyo: true, repeat: -1, duration: 1.8, ease: "sine.inOut" });
  if (fine) {
    var depth = $$("[data-depth]");
    addEventListener("mousemove", function (e) {
      var x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      depth.forEach(function (el) { gsap.to(el, { x: x * el.dataset.depth, y: y * el.dataset.depth, duration: 1, ease: "power3.out" }); });
    });
  }
  gsap.to(".hero-visual", { yPercent: 18, scale: 0.88, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero-text", { yPercent: -12, opacity: 0.15, ease: "none", scrollTrigger: { trigger: ".hero", start: "center top", end: "bottom top", scrub: true } });

  // 4. Ленты бегут и ускоряются от скорости прокрутки
  var tapes = $$(".tape-in").map(function (el, k) {
    return k ? gsap.fromTo(el, { xPercent: -50 }, { xPercent: 0, repeat: -1, duration: 30, ease: "none" })
             : gsap.to(el, { xPercent: -50, repeat: -1, duration: 30, ease: "none" });
  });
  var boost = 0;
  ScrollTrigger.create({ onUpdate: function (s) { boost = Math.min(Math.abs(s.getVelocity()) / 220, 9); } });
  gsap.ticker.add(function () { boost *= 0.93; tapes.forEach(function (t) { t.timeScale(1 + boost); }); });
  gsap.fromTo(".tape-yellow", { rotate: -7 }, { rotate: -2, ease: "none", scrollTrigger: { trigger: ".tapes", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo(".tape-brown", { rotate: 6 }, { rotate: 2, ease: "none", scrollTrigger: { trigger: ".tapes", start: "top bottom", end: "bottom top", scrub: true } });

  // 5. Манифест: слова загораются по мере прокрутки
  gsap.fromTo(splitWords($(".manifest-text")), { opacity: 0.12 }, {
    opacity: 1, stagger: 0.1, ease: "none",
    scrollTrigger: { trigger: ".manifest", start: "top 75%", end: "bottom 55%", scrub: true }
  });

  // Заголовки выезжают по словам
  $$(".split").forEach(function (h) {
    gsap.from(splitWords(h), { yPercent: 115, duration: 0.9, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: h, start: "top 88%" } });
  });

  // 6. Хиты: секция закрепляется, карточки едут вбок
  var track = $(".hits-track");
  var dist = function () { return track.scrollWidth - innerWidth; };
  var hs = gsap.to(track, { x: function () { return -dist(); }, ease: "none", scrollTrigger: { trigger: ".hits", start: "top top", end: function () { return "+=" + dist(); }, pin: true, scrub: 1, invalidateOnRefresh: true } });
  $$(".hit").forEach(function (c, i) {
    gsap.from(c, { rotate: i % 2 ? 8 : -8, yPercent: 12, scale: 0.86, ease: "none", scrollTrigger: { trigger: c, containerAnimation: hs, start: "left right", end: "center 60%", scrub: true } });
    gsap.fromTo(c.querySelector("img"), { scale: 1.3 }, { scale: 1, ease: "none", scrollTrigger: { trigger: c, containerAnimation: hs, start: "left right", end: "right left", scrub: true } });
  });

  // 7. Счётчики
  $$("[data-count]").forEach(function (el) {
    var o = { v: 0 };
    gsap.to(o, { v: 1, duration: 2, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%" },
      onUpdate: function () { el.textContent = Math.round(o.v * el.dataset.count); } });
  });
  gsap.from(".numbers .wrap > div", { y: 60, opacity: 0, stagger: 0.15, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".numbers", start: "top 80%" } });

  // 8. Семья: фото на разной скорости, факты лесенкой
  gsap.fromTo(".fp2", { y: 60 }, { y: -30, ease: "none", scrollTrigger: { trigger: ".family", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo(".fp3", { y: -20, rotate: 12 }, { y: 50, rotate: 5, ease: "none", scrollTrigger: { trigger: ".family", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.from(".timeline li", { x: 40, opacity: 0, stagger: 0.15, duration: 0.7, scrollTrigger: { trigger: ".timeline", start: "top 85%" } });
  gsap.from(".person", { y: 60, opacity: 0, rotate: function (i) { return (i - 2) * 3; }, stagger: 0.1, duration: 0.8, ease: "back.out(1.6)", scrollTrigger: { trigger: ".people", start: "top 88%" } });
  gsap.from(".person .avatar", { scale: 0, stagger: 0.1, duration: 0.7, delay: 0.3, ease: "back.out(2.5)", scrollTrigger: { trigger: ".people", start: "top 88%" } });
  gsap.from(".value", { y: 70, opacity: 0, stagger: 0.12, duration: 0.9, ease: "back.out(1.4)", scrollTrigger: { trigger: ".values-grid", start: "top 85%" } });
  gsap.from(".value svg", { rotate: -90, scale: 0, stagger: 0.12, duration: 0.8, delay: 0.25, ease: "back.out(2)", scrollTrigger: { trigger: ".values-grid", start: "top 85%" } });
  gsap.from(".step", { y: 60, opacity: 0, rotate: function (i) { return (i - 1) * 4; }, stagger: 0.12, duration: 0.9, ease: "back.out(1.5)", scrollTrigger: { trigger: ".steps", start: "top 85%" } });

  // 9. Отзывы едут вбок вместе с прокруткой
  var rt = $(".rev-track");
  gsap.fromTo(rt, { x: function () { return innerWidth * 0.25; } }, {
    x: function () { return -(rt.scrollWidth - innerWidth * 0.9); }, ease: "none",
    scrollTrigger: { trigger: ".reviews", start: "top bottom", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true }
  });

  // 10. Контакты: жёлтый фон «наливается», карта раскрывается кругом
  gsap.fromTo(".contacts", { clipPath: "inset(8% 6% 0% 6% round 60px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", scrollTrigger: { trigger: ".contacts", start: "top bottom", end: "top 30%", scrub: true } });
  gsap.fromTo(".map", { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: ".contacts", start: "top 60%" } });

  // Магнитные кнопки
  if (fine) $$(".magnetic").forEach(function (b) {
    b.addEventListener("mousemove", function (e) {
      var r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.3 });
    });
    b.addEventListener("mouseleave", function () { gsap.to(b, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, .4)" }); });
  });

  // Высота каталога меняется (раздел, поиск, загрузка) – пересчитываем точки анимаций
  var t;
  new ResizeObserver(function () { clearTimeout(t); t = setTimeout(function () { ScrollTrigger.refresh(); }, 200); }).observe($("#grid"));
  addEventListener("load", function () { ScrollTrigger.refresh(); });
  document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
