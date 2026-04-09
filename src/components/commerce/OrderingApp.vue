<template>
  <section class="container ordering-shell">
    <div class="category-row card">
      <button
        v-for="category in categories"
        :key="category.id"
        :class="['category-chip', { active: category.id === activeCategory }]"
        type="button"
        @click="activeCategory = category.id"
      >
        {{ category.label }}
      </button>
    </div>

    <div id="order-menu" class="menu-grid">
      <article v-for="product in filteredProducts" :key="product.id" class="product-card card">
        <button class="image-button" type="button" @click="openProduct(product)">
          <img :src="product.image" :alt="product.name" class="product-image" loading="lazy" />
        </button>
        <div class="product-copy">
          <p class="product-kicker">{{ categories.find((item) => item.id === product.category)?.label }}</p>
          <div class="tag-row">
            <span v-for="tag in product.tags" :key="tag" class="tag-pill">{{ tag }}</span>
          </div>
          <div class="product-header">
            <div>
              <h3>{{ product.name }}</h3>
              <p>{{ product.description }}</p>
            </div>
            <strong>{{ format(product.price) }}</strong>
          </div>
          <div class="product-actions">
            <button class="primary-button" type="button" @click="quickAdd(product)">
              {{ copy.addToCart }}
            </button>
            <button class="secondary-button" type="button" @click="openProduct(product)">
              {{ copy.customize }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <button v-if="itemCount" class="mobile-cart" type="button" @click="cartOpen = true">
      <span>{{ copy.viewCart }} ({{ itemCount }} {{ itemCount === 1 ? copy.item : copy.items }})</span>
      <strong>{{ format(grandTotal) }}</strong>
    </button>

    <div v-if="productOpen" class="overlay" @click.self="closeProduct">
      <div class="modal card">
        <button class="close-button" type="button" @click="closeProduct">×</button>
        <img :src="selected.image" :alt="selected.name" class="modal-image" />
        <div class="modal-copy">
          <div class="product-header">
            <div>
              <h3>{{ selected.name }}</h3>
              <p>{{ selected.description }}</p>
            </div>
            <strong>{{ format(modalTotal) }}</strong>
          </div>

          <div class="field-group">
            <label>{{ copy.quantity }}</label>
            <div class="quantity-control">
              <button type="button" @click="qty = Math.max(1, qty - 1)">-</button>
              <span>{{ qty }}</span>
              <button type="button" @click="qty += 1">+</button>
            </div>
          </div>

          <div v-if="selected.addOns.length" class="field-group">
            <label>{{ copy.addOns }}</label>
            <div class="addon-grid">
              <button
                v-for="addOn in selected.addOns"
                :key="addOn.id"
                type="button"
                :class="['addon-chip', { active: addOnIds.includes(addOn.id) }]"
                @click="toggleAddon(addOn.id)"
              >
                <span>{{ addOn.label }}</span>
                <span>{{ format(addOn.price) }}</span>
              </button>
            </div>
          </div>

          <div class="field-group">
            <label>{{ copy.notes }}</label>
            <textarea v-model="notes" :placeholder="copy.notesPlaceholder" rows="4"></textarea>
          </div>

          <div class="modal-action-row">
            <button class="primary-button modal-add-button" type="button" @click="addConfiguredItem">
              {{ copy.addToCart }}
            </button>
          </div>
        </div>

        <div class="sticky-cta">
          <div>
            <small>{{ copy.total }}</small>
            <strong>{{ format(modalTotal) }}</strong>
          </div>
          <button class="primary-button" type="button" @click="addConfiguredItem">{{ copy.addToCart }}</button>
        </div>
      </div>
    </div>

    <div v-if="cartOpen" class="overlay cart-overlay" @click.self="cartOpen = false">
      <aside class="cart-panel card">
        <button class="close-button" type="button" @click="cartOpen = false">×</button>
        <div class="cart-body">
          <div class="cart-scroll">
            <div>
              <p class="eyebrow-inner">{{ copy.checkout }}</p>
              <h3>{{ copy.cartTitle }}</h3>
            </div>

            <div v-if="!cart.length" class="empty-state">{{ copy.emptyCart }}</div>
            <div v-else class="cart-items">
              <article v-for="item in cart" :key="item.id" class="cart-item">
                <img :src="item.image" :alt="item.name" />
                <div>
                  <div class="cart-item-head">
                    <strong>{{ item.name }}</strong>
                    <strong>{{ format(item.total) }}</strong>
                  </div>
                  <p v-if="item.addOnLabels.length">{{ item.addOnLabels.join(" · ") }}</p>
                  <p v-if="item.notes">{{ item.notes }}</p>
                  <div class="cart-item-actions">
                    <div class="quantity-control small">
                      <button type="button" @click="changeQty(item.id, -1)">-</button>
                      <span>{{ item.quantity }}</span>
                      <button type="button" @click="changeQty(item.id, 1)">+</button>
                    </div>
                    <button class="text-button" type="button" @click="removeItem(item.id)">Remove</button>
                  </div>
                </div>
              </article>
            </div>

            <div class="totals">
              <div><span>{{ copy.subtotal }}</span><strong>{{ format(subtotal) }}</strong></div>
              <div><span>{{ copy.deliveryFee }}</span><strong>{{ format(deliveryFee) }}</strong></div>
              <div><span>{{ copy.total }}</span><strong>{{ format(grandTotal) }}</strong></div>
            </div>

            <div class="checkout-box" v-if="cart.length">
              <div class="step-row">
                <span :class="{ active: step === 1 }">1. {{ copy.step1 }}</span>
                <span :class="{ active: step === 2 }">2. {{ copy.step2Short }}</span>
              </div>

              <div v-if="step === 1" class="form-grid">
                <label><span>{{ copy.name }}</span><input v-model="checkout.name" type="text" /></label>
                <label><span>{{ copy.phone }}</span><input v-model="checkout.phone" type="tel" /></label>
              </div>

              <div v-if="step === 2" class="form-grid">
                <div class="choice-group">
                  <span>{{ copy.deliveryMethod }}</span>
                  <div class="choice-row">
                    <button
                      type="button"
                      :class="['choice-chip', { active: checkout.fulfillment === 'delivery' }]"
                      @click="checkout.fulfillment = 'delivery'"
                    >
                      {{ copy.delivery }}
                    </button>
                    <button
                      type="button"
                      :class="['choice-chip', { active: checkout.fulfillment === 'pickup' }]"
                      @click="checkout.fulfillment = 'pickup'"
                    >
                      {{ copy.pickup }}
                    </button>
                  </div>
                </div>
                <label v-if="checkout.fulfillment === 'delivery'">
                  <span>{{ copy.address }}</span>
                  <input v-model="checkout.address" type="text" />
                </label>
                <div class="choice-group">
                  <span>{{ copy.paymentMethod }}</span>
                  <div class="choice-row">
                    <button
                      type="button"
                      :class="['choice-chip', { active: checkout.payment === 'stripe' }]"
                      @click="checkout.payment = 'stripe'"
                    >
                      {{ copy.stripe }}
                    </button>
                    <button
                      type="button"
                      :class="['choice-chip', { active: checkout.payment === 'cash' }]"
                      @click="checkout.payment = 'cash'"
                    >
                      {{ copy.cash }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="checkout-actions">
                <button v-if="step > 1" class="secondary-button" type="button" @click="step -= 1">Back</button>
                <button v-if="step < 2" class="primary-button" type="button" :disabled="!canContinueContact" @click="step += 1">{{ copy.checkout }}</button>
                <button v-else class="primary-button" type="button" :disabled="!canPlaceOrder || isSubmitting" @click="placeOrder">
                  {{ isSubmitting ? "Redirecting..." : copy.placeOrder }}
                </button>
              </div>
              <p v-if="paymentError" class="error-note">{{ paymentError }}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="orderPlaced" class="overlay" @click.self="closeSuccessModal">
      <div class="success-modal card">
        <button class="close-button" type="button" @click="closeSuccessModal">×</button>
        <p class="eyebrow-inner">{{ copy.checkout }}</p>
        <h3>{{ successTitle }}</h3>
        <div class="order-code-box">
          <small>Order Code</small>
          <strong>{{ orderCode }}</strong>
        </div>
        <p class="success-modal-copy">{{ orderPlacedMessage }}</p>
        <button class="primary-button success-modal-button" type="button" @click="closeSuccessModal">
          Continue
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { formatPrice, getContent, getLocalizedProducts, normalizeLocale } from "@/data/site";

const CART_STORAGE_KEY = "sora-sushi-cart";

const props = defineProps<{ lang?: string }>();
const lang = normalizeLocale(props.lang);
const copy = getContent(lang);
const products = getLocalizedProducts(lang);
const categories = [
  { id: "all", label: copy.categories.all },
  { id: "signature", label: copy.categories.signature },
  { id: "sashimi", label: copy.categories.sashimi },
  { id: "nigiri", label: copy.categories.nigiri },
  { id: "boxes", label: copy.categories.boxes },
  { id: "sides", label: copy.categories.sides },
  { id: "drinks", label: copy.categories.drinks },
];

const activeCategory = ref<typeof categories[number]["id"]>("all");
const cartOpen = ref(false);
const productOpen = ref(false);
const selected = ref(products[0]);
const qty = ref(1);
const addOnIds = ref<string[]>([]);
const notes = ref("");
const step = ref(1);
const orderPlaced = ref(false);
const orderCode = ref("");
const paymentError = ref("");
const isSubmitting = ref(false);
const cart = ref<Array<{
  id: string;
  productId: string;
  name: string;
  image: string;
  quantity: number;
  addOnLabels: string[];
  addOnTotal: number;
  notes: string;
  unitPrice: number;
  total: number;
}>>([]);

const checkout = reactive({
  name: "",
  phone: "",
  address: "",
  fulfillment: "delivery",
  payment: "stripe",
});

const filteredProducts = computed(() =>
  activeCategory.value === "all"
    ? products
    : products.filter((p) => p.category === activeCategory.value),
);
const subtotal = computed(() => cart.value.reduce((sum, item) => sum + item.total, 0));
const deliveryFee = computed(() => (cart.value.length ? (checkout.fulfillment === "pickup" ? 0 : 4.9) : 0));
const grandTotal = computed(() => subtotal.value + deliveryFee.value);
const itemCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0));
const canContinueContact = computed(() => Boolean(checkout.name.trim() && checkout.phone.trim()));
const canPlaceOrder = computed(() => {
  const hasContact = canContinueContact.value;
  if (!hasContact) return false;
  if (checkout.fulfillment === "pickup") return Boolean(checkout.payment);
  return Boolean(checkout.address.trim() && checkout.payment);
});
const successTitle = computed(() =>
  checkout.fulfillment === "pickup" ? "Pickup Confirmed" : "Order Confirmed",
);
const orderPlacedMessage = computed(() =>
  checkout.fulfillment === "pickup"
    ? checkout.payment === "cash"
      ? "Pickup order confirmed. Please pay in cash when you collect your order."
      : "Pickup order confirmed. A Stripe payment step is ready to connect next."
    : checkout.payment === "cash"
      ? "Delivery order confirmed. Please pay in cash on delivery."
      : "Order placed. Your payment is ready for Stripe integration.",
);
const modalTotal = computed(() => {
  const addOnTotal = selected.value.addOns
    .filter((addOn) => addOnIds.value.includes(addOn.id))
    .reduce((sum, item) => sum + item.price, 0);
  return (selected.value.price + addOnTotal) * qty.value;
});

