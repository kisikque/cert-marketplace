const KEY = "cart_v1";

export function getCart() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { providerId: null, items: [] };
  } catch {
    return { providerId: null, items: [] };
  }
}

export function saveCart(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function clearCart() {
  saveCart({ providerId: null, items: [] });
}

export function addItem(service) {
  const cart = getCart();

  // правило: одна заявка = один провайдер
  if (cart.providerId && cart.providerId !== service.providerId) {
    return { ok: false, reason: "DIFFERENT_PROVIDER", cart };
  }

  const providerId = service.providerId;
  const items = [...cart.items];
  const idx = items.findIndex((x) => x.serviceId === service.id);
  if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + 1 };
  else items.push({ serviceId: service.id, qty: 1 });

  const next = { providerId, items };
  saveCart(next);
  return { ok: true, cart: next };
}

export function removeItem(serviceId) {
  const cart = getCart();
  const items = cart.items.filter((x) => x.serviceId !== serviceId);
  const next = { providerId: items.length ? cart.providerId : null, items };
  saveCart(next);
  return next;
}

export function setQty(serviceId, qty) {
  const cart = getCart();
  const items = cart.items
    .map((x) => (x.serviceId === serviceId ? { ...x, qty: Math.max(1, qty) } : x))
    .filter((x) => x.qty > 0);

  const next = { providerId: items.length ? cart.providerId : null, items };
  saveCart(next);
  return next;
}

export function getCount() {
  const cart = getCart();
  return cart.items.reduce((sum, x) => sum + (x.qty || 0), 0);
}
