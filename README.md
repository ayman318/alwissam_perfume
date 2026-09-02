<div align="center">

# ⚜️ متجر الوسام للعطور | Wissam Perfumes ⚜️
### منصة تجارة إلكترونية متكاملة للعطور الفاخرة

[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![JavaScript](https://img.shields.io/badge/Frontend-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![WhatsApp Integration](https://img.shields.io/badge/Orders-WhatsApp%20Direct-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com)

<br/>

</div>

---

## 🌟 نبذة عن المشروع
منصة ويب سريعة وخفيفة مصممة خصيصاً لمتجر **الوسام للعطور**، تجمع بين تجربة تسوق فخمة للمستخدم ولوحة تحكم إدارية مرنة لإدارة المنتجات، الأسعار، العروض، والطلبات في الوقت الفعلي.

---

## ✨ المميزات الرئيسية

### 🛍️ واجهة المتجر (Storefront)
* **واجهة داكنة فاخرة (Dark/Gold Theme):** تجربة بصرية راقية تليق بعالم العطور.
* **حركات متتابعة (Staggered Animation):** تدفق سلس للكروت عند التحميل والفلترة.
* **سلة مشتريات ذكية:** حساب فوري للخصومات وأسعار الأحجام المختلفة.
* **نظام العروض التلقائي:** تطبيق عروض (اشترِ X واحصل على Y هدية) وخصم أرخص قطعة تلقائياً.
* **إتمام الطلب عبر WhatsApp:** تحويل تفاصيل الفاتورة برسالة منسقة تلقائياً للتاجر.

### ⚙️ لوحة التحكم (Admin Panel)
* **إدارة المنتجات والأحجام:** إضافة، تعديل، وحذف العطور مع تحديد أحجام متعددة ونسب خصم من 5% إلى 100%.
* **إدارة الطلبات والحالات:** تعريب كامل لمراحل الطلب (قيد الانتظار، تم التأكيد، تم الشحن، تم التوصيل، ملغي).
* **نظام فواتير احترافي:** 
  * 🖨️ طباعة فاتورة مفردة موضحة لكافة القطع والمنتجات.
  * 📊 طباعة كشف مجمع لكافة طلبات المتجر مع إجمالي المبيعات.
* **التحكم بالعروض والإعدادات:** تفعيل وتعديل عروض الهدايا وتغيير بيانات المتجر والواتساب بضغطة زر.

---

## 🛠️ التقنيات المستخدمة
* **Frontend:** HTML5, CSS3, Modern Vanilla JavaScript (ES6+).
* **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Row-Level Security, Storage Buckets).
* **Fonts & Icons:** Google Fonts (Cairo) ومكتبات أيقونات مدمجة.

---

## 📂 هيكلة المشروع

```text
├── index.html              # الصفحة الرئيسية وواجهة العرض
├── admin.html              # لوحة تحكم الإدارة
├── assets/
│   ├── css/
│   │   ├── style.css       # تنسيقات المتجر وحركات العرض
│   │   └── admin.css       # تنسيقات لوحة التحكم
│   ├── js/
│   │   ├── app.js          # منطق المتجر، السلة، والواتساب
│   │   └── admin.js        # منطق لوحة التحكم والفواتير
│   └── images/             # شعارات وصور المتجر
└── README.md
