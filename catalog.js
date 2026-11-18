// Каталог: товары из products.csv или из опубликованной Google Таблицы (основа – catalog-demo).
(function () {
  var cfg = window.BAKERY_CONFIG || {};
  var SHEET_URL = (cfg.sheetCsvUrl || "").trim();
  var CACHE_KEY = "happy-catalog-v1";
  var grid = document.getElementById("grid");
  var chips = document.getElementById("chips");
  var items = [];
  var activeCat = "Все";

  // CSV: кавычки, запятые и переносы строк внутри ячеек
  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ""; }); });
  }

  // Столбцы ищем по названию – порядок в таблице не важен
  var COLUMNS = {
    cat: ["раздел", "категория"], name: ["название", "товар"], price: ["цена", "стоимость"],
    unit: ["единица", "ед.", "за"], desc: ["описание"], photo: ["фото", "картинка"], stock: ["в наличии", "наличие"],
  };
  function toItems(rows) {
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    var idx = {};
    Object.keys(COLUMNS).forEach(function (k) { idx[k] = head.findIndex(function (h) { return COLUMNS[k].indexOf(h) !== -1; }); });
    if (idx.name === -1) throw new Error("В таблице нет столбца «Название»");
    var get = function (r, k) { return idx[k] === -1 ? "" : (r[idx[k]] || "").trim(); };
    return rows.slice(1).map(function (r) {
      return {
        cat: get(r, "cat") || "Разное", name: get(r, "name"),
        price: Number(get(r, "price").replace(/\s/g, "").replace(",", ".")) || 0,
        unit: get(r, "unit") || "шт", desc: get(r, "desc"), photo: get(r, "photo"),
        inStock: !/^(нет|-|0|no)$/i.test(get(r, "stock")),
      };
    }).filter(function (it) { return it.name && it.inStock; });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function renderChips() {
    var cats = ["Все"];
    items.forEach(function (it) { if (cats.indexOf(it.cat) === -1) cats.push(it.cat); });
    chips.innerHTML = "";
    cats.forEach(function (c) {
      var b = el("button", "chip", c);
      b.type = "button";
      b.setAttribute("aria-pressed", String(c === activeCat));
      b.onclick = function () { activeCat = c; render(); };
      chips.appendChild(b);
    });
  }

  // Кнопка «В корзину» или +/− если товар уже в корзине
  function buyBox(it) {
    var box = el("div", "buy");
    var q = window.Cart ? Cart.qty(it.name) : 0;
    if (!q) {
      var b = el("button", "btn small", "В корзину");
      b.type = "button";
      b.onclick = function () { Cart.add(it); };
      box.appendChild(b);
    } else {
      var s = el("div", "stepper");
      var minus = el("button", "", "−"), plus = el("button", "", "+");
      minus.type = plus.type = "button";
      minus.setAttribute("aria-label", "Меньше");
      plus.setAttribute("aria-label", "Больше");
      minus.onclick = function () { Cart.change(it.name, -1); };
      plus.onclick = function () { Cart.change(it.name, 1); };
      s.append(minus, el("span", "", CartCore.qtyLabel({ unit: it.unit, qty: q })), plus);
      box.appendChild(s);
    }
    return box;
  }

  function render() {
    renderChips();
    grid.innerHTML = "";
    var shown = items.filter(function (it) { return activeCat === "Все" || it.cat === activeCat; });
    if (!shown.length) { grid.appendChild(el("p", "empty", "Здесь пока пусто.")); return; }
    shown.forEach(function (it, i) {
      var card = el("article", "card");
      card.style.setProperty("--i", i % 8);
      var photo = el("div", "photo");
      if (it.photo) {
        var img = document.createElement("img");
        img.src = it.photo; img.alt = it.name; img.loading = "lazy";
        img.onerror = function () { photo.classList.add("noimg"); img.remove(); };
        photo.appendChild(img);
      } else photo.classList.add("noimg");
      var body = el("div", "body");
      body.appendChild(el("span", "cat", it.cat));
      body.appendChild(el("h3", "name", it.name));
      if (it.desc) body.appendChild(el("p", "desc", it.desc));
      var foot = el("div", "foot");
      var price = el("div", "price", CartCore.money(it.price));
      price.appendChild(el("small", "", " / " + it.unit));
      foot.append(price, buyBox(it));
      body.appendChild(foot);
      card.append(photo, body);
      grid.appendChild(card);
    });
  }

  // Обновляем только кнопки, чтобы карточки не мигали при каждом +/−
  document.addEventListener("cart:change", function () {
    var cards = grid.querySelectorAll(".card");
    var shown = items.filter(function (it) { return activeCat === "Все" || it.cat === activeCat; });
    cards.forEach(function (c, i) { if (shown[i]) c.querySelector(".buy").replaceWith(buyBox(shown[i])); });
  });

  function load() {
    var url = SHEET_URL || "products.csv";
    fetch(url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (text) {
        var list = toItems(parseCSV(text));
        if (JSON.stringify(list) !== JSON.stringify(items)) { items = list; render(); }
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (e) {}
      })
      .catch(function () {
        if (items.length) return;
        var cached = null;
        try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) {}
        if (cached && cached.length) { items = cached; render(); }
        else grid.innerHTML = '<p class="empty">Не удалось загрузить ассортимент. Позвоните нам – подскажем, что есть сегодня.</p>';
      });
  }
  load();
  // Если подключена таблица – раз в минуту проверяем, не поменяли ли цены
  if (SHEET_URL) setInterval(function () { if (!document.hidden) load(); }, 60000);
})();
