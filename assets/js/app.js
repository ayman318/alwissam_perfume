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

/* حساب إجمالي السلة: مجموع أسعار القطع فقط واحتساب عدد الهدايا المستحقة تلقائياً */
function calcCartTotal() {
    let subtotal = cart.reduce((sum, item) => sum + fp(item.size) * Number(item.qty), 0);
    let totalQty = cart.reduce((sum, item) => sum + Number(item.qty), 0);
    let earnedFreeGifts = 0;

    // بمجرد وصول عدد أي قطع بالسلة إلى 2، يحصل على 1 هدية (وإذا 4 يحصل على 2، وهكذا)
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

        // ربط الزر العائم برقم الواتساب
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
        products = data.map(product => ({
            ...product,
            sizes: product.product_sizes || []
        }));
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
   PRODUCT CARDS & LIVE SEARCH (مع الشارات)
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
        let discountLabel = "";

        if (firstSize) {
            const finalPrice = fp(firstSize);
            const originalPrice = Number(firstSize.price || 0);

            if (firstSize.discount_enabled && finalPrice < originalPrice) {
                hasDiscount = true;
                discountLabel = firstSize.discount_type === "percent" 
                    ? `خصم ${firstSize.discount_value}%` 
                    : `خصم ${firstSize.discount_value} ج`;

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

        // شارات العرض والخصم
        const offerBadge = storeSettings?.offer_enabled 
            ? `<span class="badge-offer">🎁 اشتري 2 وخد 1 هدية</span>` 
            : "";
        const discountBadge = hasDiscount 
            ? `<span class="badge-discount">${discountLabel}</span>` 
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
                        ? `<small>${sizes.map(s => `${s.size_ml} ml`).join(" • ")}</small>`
                        : ""
                    }
                    <button onclick='showProduct(${JSON.stringify(product).replace(/</g, "\\u003c")})'>
                        عرض المنتج
                    </button>
                </div>
            </article>
        `;
    }).join("");
}

/* منطق البحث اللحظي مع الحفاظ على الفئة المختارة */
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
   PRODUCT DETAILS
========================= */

function showProduct(product) {
    current = product;
    qty = 1;
    currentSize = product.sizes?.[0] || null;
    renderProduct();
    document.getElementById("modal").classList.add("show");
}

function renderProduct() {
    const modalContent = document.getElementById("modalContent");
    if (!modalContent || !current) return;

    const sizes = current.sizes || [];
    const image = current.image || "assets/images/logo.jpg";

    modalContent.innerHTML = `
        <div class="detail">
            <img
                src="${esc(image)}"
                alt="${esc(current.name)}"
                onerror="this.onerror=null;this.src='assets/images/logo.jpg'"
            >
            <div>
                <small>${labels[current.category] || ""}</small>
                <h2>${esc(current.name)}</h2>
                ${storeSettings?.offer_enabled ? `<div style="background:rgba(214,179,75,0.15);color:#d6b34b;border:1px solid #d6b34b;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:bold;margin:0 0 10px;display:inline-block;">🎁 مشمول في عرض: اشتري 2 واحصل على 1 هدية مجاناً!</div>` : ""}
                <p>${esc(current.description || "")}</p>
                <h3>اختر الحجم</h3>
                <div class="sizes">
                    ${
                        sizes.length
                        ? sizes.map(size => {
                            const original = Number(size.price || 0);
                            const final = fp(size);
                            const hasDiscount = size.discount_enabled && final < original;
                            return `
                                <button
                                    class="${Number(currentSize?.id) === Number(size.id) ? "sel" : ""}"
                                    onclick="pickSize(${size.id})"
                                >
                                    <b>${size.size_ml} ml</b>
                                    ${
                                        hasDiscount
                                        ? `<del>${money(original)}</del><strong>${money(final)}</strong>`
                                        : `<strong>${money(final)}</strong>`
                                    }
                                </button>
                            `;
                        }).join("")
                        : `<p>لا توجد أحجام متاحة.</p>`
                    }
                </div>
                <div class="qty">
                    <button onclick="qty = Math.max(1, qty - 1); renderProduct();">−</button>
                    <b>${qty}</b>
                    <button onclick="qty++; renderProduct();">+</button>
                </div>
                <button
                    class="gold full"
                    onclick="add()"
                    ${!currentSize ? "disabled" : ""}
                >
                    🛒 إضافة للسلة
                </button>
            </div>
        </div>
    `;
}

function pickSize(id) {
    currentSize = current.sizes.find(size => Number(size.id) === Number(id));
    renderProduct();
}

/* =========================
   CART
========================= */

function add() {
    if (!currentSize) {
        alert("من فضلك اختر الحجم أولًا");
        return;
    }
    const existing = cart.find(item =>
        Number(item.product.id) === Number(current.id) &&
        Number(item.size.id) === Number(currentSize.id)
    );
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            product: {
                id: current.id,
                name: current.name,
                image: current.image
            },
            size: currentSize,
            qty: qty
        });
    }
    save();
    showCart();
}

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
                    <small style="color:#bbb;font-size:12px;">المطلوب منك فقط ثمن قطعتين وسنضيف الهدية مع الأوردر.</small>
                </div>
            `;
        } else if (totalQty === 1) {
            offerBanner = `
                <div style="background:rgba(214,179,75,0.12);border:1px dashed #d6b34b;padding:12px;border-radius:10px;margin-bottom:15px;text-align:center;">
                    <div style="color:#d6b34b;font-weight:bold;font-size:14px;">🔥 أضف عطر كمان للسلة وخد الثالث هدية مجاناً!</div>
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
                        ? `<br><small style="color:#d6b34b;">خصم مطبق: ${money(discountAmount(item.size))}</small>`
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
            <div style="background:#171717;border-right:3px solid #d6b34b;padding:10px;margin-top:12px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
                <span style="color:#d6b34b;font-weight:bold;">🎁 عطر إضافي هدية (ضمن العرض):</span>
                <b style="color:#4ade80;">مجاناً (${earnedFreeGifts} قطعة)</b>
            </div>
        ` : ""}
        <div style="margin-top:15px; border-top:1px solid #333; padding-top:10px;">
            <h3 class="total" style="margin:0;">الإجمالي المطلوب: ${money(finalTotal)}</h3>
        </div>
        <button class="gold full" onclick="checkout()">إتمام الطلب</button>
    `;
    document.getElementById("modal").classList.add("show");
}

/* =========================
   CHECKOUT (مع خانة الملاحظات)
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

    // إرفاق نص الهدية مع الملاحظات للأدمن في لوحة التحكم
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
                <p>رقم الطلب: <strong>#${order.id}</strong></p>
                ${earnedFreeGifts > 0 ? `<p style="color:#d6b34b;font-weight:bold;">🎁 تم احتساب قطعتك الهدية المجانية وسيتم تجهيزها مع الطلب!</p>` : ""}
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
   CATEGORIES (مع ربط البحث المباشر)
========================= */

document.querySelectorAll(".cats button").forEach(button => {
    button.onclick = () => {
        document.querySelectorAll(".cats button").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        currentCategory = button.dataset.cat;
        handleSearch();
    };
});

/* =========================
   START
========================= */

save();
loadSettings();
loadProducts();
