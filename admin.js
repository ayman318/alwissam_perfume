const API_CONFIG = {
    url: "https://dbtvicvsabdypxjhafxt.supabase.co",
    anonKey: "sb_publishable_cE_nDKgQJMBczIgGph0WbA_ekFMWxlq"
};


/* =========================
   SUPABASE REQUEST
========================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const response = await fetch(
        `${API_CONFIG.url}/rest/v1/${endpoint}`,
        {
            ...options,

            headers: {
                "apikey": API_CONFIG.anonKey,
                "Authorization":
                    `Bearer ${API_CONFIG.anonKey}`,
                "Content-Type":
                    "application/json",
                ...(options.headers || {})
            }
        }
    );

    if (!response.ok) {
        throw new Error(
            await response.text()
        );
    }

    const text = await response.text();

    return text ? JSON.parse(text) : null;
}


/* =========================
   LOGIN
========================= */

document
    .getElementById("loginForm")
    .addEventListener("submit", async e => {

        e.preventDefault();

        const email =
            document
                .getElementById("loginEmail")
                .value
                .trim();

        const password =
            document
                .getElementById("loginPassword")
                .value;

        const error =
            document.getElementById("loginError");

        error.textContent = "جاري تسجيل الدخول...";

        try {

            const response = await fetch(
                `${API_CONFIG.url}/auth/v1/token?grant_type=password`,
                {
                    method: "POST",

                    headers: {
                        "apikey":
                            API_CONFIG.anonKey,

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error_description ||
                    data.msg ||
                    "بيانات الدخول غير صحيحة"
                );
            }

            localStorage.setItem(
                "wissam_access_token",
                data.access_token
            );

            localStorage.setItem(
                "wissam_user_id",
                data.user?.id || ""
            );

            await verifyAdmin(
                data.access_token,
                data.user?.id
            );

        } catch (err) {

            console.error(err);

            error.textContent =
                "❌ " + err.message;
        }
    });


/* =========================
   VERIFY ADMIN
========================= */

async function verifyAdmin(
    token,
    userId
) {

    if (!userId) {
        throw new Error(
            "تعذر معرفة حساب المستخدم"
        );
    }

    const response = await fetch(
        `${API_CONFIG.url}/rest/v1/admins?select=id,username&user_id=eq.${userId}`,
        {
            headers: {
                "apikey":
                    API_CONFIG.anonKey,

                "Authorization":
                    `Bearer ${token}`
            }
        }
    );

    const admins =
        await response.json();

    if (!response.ok) {
        throw new Error(
            JSON.stringify(admins)
        );
    }

    if (!admins.length) {

        localStorage.removeItem(
            "wissam_access_token"
        );

        throw new Error(
            "هذا الحساب ليس لديه صلاحية الأدمن"
        );
    }

    showDashboard();

    loadAdminProducts();

    loadOrders();
}


/* =========================
   SHOW DASHBOARD
========================= */

function showDashboard() {

    document
        .getElementById("loginSection")
        .style.display = "none";

    document
        .getElementById("dashboard")
        .style.display = "block";
}


/* =========================
   LOGOUT
========================= */

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "wissam_access_token"
            );

            localStorage.removeItem(
                "wissam_user_id"
            );

            location.reload();
        }
    );


/* =========================
   ADD PRODUCT
========================= */

document
    .getElementById("productForm")
    .addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            const token =
                localStorage.getItem(
                    "wissam_access_token"
                );

            if (!token) {
                alert("سجّل الدخول أولًا");
                return;
            }

            const product = {

                name:
                    document
                        .getElementById("productName")
                        .value
                        .trim(),

                description:
                    document
                        .getElementById("productDescription")
                        .value
                        .trim(),

                image:
                    document
                        .getElementById("productImage")
                        .value
                        .trim(),

                category:
                    document
                        .getElementById("productCategory")
                        .value
            };

            try {

                await apiRequest(
                    "products",
                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`,

                            "Prefer":
                                "return=representation"
                        },

                        body:
                            JSON.stringify(product)
                    }
                );

                alert(
                    "✅ تم إضافة المنتج"
                );

                e.target.reset();

                loadAdminProducts();

            } catch (error) {

                console.error(error);

                alert(
                    "❌ فشل إضافة المنتج\n\n" +
                    error.message
                );
            }
        }
    );


/* =========================
   LOAD PRODUCTS
========================= */

async function loadAdminProducts() {

    const box =
        document.getElementById(
            "adminProducts"
        );

    try {

        const token =
            localStorage.getItem(
                "wissam_access_token"
            );

        const data =
            await apiRequest(
                "products?select=*,product_sizes(*)&order=id.desc",
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        if (!data.length) {

            box.innerHTML =
                "<p>لا توجد منتجات.</p>";

            return;
        }

        box.innerHTML =
            data.map(product => `

                <div class="admin-product">

                    <h3>
                        ${escapeHtml(
                            product.name
                        )}
                    </h3>

                    <p>
                        ${
                            escapeHtml(
                                product.description || ""
                            )
                        }
                    </p>

                    <p>
                        القسم:
                        ${
                            escapeHtml(
                                product.category || ""
                            )
                        }
                    </p>

                    <p>
                        الأحجام:
                        ${
                            product.product_sizes?.length || 0
                        }
                    </p>

                </div>

            `).join("");

    } catch (error) {

        console.error(error);

        box.innerHTML =
            "❌ فشل تحميل المنتجات";
    }
}


/* =========================
   LOAD ORDERS
========================= */

async function loadOrders() {

    const box =
        document.getElementById(
            "adminOrders"
        );

    try {

        const token =
            localStorage.getItem(
                "wissam_access_token"
            );

        const orders =
            await apiRequest(
                "orders?select=*&order=id.desc",
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        if (!orders.length) {

            box.innerHTML =
                "<p>لا توجد طلبات.</p>";

            return;
        }

        box.innerHTML =
            orders.map(order => `

                <div class="admin-order">

                    <h3>
                        طلب #${order.id}
                    </h3>

                    <p>
                        العميل:
                        ${escapeHtml(
                            order.customer_name
                        )}
                    </p>

                    <p>
                        الهاتف:
                        ${escapeHtml(
                            order.phone
                        )}
                    </p>

                    <p>
                        الإجمالي:
                        ${order.total} جنيه
                    </p>

                    <p>
                        الحالة:
                        ${escapeHtml(
                            order.status || "pending"
                        )}
                    </p>

                </div>

            `).join("");

    } catch (error) {

        console.error(error);

        box.innerHTML =
            "❌ فشل تحميل الطلبات";
    }
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char])
    );
}


/* =========================
   CHECK EXISTING LOGIN
========================= */

(async function () {

    const token =
        localStorage.getItem(
            "wissam_access_token"
        );

    const userId =
        localStorage.getItem(
            "wissam_user_id"
        );

    if (!token || !userId) {
        return;
    }

    try {

        await verifyAdmin(
            token,
            userId
        );

    } catch (error) {

        console.error(error);

        localStorage.removeItem(
            "wissam_access_token"
        );

        localStorage.removeItem(
            "wissam_user_id"
        );
    }

})();