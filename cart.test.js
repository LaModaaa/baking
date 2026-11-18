// Проверка логики корзины: node cart.test.js
require("./cart.js");
const assert = require("assert");
const C = globalThis.CartCore;
const list = [
  { name: "Брусничный пирог домашний", price: 99, unit: "100 г", qty: 3 }, // 300 г
  { name: "Эклер", price: 119, unit: "шт", qty: 2 },
];
assert.strictEqual(C.isWeight("100 г"), true);
assert.strictEqual(C.isWeight("шт"), false);
assert.strictEqual(C.qtyLabel(list[0]), "300 г");
assert.strictEqual(C.qtyLabel(list[1]), "2 шт");
assert.strictEqual(C.total(list), 99 * 3 + 119 * 2); // 535
assert.strictEqual(C.hasWeight(list), true);
assert.strictEqual(C.validPhone("+7 (995) 011-52-11"), true);
assert.strictEqual(C.validPhone("12345"), false);
const t = C.orderText(list, { name: "Анна", phone: "+79990000000", how: "Доставка", address: "ул. Ленина, 1", when: "", comment: "" });
assert.ok(t.includes("Брусничный пирог домашний – 300 г"));
assert.ok(t.includes("Итого: ≈ 535"));
assert.ok(t.includes("Адрес: ул. Ленина, 1"));
assert.ok(!t.includes("Когда:"));
const t2 = C.orderText([list[1]], { name: "Анна", phone: "+79990000000", how: "Самовывоз", address: "x", when: "к 18:00", comment: "" });
assert.ok(!t2.includes("≈") && !t2.includes("Адрес:") && t2.includes("Когда: к 18:00"));
console.log("cart ok");