const format = (value: number) => formatPrice(value, lang);

function openProduct(product: (typeof products)[number]) {
  selected.value = product;
  qty.value = 1;
  addOnIds.value = [];
  notes.value = "";
  productOpen.value = true;
}

function closeProduct() {
  productOpen.value = false;
}

function toggleAddon(id: string) {
  addOnIds.value = addOnIds.value.includes(id)
    ? addOnIds.value.filter((item) => item !== id)
    : [...addOnIds.value, id];
}

function pushCartItem(product: (typeof products)[number], quantity: number, selectedAddOnIds: string[], itemNotes: string) {
  const addOns = product.addOns.filter((item) => selectedAddOnIds.includes(item.id));
  const addOnTotal = addOns.reduce((sum, item) => sum + item.price, 0);
  const unitPrice = product.price + addOnTotal;
  cart.value = [
    ...cart.value,
    {
      id: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity,
      addOnLabels: addOns.map((item) => item.label),
      addOnTotal,
      notes: itemNotes,
      unitPrice,
      total: unitPrice * quantity,
    },
  ];
}

function quickAdd(product: (typeof products)[number]) {
  pushCartItem(product, 1, [], "");
  cartOpen.value = true;
}

function addConfiguredItem() {
  pushCartItem(selected.value, qty.value, addOnIds.value, notes.value.trim());
  productOpen.value = false;
  cartOpen.value = true;
}

