const API_CONFIG = {
    url: "https://dbtvicvsabdypxjhafxt.supabase.co",
    anonKey: "sb_publishable_cE_nDKgQJMBczIgGph0WbA_ekFMWxlq"
};

const labels = {
    men: "رجال",
    women: "نساء",
    unisex: "للجنسين",
    original: "أورجينال"
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
    Number(n || 0).toLocaleString("ar-EG", {
        maximumFractionDigits: 2
    }) + " جنيه";

const esc = s =>
    String(s ?? "").replace(/[&<>"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m]));

/* ==========================================
   إدارة الثيم: لايت مود و نايت مود (الافتراضي Dark)
========================================== */
function initTheme() {
    const savedTheme = localStorage.getItem("wissam_theme") || "dark";
    applyTheme(savedTheme);

    const toggleBtn = document.getElementById("themeToggle");
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            applyTheme(newTheme);
        };
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("wissam_theme", theme);
    const icon = document.querySelector(".theme-icon");
    if (icon) {
        icon.textContent = theme === "dark" ? "☀️" : "🌙";
    }
}

/* السعر النهائي بعد الخصم العادي للمنتج */
function fp(size) {
    const price = Number(size?.price || 0);
    if (!size?.discount_enabled) {
        return price;
    }
    const discount = Number(size?.discount_value || 0);
    if (size.discount_type === "percent") {
        return Math.max(0, price - (price * discount / 100));
    }
    return Math.max(0, price - discount);
}

/* قيمة الخصم للمنتج الفردي */
function discountAmount(size) {
    const price = Number(size?.price || 0);
    if (!size?.discount_enabled) {
        return 0;
    }
    const discount = Number(size?.discount_value || 0);
    if (size.discount_type === "percent") {
        return price * discount / 100;
    }
    return discount;
}

/* حساب إجمالي السلة واحتساب عدد الهدايا المستحقة تلقائياً */
function calcCartTotal() {
    let subtotal = cart.reduce((sum, item) => sum + fp(item.size) * Number(item.qty), 0);
    let totalQty = cart.reduce((sum, item) => sum + Number(item.qty), 0);
    let earnedFreeGifts = 0;

    if (storeSettings?.offer_enabled) {
        const buyStep = Number(storeSettings.offer_buy_qty || 2);
        const freeStep = Number(storeSettings.offer_free_qty || 1);
        earnedFreeGifts = Math.floor(totalQty / buyStep) * freeStep;
    }

    return {
        subtotal,
        totalQty,
        earnedFreeGifts,
        finalTotal: subtotal
    };
}

/* =========================
   SETTINGS & FLOATING WHATSAPP
========================= */

async function loadSettings() {
    try {
        const r = await fetch(
            `${API_CONFIG.url}/rest/v1/settings?select=*&limit=1`,
            { headers }
        );
        if (!r.ok) {
            throw new Error(await r.text());
        }
        const data = await r.json();
        if (!data.length) {
            return;
        }
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

    box.innerHTML = `
        <div class="empty">
            🧴 جاري تحميل المنتجات...
        </div>
    `;

    try {
        const url =
            `${API_CONFIG.url}/rest/v1/products` +
            `?select=*,product_sizes(*)` +
            `&active=eq.true` +
            `&order=id.desc`;

        const r = await fetch(url, { headers });
        if (!r.ok) {
            throw new Error(await r.text());
        }
        const data = await r.json();
        products = data.map(product => {
            const sizes = (product.product_sizes || []).sort((a, b) => Number(a.size_ml) - Number(b.size_ml));
            return {
                ...product,
                sizes
            };
        });
        renderProducts();
    } catch (error) {
        console.error("Products error:", error);
        box.innerHTML = `
            <div class="empty">
                ❌ تعذر تحميل المنتجات
                <br>
                <small>${esc(error.message)}</small>
            </div>
        `;
    }
}

/* =========================
   PRODUCT CARDS & LIVE SEARCH
========================= */

function renderProducts() {
    const box = document.getElementById("products");
    if (!box) return;

    if (!products.length) {
        box.innerHTML = `
            <div class="empty">
                🧴 لا توجد منتجات حاليًا.
                <br>
                <small>أضف أول منتج من لوحة التحكم.</small>
            </div>
        `;
        return;
    }

    box.innerHTML = products.map((product, index) => {
        const sizes = product.sizes || [];
        const firstSize = sizes[0];

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
                priceHTML = `
                    <div class="price-box">
                        <del>${money(originalPrice)}</del>
                        <strong>${money(finalPrice)}</strong>
                    </div>
                `;
            } else {
                priceHTML = `
                    <div class="price-box">
                        <strong>${money(finalPrice)}</strong>
                    </div>
                `;
            }
        } else {
            priceHTML = `<small>لا يوجد سعر</small>`;
        }

        const image = product.image || "assets/images/logo.jpg";
        const offerBadge = storeSettings?.offer_enabled 
            ? `<span class="badge-offer">🎁 اشتري 2 وخد 1 هدية</span>` 
            : "";
        const discountBadge = hasDiscount 
            ? `<span class="badge-discount">خصم ${maxDiscountPercent}%</span>` 
            : "";

        return `
            <article
                class="card"
                data-cat="${esc(product.category)}"
                data-name="${esc(product.name).toLowerCase()}"
                style="animation-delay: ${index * 0.08}s"
            >
                <div class="badges-container">
                    ${offerBadge}
                    ${discountBadge}
                </div>
                <img
                    src="${esc(image)}"
                    alt="${esc(product.name)}"
                    onerror="this.onerror=null;this.src='assets/images/logo.jpg'"
                >
                <div>
                    <small>${labels[product.category] || ""}</small>
                    <h3>${esc(product.name)}</h3>
                    ${priceHTML}
                    ${
                        sizes.length
                        ? `<small style="display:block;margin:6px 0;color:var(--gold-main);">${sizes.map(s => `${s.size_ml} ml`).join(" • ")}</small>`
                        : ""
                    }
                    <a href="product.html?id=${product.id}" class="card-btn-link">
                        عرض تفاصيل العطر 🛍️
                    </a>
                </div>
            </article>
        `;
    }).join("");
}

function handleSearch() {
    const searchInput = document.getElementById("searchInput");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    let visibleIndex = 0;

    document.querySelectorAll(".card").forEach(card => {
        const matchCategory = currentCategory === "all" || card.dataset.cat === currentCategory;
        const matchName = card.dataset.name.includes(query);

        if (matchCategory && matchName) {
            card.style.display = "";
            card.style.animation = "none";
            card.offsetHeight;
            card.style.animation = `cardEntrance .5s cubic-bezier(.16,1,.3,1) ${visibleIndex * 0.06}s backwards`;
            visibleIndex++;
        } else {
            card.style.display = "none";
        }
    });
}

/* =========================
   CART & ACTION PROMPT
========================= */

function save() {
    localStorage.setItem("wissam_cart", JSON.stringify(cart));
    const counter = document.getElementById("cartCount");
    if (counter) {
        counter.textContent = cart.reduce((total, item) => total + Number(item.qty || 0), 0);
    }
}

/* =========================
   CART VIEW
========================= */

function openCart() {
    showCart();
}

function showCart() {
    const modalContent = document.getElementById("modalContent");
    if (!cart.length) {
        modalContent.innerHTML = `
            <div class="empty">
                <h2>🛒 السلة فارغة</h2>
                <p>أضف المنتجات التي تريد طلبها.</p>
                <button class="gold" onclick="closeModal()" style="margin-top:15px;">تصفح العطور الآن</button>
            </div>
        `;
        document.getElementById("modal").classList.add("show");
        return;
    }

    const { totalQty, earnedFreeGifts, finalTotal } = calcCartTotal();

    let offerBanner = "";
    if (storeSettings?.offer_enabled) {
        if (earnedFreeGifts > 0) {
            offerBanner = `
                <div style="background:rgba(34,197,94,0.12);border:1px solid #22c55e;padding:12px;border-radius:10px;margin-bottom:15px;text-align:center;">
                    <div style="color:#4ade80;font-weight:bold;font-size:15px;">🎉 مبروك! لك (${earnedFreeGifts}) عطر هدية مجاناً مع طلبك! 🎁</div>
                    <small style="color:var(--text-muted);font-size:12px;">المطلوب منك فقط ثمن قطعتين وسنضيف الهدية مع الأوردر.</small>
                </div>
            `;
        } else if (totalQty === 1) {
            offerBanner = `
                <div style="background:rgba(214,179,75,0.12);border:1px dashed var(--gold-main);padding:12px;border-radius:10px;margin-bottom:15px;text-align:center;">
                    <div style="color:var(--gold-main);font-weight:bold;font-size:14px;">🔥 أضف عطر كمان للسلة وخد الثالث هدية مجاناً!</div>
                </div>
            `;
        }
    }

    const rows = cart.map((item, index) => {
        const final = fp(item.size);
        const itemTotal = final * Number(item.qty);

        return `
            <div class="item">
                <div>
                    <b>${esc(item.product.name)}</b>
                    <br>
                    <small>${item.size.size_ml} ml × ${item.qty}</small>
                    ${
                        item.size.discount_enabled
                        ? `<br><small style="color:var(--gold-main);">خصم مطبق: ${money(discountAmount(item.size))}</small>`
                        : ""
                    }
                </div>
                <b>${money(itemTotal)}</b>
                <button onclick="cart.splice(${index},1); save(); showCart();">حذف</button>
            </div>
        `;
    }).join("");

    modalContent.innerHTML = `
        <h2>🛒 سلة المشتريات</h2>
        ${offerBanner}
        ${rows}
        ${earnedFreeGifts > 0 ? `
            <div style="background:var(--bg-surface-elevated);border-right:3px solid var(--gold-main);padding:10px;margin-top:12px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
                <span style="color:var(--gold-main);font-weight:bold;">🎁 عطر إضافي هدية (ضمن العرض):</span>
                <b style="color:#4ade80;">مجاناً (${earnedFreeGifts} قطعة)</b>
            </div>
        ` : ""}
        <div style="margin-top:15px; border-top:1px solid var(--border-color); padding-top:10px;">
            <h3 class="total" style="margin:0;">الإجمالي المطلوب: ${money(finalTotal)}</h3>
        </div>
        <button class="gold full" onclick="checkout()">إتمام الطلب</button>
    `;
    document.getElementById("modal").classList.add("show");
}

/* =========================
   CHECKOUT
========================= */

function checkout() {
    if (!cart.length) {
        alert("السلة فارغة");
        return;
    }
    document.getElementById("modalContent").innerHTML = `
        <h2>بيانات الطلب</h2>
        <form onsubmit="sendOrder(event)">
            <input id="customerName" required placeholder="الاسم بالكامل">
            <input id="customerPhone" required type="tel" placeholder="رقم الموبايل">
            <textarea id="customerAddress" required placeholder="العنوان بالتفصيل"></textarea>
            <textarea id="customerNotes" style="min-height:75px;" placeholder="ملاحظات إضافية على الطلب أو ترشيحك لنوع العطر الهدية..."></textarea>
            <button class="gold full" type="submit">تأكيد الطلب</button>
        </form>
    `;
}

/* =========================
   WHATSAPP NUMBER
========================= */

function normalizeWhatsApp(number) {
    if (!number) return "";
    let value = String(number).replace(/\D/g, "");
    if (value.startsWith("0")) {
        value = "20" + value.substring(1);
    }
    if (value.startsWith("20") && value.length >= 12) {
        return value;
    }
    return value;
}

/* =========================
   BUILD WHATSAPP MESSAGE
========================= */

function buildWhatsAppMessage(orderId, name, phone, address, notes, total, earnedFreeGifts) {
    let message = "";
    message += "🛍️ *طلب جديد - الوسام للعطور*\n━━━━━━━━━━━━━━\n\n";
    message += `🔢 رقم الطلب: #${orderId}\n`;
    message += `👤 العميل: ${name}\n`;
    message += `📱 الهاتف: ${phone}\n`;
    message += `📍 العنوان: ${address}\n`;
    if (notes) {
        message += `📝 ملاحظات العميل: ${notes}\n`;
    }
    message += "\n🧴 *تفاصيل المنتجات المطلوبة:*\n";

    cart.forEach((item, index) => {
        const final = fp(item.size);
        const itemTotal = final * Number(item.qty);

        message += `\n${index + 1}. ${item.product.name}\n`;
        message += `   📏 الحجم: ${item.size.size_ml} ml\n`;
        message += `   🔢 الكمية: ${item.qty}\n`;
        message += `   💰 الإجمالي: ${money(itemTotal)}\n`;
    });

    if (earnedFreeGifts > 0) {
        message += "\n━━━━━━━━━━━━━━\n";
        message += `🎁 *العرض الخاص المستحق:* مبروك! مستحق (+${earnedFreeGifts} قطعة هدية مجانية) مع الأوردر!\n`;
    }

    message += "\n━━━━━━━━━━━━━━\n";
    message += `💰 *المطلوب دفعه: ${money(total)}*\n\n`;
    message += "شكراً لاختياركم الوسام للعطور 🌹";
    return message;
}

/* =========================
   SEND ORDER
========================= */

async function sendOrder(event) {
    event.preventDefault();
    if (!cart.length) {
        alert("السلة فارغة");
        return;
    }

    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const address = document.getElementById("customerAddress").value.trim();
    const notes = document.getElementById("customerNotes")?.value.trim() || "";
    const { finalTotal, earnedFreeGifts } = calcCartTotal();

    let combinedNotes = notes;
    if (earnedFreeGifts > 0) {
        combinedNotes = combinedNotes 
            ? `[🎁 مستحق ${earnedFreeGifts} قطعة هدية ضمن العرض] - ${combinedNotes}` 
            : `[🎁 مستحق ${earnedFreeGifts} قطعة هدية ضمن العرض]`;
    }

    try {
        const orderResponse = await fetch(
            `${API_CONFIG.url}/rest/v1/orders`,
            {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                body: JSON.stringify({
                    customer_name: name,
                    phone: phone,
                    address: address,
                    notes: combinedNotes,
                    total: finalTotal,
                    status: "pending"
                })
            }
        );

        if (!orderResponse.ok) {
            const errorText = await orderResponse.text();
            throw new Error("فشل حفظ الطلب:\n" + errorText);
        }

        const orderData = await orderResponse.json();
        const order = orderData?.[0];

        if (!order?.id) {
            throw new Error("تم إنشاء الطلب لكن لم يتم الحصول على رقم الطلب.");
        }

        const items = cart.map(item => {
            const original = Number(item.size.price || 0);
            const final = fp(item.size);
            return {
                order_id: order.id,
                product_id: item.product.id,
                product_name: item.product.name,
                size_ml: Number(item.size.size_ml),
                quantity: Number(item.qty),
                original_price: original,
                discount: original - final,
                final_price: final
            };
        });

        const itemsResponse = await fetch(
            `${API_CONFIG.url}/rest/v1/order_items`,
            {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify(items)
            }
        );

        if (!itemsResponse.ok) {
            const errorText = await itemsResponse.text();
            throw new Error("تم إنشاء الطلب ولكن فشل حفظ تفاصيل المنتجات:\n" + errorText);
        }

        const whatsapp = normalizeWhatsApp(storeSettings?.whatsapp);
        const whatsappMessage = buildWhatsAppMessage(order.id, name, phone, address, notes, finalTotal, earnedFreeGifts);

        cart = [];
        save();

        document.getElementById("modalContent").innerHTML = `
            <div class="empty">
                <h2>✅ تم تسجيل طلبك بنجاح</h2>
                <p>رقم طلبك: <strong style="color:var(--gold-main); font-size:18px;">#${order.id}</strong></p>
                <p style="font-size:13px; color:var(--text-muted);">احتفظ برقم الطلب لتتبعه في أي وقت من زر التتبع في الأعلى.</p>
                ${earnedFreeGifts > 0 ? `<p style="color:var(--gold-main);font-weight:bold;">🎁 تم احتساب قطعتك الهدية المجانية وسيتم تجهيزها مع الطلب!</p>` : ""}
                ${
                    whatsapp
                    ? `
                        <p>اضغط الزر لإرسال تفاصيل الطلب عبر WhatsApp.</p>
                        <button class="gold full" onclick='openWhatsApp(${JSON.stringify(whatsappMessage)})'>
                            📱 إرسال الطلب على WhatsApp
                        </button>
                    `
                    : `<p>⚠️ لم يتم العثور على رقم WhatsApp في إعدادات المتجر.</p>`
                }
                <button class="gold full" onclick="closeModal()" style="margin-top:10px">
                    حسناً
                </button>
            </div>
        `;
    } catch (error) {
        console.error("Order error:", error);
        alert("❌ فشل إرسال الطلب\n\n" + error.message);
    }
}

/* ==========================================
   ORDER TRACKER (تتبع حالة الطلب)
========================================== */

function openTrackModal() {
    document.getElementById("modalContent").innerHTML = `
        <div style="padding:10px;">
            <h2 style="color:var(--gold-main); margin-top:0;">📍 تتبع حالة طلبك</h2>
            <p style="color:var(--text-muted); font-size:14px;">أدخل رقم الهاتف المسجل به الطلب أو رقم الطلب مباشرة:</p>
            <div style="display:flex; gap:8px; margin:15px 0;">
                <input id="trackQuery" placeholder="رقم الهاتف (مثال: 01xxxxxxxxx) أو رقم الطلب" style="margin:0;">
                <button class="gold" onclick="searchOrderStatus()" style="white-space:nowrap; border-radius:10px;">بحث</button>
            </div>
            <div id="trackResult"></div>
        </div>
    `;
    document.getElementById("modal").classList.add("show");
}

async function searchOrderStatus() {
    const q = document.getElementById("trackQuery")?.value.trim();
    const resBox = document.getElementById("trackResult");
    if (!q) {
        resBox.innerHTML = `<p style="color:#ef4444; font-size:13px;">يرجى كتابة رقم الطلب أو رقم الهاتف.</p>`;
        return;
    }

    resBox.innerHTML = `<p style="color:var(--text-muted); font-size:13px;">جاري البحث عن طلبك...</p>`;

    try {
        let filter = "";
        if (!isNaN(q) && q.length < 7) {
            filter = `id=eq.${q}`;
        } else {
            filter = `phone=ilike.*${q}*`;
        }

        const r = await fetch(`${API_CONFIG.url}/rest/v1/orders?${filter}&select=id,customer_name,status,total,created_at&order=id.desc&limit=3`, { headers });
        const orders = await r.json();

        if (!orders || !orders.length) {
            resBox.innerHTML = `<p style="color:#ef4444; font-size:13px;">لم يتم العثور على أي طلبات مطابقة لهذه البيانات.</p>`;
            return;
        }

        resBox.innerHTML = orders.map(o => `
            <div class="track-step">
                <div style="flex:1;">
                    <div style="font-weight:bold; color:var(--text-main);">طلب #${o.id} - ${esc(o.customer_name)}</div>
                    <div style="color:var(--gold-main); font-weight:700; font-size:14px; margin:4px 0;">
                        ${orderStatusLabels[o.status] || o.status}
                    </div>
                    <small style="color:var(--text-dim);">${new Date(o.created_at).toLocaleDateString("ar-EG")} | ${money(o.total)}</small>
                </div>
            </div>
        `).join("");
    } catch (e) {
        resBox.innerHTML = `<p style="color:#ef4444; font-size:13px;">خطأ في الاتصال: ${esc(e.message)}</p>`;
    }
}

/* =========================
   OPEN WHATSAPP
========================= */

function openWhatsApp(message) {
    const number = normalizeWhatsApp(storeSettings?.whatsapp);
    if (!number) {
        alert("رقم WhatsApp غير موجود في إعدادات المتجر.");
        return;
    }
    const url = `https://wa.me/${number}?text=` + encodeURIComponent(message);
    window.open(url, "_blank");
}

/* =========================
   CLOSE MODAL
========================= */

function closeModal() {
    const modal = document.getElementById("modal");
    if (modal) {
        modal.classList.remove("show");
    }
}

/* =========================
   CATEGORIES (يدعم الشريطين القديم والجديد)
========================= */

document.querySelectorAll(".cats-bar button, .cats button").forEach(button => {
    button.onclick = () => {
        document.querySelectorAll(".cats-bar button, .cats button").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        currentCategory = button.dataset.cat;
        handleSearch();
    };
});

/* =========================
   START
========================= */

initTheme();
save();
loadSettings();
loadProducts();

// فتح السلة تلقائياً إذا جاء العميل محولاً من صفحة المنتج بضغط إتمام الشراء
if (window.location.hash === "#openCart") {
    setTimeout(() => { openCart(); }, 400);
}
