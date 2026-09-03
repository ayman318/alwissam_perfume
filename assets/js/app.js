const API_CONFIG = {
    url: "https://dbtvicvsabdypxjhafxt.supabase.co",
    anonKey: "sb_publishable_cE_nDKgQJMBczIgGph0WbA_ekFMWxlq"
};

/* =========================
   تعدد اللغات (Localization Dict)
========================= */
const translations = {
    ar: {
        store: "🏠 المتجر",
        collections: "✨ المجموعات",
        track: "تتبع طلبك",
        cart: "السلة",
        heroEyebrow: "WISSAM PERFUMES",
        heroTitle: "عطرك عنوان <em>أناقتك</em>",
        heroDesc: "اختار عطرك المفضل من مجموعتنا الاستثنائية بلمسات فاخرة تدوم طويلاً.",
        heroCta: "تصفح المنتجات",
        colSub: "OUR COLLECTION",
        colTitle: "المجموعة المختارة",
        searchPlaceholder: "ابحث باسم العطر أو الرائحة...",
        catAll: "✨ الكل",
        catMen: "👔 رجالي",
        catWomen: "👗 نسائي",
        catUnisex: "⚖️ للجنسين",
        catOriginal: "👑 أورجينال",
        viewDetails: "عرض تفاصيل العطر 🛍️",
        emptyCart: "🛒 السلة فارغة",
        emptyCartDesc: "أضف المنتجات التي تريد طلبها.",
        browseNow: "تصفح العطور الآن",
        totalDue: "الإجمالي المطلوب:",
        checkoutBtn: "إتمام الطلب",
        orderFormTitle: "بيانات الطلب",
        fullName: "الاسم بالكامل",
        phone: "رقم الموبايل",
        address: "العنوان بالتفصيل",
        notes: "ملاحظات إضافية على الطلب أو ترشيحك لنوع العطر الهدية...",
        confirmOrder: "تأكيد الطلب",
        orderSuccess: "✅ تم تسجيل طلبك بنجاح",
        orderNum: "رقم طلبك:",
        sendWhatsapp: "📱 إرسال الطلب على WhatsApp",
        ok: "حسناً"
    },
    en: {
        store: "🏠 Store",
        collections: "✨ Collections",
        track: "Track Order",
        cart: "Cart",
        heroEyebrow: "WISSAM PERFUMES",
        heroTitle: "Your Scent, Your <em>Elegance</em>",
        heroDesc: "Choose your favorite fragrance from our exceptional long-lasting luxury collection.",
        heroCta: "Browse Products",
        colSub: "OUR COLLECTION",
        colTitle: "Selected Collection",
        searchPlaceholder: "Search perfume name or scent...",
        catAll: "✨ All",
        catMen: "👔 Men",
        catWomen: "👗 Women",
        catUnisex: "⚖️ Unisex",
        catOriginal: "👑 Original",
        viewDetails: "View Details 🛍️",
        emptyCart: "🛒 Cart is Empty",
        emptyCartDesc: "Add products you wish to order.",
        browseNow: "Browse Perfumes Now",
        totalDue: "Total Due:",
        checkoutBtn: "Checkout",
        orderFormTitle: "Order Information",
        fullName: "Full Name",
        phone: "Phone Number",
        address: "Detailed Address",
        notes: "Additional notes or gift preference...",
        confirmOrder: "Confirm Order",
        orderSuccess: "✅ Order Placed Successfully",
        orderNum: "Order ID:",
        sendWhatsapp: "📱 Send Order via WhatsApp",
        ok: "OK"
    }
};

const labels = {
    men: { ar: "رجال", en: "Men" },
    women: { ar: "نساء", en: "Women" },
    unisex: { ar: "للجنسين", en: "Unisex" },
    original: { ar: "أورجينال", en: "Original" }
};

const orderStatusLabels = {
    pending: "قيد الانتظار والمراجعة ⏳",
    confirmed: "تم تأكيد طلبك وجاري التجهيز ✅",
    shipped: "طلبك في الطريق مع مندوب الشحن 🚚",
    delivered: "تم توصيل الطلب بنجاح 🎁",
    cancelled: "تم إلغاء الطلب ❌"
};

