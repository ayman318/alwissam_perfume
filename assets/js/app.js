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

/* السعر النهائي بعد الخصم */
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

/* قيمة الخصم */
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

/* =========================
   SETTINGS
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
   PRODUCT CARDS (مع الحركة المتتابعة)
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

        return `
            <article
                class="card"
                data-cat="${esc(product.category)}"
                style="animation-delay: ${index * 0.08}s"
            >
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
    let total = 0;

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

    const rows = cart.map((item, index) => {
        const final = fp(item.size);
        const itemTotal = final * Number(item.qty);
        total += itemTotal;

        return `
            <div class="item">
                <div>
                    <b>${esc(item.product.name)}</b>
                    <br>
                    <small>${item.size.size_ml} ml × ${item.qty}</small>
                    ${
                        item.size.discount_enabled
                        ? `<br><small>خصم: ${money(discountAmount(item.size))}</small>`
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
        ${rows}
        <h3 class="total">الإجمالي: ${money(total)}</h3>
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
            <input id="customerName" required placeholder="الاسم">
            <input id="customerPhone" required type="tel" placeholder="رقم الموبايل">
            <textarea id="customerAddress" required placeholder="العنوان بالتفصيل"></textarea>
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

function buildWhatsAppMessage(orderId, name, phone, address, total) {
    let message = "";
    message += "🛍️ *طلب جديد - الوسام للعطور*\n━━━━━━━━━━━━━━\n\n";
    message += `🔢 رقم الطلب: #${orderId}\n`;
    message += `👤 العميل: ${name}\n`;
    message += `📱 الهاتف: ${phone}\n`;
    message += `📍 العنوان: ${address}\n\n`;
    message += "🧴 *تفاصيل الطلب:*\n";

    cart.forEach((item, index) => {
        const original = Number(item.size.price || 0);
        const final = fp(item.size);
        const discount = discountAmount(item.size);
        const itemTotal = final * Number(item.qty);

        message += `\n${index + 1}. ${item.product.name}\n`;
        message += `   📏 الحجم: ${item.size.size_ml} ml\n`;
        message += `   🔢 الكمية: ${item.qty}\n`;
        message += `   💰 السعر: ${money(original)}\n`;
        if (discount > 0) {
            message += `   🏷️ الخصم: ${money(discount)}\n`;
            message += `   💵 بعد الخصم: ${money(final)}\n`;
        }
        message += `   📦 الإجمالي: ${money(itemTotal)}\n`;
    });

    message += "\n━━━━━━━━━━━━━━\n";
    message += `💰 *الإجمالي النهائي: ${money(total)}*\n\n`;
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
    const total = cart.reduce((sum, item) => sum + fp(item.size) * Number(item.qty), 0);

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
                    total: total,
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
        const whatsappMessage = buildWhatsAppMessage(order.id, name, phone, address, total);

        cart = [];
        save();

        document.getElementById("modalContent").innerHTML = `
            <div class="empty">
                <h2>✅ تم تسجيل طلبك</h2>
                <p>رقم الطلب: <strong>#${order.id}</strong></p>
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
   CATEGORIES (مع إعادة تشغيل التتابع عند الفلترة)
========================= */

document.querySelectorAll(".cats button").forEach(button => {
    button.onclick = () => {
        document.querySelectorAll(".cats button").forEach(item => item.classList.remove("active"));
        button.add = button.classList.add("active");

        const category = button.dataset.cat;
        let visibleIndex = 0;

        document.querySelectorAll(".card").forEach(card => {
            const isMatch = category === "all" || category === card.dataset.cat;
            if (isMatch) {
                card.style.display = "";
                card.style.animation = "none";
                card.offsetHeight; // إعادة تفعيل التدفق الحركي
                card.style.animation = `cardEntrance .6s cubic-bezier(.16,1,.3,1) ${visibleIndex * 0.08}s backwards`;
                visibleIndex++;
            } else {
                card.style.display = "none";
            }
        });
    };
});

/* =========================
   START
========================= */

save();
loadSettings();
loadProducts();