function changeQty(id: string, delta: number) {
  cart.value = cart.value.flatMap((item) => {
    if (item.id !== id) return [item];
    const nextQty = item.quantity + delta;
    if (nextQty <= 0) return [];
    return [{ ...item, quantity: nextQty, total: item.unitPrice * nextQty }];
  });
}

function removeItem(id: string) {
  cart.value = cart.value.filter((item) => item.id !== id);
}

function placeOrder() {
  if (!canPlaceOrder.value) return;

  paymentError.value = "";
  if (checkout.payment === "stripe") {
    void beginStripeCheckout();
    return;
  }

  orderCode.value = generateOrderCode();
  orderPlaced.value = true;
  cart.value = [];
  cartOpen.value = false;
  step.value = 1;
}

function handleOpenCart() {
  cartOpen.value = true;
}

function closeSuccessModal() {
  orderPlaced.value = false;
}

function generateOrderCode() {
  const prefix = checkout.fulfillment === "pickup" ? "PK" : "DL";
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}

async function beginStripeCheckout() {
  isSubmitting.value = true;

  try {
    const response = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lang,
        cart: cart.value,
        checkout,
        deliveryFee: deliveryFee.value,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.url) {
      throw new Error(
        data.error ||
          "Unable to start Stripe checkout. Check your Cloudflare Pages Stripe environment variables.",
      );
    }

    window.location.href = data.url;
  } catch (error) {
    paymentError.value =
      error instanceof Error
        ? error.message
        : "Unable to start Stripe checkout. Check your Cloudflare Pages Stripe environment variables.";
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  if (typeof window === "undefined") return;
  const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
  if (savedCart) {
    try {
      cart.value = JSON.parse(savedCart);
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }
  window.addEventListener("open-cart", handleOpenCart);
});