let products = [];
let cart = JSON.parse(localStorage.getItem("wissam_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("wissam_wishlist") || "[]");
let currentLang = localStorage.getItem("wissam_lang") || "ar";
let current = null;
let currentSize = null;
let qty = 1;
let storeSettings = null;
let currentCategory = "all";

const headers = {
    apikey: API_CONFIG.anonKey,
    Authorization: `Bearer ${API_CONFIG.anonKey}`
};

const money = n =>
    Number(n || 0).toLocaleString(currentLang === "ar" ? "ar-EG" : "en-US", {
        maximumFractionDigits: 2
    }) + (currentLang === "ar" ? " جنيه" : " EGP");

const esc = s =>
    String(s ?? "").replace(/[&<>"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m]));

/* ==========================================
   إدارة القائمة الجانبية (Sidebar Drawer)
========================================== */
function toggleSideMenu() {
    let drawer = document.getElementById("sideMenuDrawer");
    let overlay = document.getElementById("sideMenuOverlay");
    
    if (drawer && overlay) {
        drawer.classList.toggle("open");
        overlay.classList.toggle("show");
    }
}

/* ==========================================
   إدارة الثيمات المتعددة
========================================== */
function initTheme() {
    const savedTheme = localStorage.getItem("wissam_theme") || "dark";
    applyTheme(savedTheme);

    const themeSelector = document.getElementById("themeSelector");
    if (themeSelector) {
        themeSelector.value = savedTheme;
        themeSelector.onchange = (e) => {
            applyTheme(e.target.value);
        };
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("wissam_theme", theme);
}

/* ==========================================
   إدارة اللغات (مع معالجة الـ HTML داخل النصوص)
========================================== */
function initLanguage() {
    applyLanguage(currentLang);
    const langSelector = document.getElementById("langSelector");
    if (langSelector) {
        langSelector.value = currentLang;
        langSelector.onchange = (e) => {
            currentLang = e.target.value;
            localStorage.setItem("wissam_lang", currentLang);
            applyLanguage(currentLang);
            renderProducts();
        };
    }
}

function applyLanguage(lang) {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    
    const t = translations[lang];
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (t[key]) {
            if (key === "heroTitle") {
                el.innerHTML = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });

    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;
}

/* ==========================================
   نظام المفضلة (Wishlist)
========================================== */
function toggleWishlist(productId) {
    const id = Number(productId);
    const index = wishlist.indexOf(id);
    if (index > -1) {
        wishlist.splice(index, 1);
    } else {
        wishlist.push(id);
    }
    localStorage.setItem("wissam_wishlist", JSON.stringify(wishlist));
    updateWishlistCount();
    renderProducts();
}

function updateWishlistCount() {
    const counter = document.getElementById("wishlistCount");
    if (counter) counter.textContent = wishlist.length;
}

function openWishlistModal() {
    const modalContent = document.getElementById("modalContent");
    const favoriteProducts = products.filter(p => wishlist.includes(Number(p.id)));

    if (!favoriteProducts.length) {
        modalContent.innerHTML = `
            <div class="empty">
                <h2>❤️ قائمة المفضلة فارغة</h2>
                <p>لم تقم بإضافة أي عطور إلى مفضلتك بعد.</p>
                <button class="gold" onclick="closeModal()" style="margin-top:15px;">تصفح العطور</button>
            </div>
        `;
    } else {
        const rows = favoriteProducts.map(p => `
            <div class="item" style="align-items:center;">
                <img src="${esc(p.image || 'assets/images/logo.jpg')}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;">
                <div style="flex:1;margin-right:12px;margin-left:12px;">
                    <b>${esc(p.name)}</b>
                    <br><small style="color:var(--gold-main);">${labels[p.category]?.[currentLang] || ''}</small>
                </div>
                <a href="product.html?id=${p.id}" class="gold" style="padding:6px 12px;font-size:12px;border-radius:8px;">عرض</a>
                <button onclick="toggleWishlist(${p.id}); openWishlistModal();" style="background:none;border:0;color:#ef4444;cursor:pointer;font-size:16px;margin-right:10px;">✕</button>
            </div>
        `).join("");

        modalContent.innerHTML = `
            <h2 style="color:var(--gold-main);">❤️ العطور المفضلة</h2>
            ${rows}
        `;
    }
    document.getElementById("modal").classList.add("show");
}

/* السعر النهائي */
function fp(size) {
    const price = Number(size?.price || 0);
    if (!size?.discount_enabled) return price;
    const discount = Number(size?.discount_value || 0);
    if (size.discount_type === "percent") {
        return Math.max(0, price - (price * discount / 100));
    }
    return Math.max(0, price - discount);
}

function calcCartTotal() {
    let subtotal = cart.reduce((sum, item) => sum + fp(item.size) * Number(item.qty), 0);
    let totalQty = cart.reduce((sum, item) => sum + Number(item.qty), 0);
    let earnedFreeGifts = 0;

    if (storeSettings?.offer_enabled) {
        const buyStep = Number(storeSettings.offer_buy_qty || 2);
        const freeStep = Number(storeSettings.offer_free_qty || 1);
        earnedFreeGifts = Math.floor(totalQty / buyStep) * freeStep;
    }

    return { subtotal, totalQty, earnedFreeGifts, finalTotal: subtotal };
}

/* =========================
   SETTINGS & WHATSAPP
========================= */
async function loadSettings() {
    try {
        const r = await fetch(`${API_CONFIG.url}/rest/v1/settings?select=*&limit=1`, { headers });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        if (!data.length) return;
        storeSettings = data[0];
        const storeName = storeSettings.store_name || "الوسام للعطور";
        const tagline = storeSettings.tagline || "أناقة تدوم... وعطر يميزك";

        document.querySelectorAll(".store-name").forEach(el => el.textContent = storeName);
        document.querySelectorAll(".tagline").forEach(el => el.textContent = tagline);

        const whatsappNumber = normalizeWhatsApp(storeSettings?.whatsapp);
        const floatingBtn = document.getElementById("floatingWhatsapp");
        if (floatingBtn && whatsappNumber) {
            floatingBtn.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("مرحباً، أود الاستفسار عن عطور الوسام 🌸")}`;
        }
        renderProducts();
    } catch (error) {
        console.error("Settings error:", error);
    }
}

/* =========================
   PRODUCTS
========================= */
async function loadProducts() {
    const box = document.getElementById("products");
    if (!box) return;

    box.innerHTML = `<div class="empty">🧴 جاري تحميل المنتجات...</div>`;

    try {
        const url = `${API_CONFIG.url}/rest/v1/products?select=*,product_sizes(*)&active=eq.true&order=id.desc`;
        const r = await fetch(url, { headers });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        products = data.map(product => {
            const sizes = (product.product_sizes || []).sort((a, b) => Number(a.size_ml) - Number(b.size_ml));
            return { ...product, sizes };
        });
        renderProducts();
        updateWishlistCount();
    } catch (error) {
        console.error("Products error:", error);
        box.innerHTML = `<div class="empty">❌ تعذر تحميل المنتجات<br><small>${esc(error.message)}</small></div>`;
    }
}

function renderProducts() {
    const box = document.getElementById("products");
    if (!box) return;

    if (!products.length) {
        box.innerHTML = `<div class="empty">🧴 لا توجد منتجات حاليًا.</div>`;
        return;
    }

    box.innerHTML = products.map((product, index) => {
        const sizes = product.sizes || [];
        const firstSize = sizes[0];
        const isFav = wishlist.includes(Number(product.id));

        let priceHTML = "";
        let hasDiscount = false;
        let maxDiscountPercent = 0;

        sizes.forEach(s => {
            if (s.discount_enabled && Number(s.discount_value) > 0) {
                hasDiscount = true;
                const pct = s.discount_type === "percent" 
                    ? Number(s.discount_value) 
                    : Math.round((Number(s.discount_value) / Number(s.price)) * 100);
                if (pct > maxDiscountPercent) maxDiscountPercent = pct;
            }
        });

        if (firstSize) {
            const finalPrice = fp(firstSize);
            const originalPrice = Number(firstSize.price || 0);
            if (firstSize.discount_enabled && finalPrice < originalPrice) {
                priceHTML = `<div class="price-box"><del>${money(originalPrice)}</del><strong>${money(finalPrice)}</strong></div>`;
            } else {
                priceHTML = `<div class="price-box"><strong>${money(finalPrice)}</strong></div>`;
            }
        } else {
            priceHTML = `<small>لا يوجد سعر</small>`;
        }

        const image = product.image || "assets/images/logo.jpg";
        const offerBadge = storeSettings?.offer_enabled ? `<span class="badge-offer">🎁 اشترِ 2 واحصل على 1 هدية</span>` : "";
        const discountBadge = hasDiscount ? `<span class="badge-discount">خصم ${maxDiscountPercent}%</span>` : "";

        return `
            <article class="card" data-cat="${esc(product.category)}" data-name="${esc(product.name).toLowerCase()}" style="animation-delay: ${index * 0.08}s">
                <button class="wishlist-btn ${isFav ? 'active' : ''}" onclick="toggleWishlist(${product.id})" title="أضف للمفضلة">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <div class="badges-container">${offerBadge}${discountBadge}</div>
                <img src="${esc(image)}" alt="${esc(product.name)}" onerror="this.onerror=null;this.src='assets/images/logo.jpg'">
                <div>
                    <small>${labels[product.category]?.[currentLang] || ""}</small>
                    <h3>${esc(product.name)}</h3>
                    <div class="stars-rating">
                        ⭐⭐⭐⭐⭐ <span>(4.9)</span>
                    </div>
                    ${priceHTML}
                    ${sizes.length ? `<small style="display:block;margin:6px 0;color:var(--gold-main);">${sizes.map(s => `${s.size_ml} ml`).join(" • ")}</small>` : ""}
                    <a href="product.html?id=${product.id}" class="card-btn-link">
                        ${translations[currentLang].viewDetails}
                    </a>
                </div>
            </article>
        `;
    }).join("");
}

function handleSearch() {
    const searchInput = document.getElementById("searchInput");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    document.querySelectorAll(".card").forEach(card => {
        const matchCategory = currentCategory === "all" || card.dataset.cat === currentCategory;
        const matchName = card.dataset.name.includes(query);

        if (matchCategory && matchName) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }
    });
}

/* =========================
   CART
========================= */
function save() {
    localStorage.setItem("wissam_cart", JSON.stringify(cart));
    const counter = document.getElementById("cartCount");
    if (counter) {
        counter.textContent = cart.reduce((total, item) => total + Number(item.qty || 0), 0);
    }
}

function openCart() {
    showCart();
}

function showCart() {
    const modalContent = document.getElementById("modalContent");
    const t = translations[currentLang];

    if (!cart.length) {
        modalContent.innerHTML = `
            <div class="empty">
                <h2>${t.emptyCart}</h2>
                <p>${t.emptyCartDesc}</p>
                <button class="gold" onclick="closeModal()" style="margin-top:15px;">${t.browseNow}</button>
            </div>
        `;
        document.getElementById("modal").classList.add("show");
        return;
    }

    const { finalTotal } = calcCartTotal();

    const rows = cart.map((item, index) => {
        const final = fp(item.size);
        const itemTotal = final * Number(item.qty);
        return `
            <div class="item">
                <div>
                    <b>${esc(item.product.name)}</b><br>
                    <small>${item.size.size_ml} ml × ${item.qty}</small>
                </div>
                <b>${money(itemTotal)}</b>
                <button onclick="cart.splice(${index},1); save(); showCart();" style="background:none;border:0;color:#ef4444;cursor:pointer;">حذف</button>
            </div>
        `;
    }).join("");

    modalContent.innerHTML = `
        <h2>🛒 ${t.cart}</h2>
        ${rows}
        <div style="margin-top:15px; border-top:1px solid var(--border-color); padding-top:10px;">
            <h3 class="total" style="margin:0;">${t.totalDue} ${money(finalTotal)}</h3>
        </div>
        <button class="gold full" onclick="checkout()" style="margin-top:15px;">${t.checkoutBtn}</button>
    `;
    document.getElementById("modal").classList.add("show");
}

function checkout() {
    if (!cart.length) return;
    const t = translations[currentLang];
    document.getElementById("modalContent").innerHTML = `
        <h2>${t.orderFormTitle}</h2>
        <form onsubmit="sendOrder(event)">
            <input id="customerName" required placeholder="${t.fullName}">
            <input id="customerPhone" required type="tel" placeholder="${t.phone}">
            <textarea id="customerAddress" required placeholder="${t.address}"></textarea>
            <textarea id="customerNotes" style="min-height:75px;" placeholder="${t.notes}"></textarea>
            <button class="gold full" type="submit" style="margin-top:10px;">${t.confirmOrder}</button>
        </form>
    `;
}

function normalizeWhatsApp(number) {
    if (!number) return "";
    let value = String(number).replace(/\D/g, "");
    if (value.startsWith("0")) value = "20" + value.substring(1);
    return value;
}

async function sendOrder(event) {
    event.preventDefault();
    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const address = document.getElementById("customerAddress").value.trim();
    const notes = document.getElementById("customerNotes")?.value.trim() || "";
    const { finalTotal } = calcCartTotal();

    try {
        const orderResponse = await fetch(`${API_CONFIG.url}/rest/v1/orders`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json", "Prefer": "return=representation" },
            body: JSON.stringify({ customer_name: name, phone, address, notes, total: finalTotal, status: "pending" })
        });
        if (!orderResponse.ok) throw new Error(await orderResponse.text());
        const orderData = await orderResponse.json();
        const order = orderData?.[0];

        cart = [];
        save();
        document.getElementById("modalContent").innerHTML = `
            <div class="empty">
                <h2>✅ تم تسجيل طلبك بنجاح</h2>
                <p>رقم طلبك: <strong style="color:var(--gold-main); font-size:18px;">#${order.id}</strong></p>
                <button class="gold full" onclick="closeModal()" style="margin-top:15px;">حسناً</button>
            </div>
        `;
    } catch (error) {
        alert("❌ فشل إرسال الطلب: " + error.message);
    }
}

function openTrackModal() {
    document.getElementById("modalContent").innerHTML = `
        <div style="padding:10px;">
            <h2 style="color:var(--gold-main); margin-top:0;">📍 تتبع حالة طلبك</h2>
            <div style="display:flex; gap:8px; margin:15px 0;">
                <input id="trackQuery" placeholder="رقم الهاتف أو رقم الطلب" style="margin:0;">
                <button class="gold" onclick="searchOrderStatus()">بحث</button>
            </div>
            <div id="trackResult"></div>
        </div>
    `;
    document.getElementById("modal").classList.add("show");
}

async function searchOrderStatus() {
    const q = document.getElementById("trackQuery")?.value.trim();
    const resBox = document.getElementById("trackResult");
    if (!q) return;

    try {
        const filter = (!isNaN(q) && q.length < 7) ? `id=eq.${q}` : `phone=ilike.*${q}*`;
        const r = await fetch(`${API_CONFIG.url}/rest/v1/orders?${filter}&select=id,customer_name,status,total,created_at&order=id.desc&limit=3`, { headers });
        const orders = await r.json();

        if (!orders.length) {
            resBox.innerHTML = `<p style="color:#ef4444;">لم يتم العثور على طلبات مطابقة.</p>`;
            return;
        }

        resBox.innerHTML = orders.map(o => `
            <div style="background:var(--bg-surface-elevated);padding:10px;border-radius:8px;margin-top:8px;border-right:3px solid var(--gold-main);">
                <b>طلب #${o.id} - ${esc(o.customer_name)}</b><br>
                <span style="color:var(--gold-main);">${orderStatusLabels[o.status] || o.status}</span>
            </div>
        `).join("");
    } catch (e) {
        resBox.innerHTML = `<p style="color:#ef4444;">خطأ في الاتصال</p>`;
    }
}

function closeModal() {
    document.getElementById("modal").classList.remove("show");
}

document.querySelectorAll(".cats-bar button").forEach(button => {
    button.onclick = () => {
        document.querySelectorAll(".cats-bar button").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        currentCategory = button.dataset.cat;
        handleSearch();
    };
});

/* =========================
   START
========================= */
initTheme();
initLanguage();
save();
loadSettings();
loadProducts();

if (window.location.hash === "#openCart") {
    setTimeout(() => { openCart(); }, 400);
}