onBeforeUnmount(() => {
  window.removeEventListener("open-cart", handleOpenCart);
});

watch([cartOpen, productOpen], ([cartState, productState]) => {
  document.documentElement.style.overflow = cartState || productState ? "hidden" : "";
});

watch(
  cart,
  (value) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true },
);

watch(
  () => checkout.fulfillment,
  (value) => {
    if (value === "pickup") {
      checkout.address = "";
    }
  },
);
</script>

<style scoped>
.ordering-shell {
  padding: 24px 0 32px;
}
.product-kicker,
.eyebrow-inner {
  display: block;
  color: rgba(244,213,154,.82);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .2em;
  text-transform: uppercase;
}
.product-kicker {
  margin: 0 0 8px;
}
.category-row {
  position: sticky;
  top: 16px;
  z-index: 10;
  display: flex;
  gap: 10px;
  overflow: auto;
  padding: 12px;
  border-radius: 999px;
  margin-bottom: 18px;
}
.category-chip {
  min-height: 48px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: rgba(246,239,230,.72);
  white-space: nowrap;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.category-chip.active {
  background: linear-gradient(135deg, var(--gold), var(--gold-soft));
  color: #160f08;
}
.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-top: 22px;
}
.product-card {
  overflow: hidden;
}
.image-button {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  overflow: hidden;
}
.product-image {
  width: 100%;
  height: 300px;
  object-fit: cover;
  transition: transform .22s ease, box-shadow .22s ease;
}
.product-card:hover .product-image {
  transform: scale(1.04);
}
.product-copy {
  padding: 20px;
}
.product-kicker {
  margin-bottom: 10px;
}
.tag-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.tag-pill {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(212,165,74,.14);
  color: var(--gold-soft);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.product-header {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
}
.product-header h3 {
  margin: 0;
  font-size: 1.65rem;
}
.product-header p {
  margin: 10px 0 0;
  color: var(--muted);
  line-height: 1.7;
}
.product-header strong {
  white-space: nowrap;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,.06);
}
.product-actions,
.checkout-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 18px;
}
.primary-button,
.secondary-button,
.addon-chip,
.choice-chip,
.text-button,
.quantity-control button,
input,
select,
textarea {
  transition: all .16s ease;
}
.primary-button,
.secondary-button {
  min-height: 52px;
  border-radius: 16px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.primary-button {
  border: 0;
  background: linear-gradient(135deg, var(--gold), var(--gold-soft));
  color: #160f08;
}
.primary-button:disabled,
.secondary-button:disabled,
.choice-chip:disabled {
  opacity: .45;
  cursor: not-allowed;
  pointer-events: none;
}
.secondary-button {
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: var(--text);
}
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(5,6,10,.74);
  backdrop-filter: blur(14px);
}
.cart-overlay {
  place-items: stretch end;
  padding: 0;
}
.modal {
  position: relative;
  width: min(860px, 100%);
  max-height: min(92vh, 900px);
  padding: 18px;
  overflow: auto;
}
.modal-image {
  width: 100%;
  height: 360px;
  object-fit: cover;
  border-radius: 24px;
}
.modal-copy {
  display: grid;
  gap: 20px;
  padding: 20px 4px 120px;
}
.sticky-cta {
  position: sticky;
  bottom: 0;
  margin-top: -84px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(7,8,12,.94);
  border: 1px solid rgba(255,255,255,.08);
  z-index: 3;
}
.sticky-cta small {
  display: block;
  font-family: ui-sans-serif, system-ui, sans-serif;
  text-transform: uppercase;
  letter-spacing: .18em;
  color: var(--muted);
  margin-bottom: 6px;
}
.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.08);
  color: var(--text);
}
.success-modal {
  position: relative;
  width: min(460px, 100%);
  padding: 28px;
}
.success-modal h3 {
  margin: 10px 0 0;
  font-size: 2rem;
}
.success-modal-copy {
  margin: 16px 0 0;
  color: var(--muted);
  line-height: 1.7;
}
.order-code-box {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(212,165,74,.24);
  background: rgba(212,165,74,.08);
}
.order-code-box small {
  display: block;
  margin-bottom: 8px;
  color: rgba(244,213,154,.82);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.order-code-box strong {
  display: block;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 1.2rem;
  letter-spacing: .18em;
}
.error-note {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255,124,124,.12);
  color: #ffc5c5;
}
.success-modal-button {
  width: 100%;
  margin-top: 22px;
}
.field-group {
  display: grid;
  gap: 10px;
}
.field-group label,
.form-grid label span {
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: rgba(244,213,154,.82);
}
.modal-action-row {
  display: none;
}
.modal-add-button {
  width: 100%;
}
.quantity-control {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
}
.quantity-control.small {
  transform: scale(.92);
  transform-origin: left center;
}
.quantity-control button {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 0;
  background: rgba(255,255,255,.07);
  color: var(--text);
}
.addon-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.addon-chip {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  min-height: 52px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: var(--text);
  text-align: center;
}
.addon-chip.active {
  background: rgba(212,165,74,.14);
  border-color: rgba(212,165,74,.4);
}
textarea,
input,
select {
  width: 100%;
  min-height: 52px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: var(--text);
}
textarea {
  min-height: 120px;
  padding-top: 14px;
  resize: vertical;
}
.cart-panel {
  position: relative;
  width: min(480px, 100%);
  height: 100vh;
  padding: 18px;
  border-radius: 28px 0 0 28px;
}
.cart-body {
  height: 100%;
  overflow: auto;
  padding-right: 4px;
}
.cart-scroll {
  display: grid;
  gap: 18px;
  min-height: 100%;
}
.cart-body h3 {
  margin: 0;
  font-size: 2rem;
}
.empty-state {
  padding: 18px;
  border-radius: 18px;
  border: 1px dashed rgba(255,255,255,.14);
  color: var(--muted);
}
.cart-items {
  display: grid;
  gap: 14px;
  min-height: min(54vh, 560px);
  align-content: start;
}
.cart-item {
  display: grid;
  grid-template-columns: 82px 1fr;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
}
.cart-item img {
  width: 82px;
  height: 82px;
  object-fit: cover;
  border-radius: 18px;
}
.cart-item-head,
.totals > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.cart-item p,
.totals {
  color: var(--muted);
  line-height: 1.6;
}
.cart-item-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
}
.text-button {
  border: 0;
  background: transparent;
  color: var(--danger);
}
.totals {
  display: grid;
  gap: 8px;
  padding: 16px 0 0;
  border-top: 1px solid rgba(255,255,255,.08);
}
.totals > div:last-child {
  color: var(--text);
  font-weight: 700;
}
.checkout-box {
  display: grid;
  gap: 14px;
  padding: 16px;
  margin-top: 12px;
  border-radius: 20px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
}
.step-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.step-row span {
  padding: 12px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.08);
  color: var(--muted);
  text-align: center;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.step-row span.active {
  color: var(--text);
  background: rgba(212,165,74,.14);
  border-color: rgba(212,165,74,.4);
}
.form-grid {
  display: grid;
  gap: 12px;
}
.form-grid label {
  display: grid;
  gap: 8px;
}
.choice-group {
  display: grid;
  gap: 10px;
}
.choice-group span {
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: rgba(244,213,154,.82);
}
.choice-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.choice-chip {
  min-height: 52px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.choice-chip.active {
  background: rgba(212,165,74,.14);
  border-color: rgba(212,165,74,.4);
  color: var(--gold-soft);
}
.mobile-cart {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 20;
  min-height: 62px;
  display: none;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  border-radius: 999px;
  border: 0;
  background: linear-gradient(135deg, var(--gold), var(--gold-soft));
  color: #160f08;
  box-shadow: 0 18px 40px rgba(212,165,74,.34);
}

@media (max-width: 1080px) {
  .menu-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 760px) {
  .menu-grid,
  .addon-grid,
  .choice-row,
  .product-actions,
  .checkout-actions {
    grid-template-columns: 1fr;
  }
  .product-image {
    height: 260px;
  }
  .modal-image {
    height: 240px;
  }
  .modal-copy {
    padding-bottom: 20px;
  }
  .sticky-cta {
    position: static;
    margin-top: 0;
  }
  .modal-action-row {
    display: block;
  }
  .cart-panel {
    width: 100%;
    height: 75vh;
    margin-top: auto;
    border-radius: 28px 28px 0 0;
  }
  .cart-items {
    min-height: 44vh;
  }
  .mobile-cart {
    display: flex;
  }
}
</style>
