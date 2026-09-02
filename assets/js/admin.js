const SB={url:"https://dbtvicvsabdypxjhafxt.supabase.co",key:"sb_publishable_cE_nDKgQJMBczIgGph0WbA_ekFMWxlq"};
let token=localStorage.getItem("wissam_admin_token")||"",uid=localStorage.getItem("wissam_admin_uid")||"",products=[],orders=[],settingsRow=null,sizeProductId=null;
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=n=>Number(n||0).toLocaleString("ar-EG",{maximumFractionDigits:2})+" جنيه";

const orderStatusLabels = {
  pending: "قيد الانتظار ⏳",
  confirmed: "تم التأكيد ✅",
  shipped: "تم الشحن 🚚",
  delivered: "تم التوصيل 🎁",
  cancelled: "ملغي ❌"
};

function H(){return {apikey:SB.key,Authorization:`Bearer ${token}`, "Content-Type":"application/json"}}
async function rest(path,opt={}){let r=await fetch(`${SB.url}/rest/v1/${path}`,{...opt,headers:{...H(),...(opt.headers||{})}}),t=await r.text(),d=null;try{d=t?JSON.parse(t):null}catch{}if(!r.ok)throw Error(d?.message||d?.hint||t||"خطأ");return d}
function showApp(){$("loginView").classList.add("hidden");$("appView").classList.remove("hidden")}
function message(t,e=false){$("globalMsg").textContent=t;$("globalMsg").style.color=e?"#ff8e8e":"#e9c77d";setTimeout(()=>$("globalMsg").textContent="",3000)}
async function login(){let r=await fetch(`${SB.url}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({email:$("email").value.trim(),password:$("password").value})}),d=await r.json();if(!r.ok)throw Error(d.error_description||"بيانات الدخول غير صحيحة");token=d.access_token;uid=d.user.id;let a=await rest(`admins?select=id&user_id=eq.${encodeURIComponent(uid)}`);if(!a.length)throw Error("الحساب ليس مسجلًا كأدمن.");localStorage.setItem("wissam_admin_token",token);localStorage.setItem("wissam_admin_uid",uid);showApp();refresh()}
$("loginForm").onsubmit=async e=>{e.preventDefault();try{await login()}catch(x){$("loginMsg").textContent="❌ "+x.message}}
$("logoutBtn").onclick=()=>{localStorage.removeItem("wissam_admin_token");localStorage.removeItem("wissam_admin_uid");location.reload()}
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>go(b.dataset.section));document.querySelectorAll(".quick").forEach(b=>b.onclick=()=>go(b.dataset.go));
function go(s){document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.section===s));document.querySelectorAll(".page-section").forEach(x=>x.classList.toggle("active",x.id==="section-"+s));$("pageTitle").textContent={dashboard:"الرئيسية",products:"المنتجات",orders:"الطلبات",settings:"الإعدادات"}[s];$("sidebar").classList.remove("open")}
async function refresh(){await Promise.all([loadProducts(),loadOrders(),loadSettings()]);stats()}
async function loadProducts(){try{products=await rest("products?select=*,product_sizes(*)&order=id.desc")||[];renderProducts()}catch(e){$("productsList").innerHTML=`<div class="empty">❌ ${esc(e.message)}</div>`}}
function finalPrice(s){let p=Number(s.price||0);if(!s.discount_enabled)return p;let d=Number(s.discount_value||0);return s.discount_type==="percent"?Math.max(0,p-p*d/100):Math.max(0,p-d)}
function renderProducts(){if(!products.length){$("productsList").innerHTML='<div class="empty">🧴 لا توجد منتجات.</div>';return}$("productsList").innerHTML=products.map(p=>`<article class="product-admin"><img src="${esc(p.image||"assets/images/logo.jpg")}"><div class="product-body"><span class="eyebrow">${esc({men:"رجال",women:"نساء",unisex:"للجنسين",original:"أورجينال"}[p.category]||"")}</span><h4>${esc(p.name)}</h4><div class="muted">${esc(p.description||"بدون وصف")}</div><div class="action-row"><button class="btn" onclick="openProduct(${p.id})">✏️ تعديل</button><button class="btn danger" onclick="deleteProduct(${p.id})">🗑️ حذف</button></div><div class="sizes-box"><b>الأحجام والأسعار</b>${(p.product_sizes||[]).map(s=>`<div class="size-row"><span>${s.size_ml} ml</span><span>${money(finalPrice(s))}</span><button class="btn danger" onclick="deleteSize(${s.id})">حذف</button></div>`).join("")||'<p class="muted">لا توجد أحجام.</p>'}<button class="btn primary full" onclick="openSize(${p.id})">＋ إضافة حجم / سعر / خصم</button></div></div></article>`).join("")}
$("newProductBtn").onclick=()=>openProduct();
function openProduct(id){$("productModal").classList.add("show");$("productModalTitle").textContent=id?"تعديل المنتج":"إضافة منتج";$("editProductId").value=id||"";$("productForm").reset();$("productActive").checked=true;$("imagePreview").classList.add("hidden");if(id){let p=products.find(x=>Number(x.id)===Number(id));$("productName").value=p.name||"";$("productCategory").value=p.category||"";$("productDescription").value=p.description||"";$("productActive").checked=p.active!==false;if(p.image){$("imagePreview").src=p.image;$("imagePreview").classList.remove("hidden")}}}
$("productImageFile").onchange=()=>{let f=$("productImageFile").files[0];if(f){$("imagePreview").src=URL.createObjectURL(f);$("imagePreview").classList.remove("hidden")}}
async function uploadImage(f){let ext=(f.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg",path=`products/${crypto.randomUUID()}.${ext}`,r=await fetch(`${SB.url}/storage/v1/object/product-images/${path}`,{method:"POST",headers:{apikey:SB.key,Authorization:`Bearer ${token}`,"Content-Type":f.type||"application/octet-stream","x-upsert":"true"},body:f});if(!r.ok)throw Error("فشل رفع الصورة: "+await r.text());return `${SB.url}/storage/v1/object/public/product-images/${path}`}
$("productForm").onsubmit=async e=>{e.preventDefault();try{let id=$("editProductId").value,f=$("productImageFile").files[0],payload={name:$("productName").value.trim(),category:$("productCategory").value,description:$("productDescription").value.trim(),active:$("productActive").checked,updated_at:new Date().toISOString()};if(f)payload.image=await uploadImage(f);if(!payload.name||!payload.category)throw Error("اكتب اسم المنتج واختر القسم.");if(id)await rest(`products?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)});else await rest("products",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)});$("productModal").classList.remove("show");message(id?"تم تعديل المنتج":"تم إضافة المنتج");loadProducts()}catch(x){message(x.message,true)}}
async function deleteProduct(id){if(!confirm("حذف المنتج؟"))return;try{await rest(`products?id=eq.${id}`,{method:"DELETE"});message("تم حذف المنتج");loadProducts()}catch(e){message("لم يتم الحذف: "+e.message,true)}}

function openSize(id){
    sizeProductId=id;
    $("sizeModal").classList.add("show");
    $("sizeForm").reset();
    $("sizeDiscountEnabled").checked=false;
    if($("discountValue")) $("discountValue").value = "5";
    toggleDiscount();
}
function toggleDiscount(){ $("discountFields").classList.toggle("hidden",!$("sizeDiscountEnabled").checked)}
$("sizeDiscountEnabled").onchange=toggleDiscount;

$("sizeForm").onsubmit=async e=>{
    e.preventDefault();
    try{
        let size=Number($("sizeMl").value),
            price=Number($("sizePrice").value),
            on=$("sizeDiscountEnabled").checked,
            value=Number($("discountValue")?.value||5);
        if(!price&&price!==0)throw Error("اكتب السعر.");
        await rest("product_sizes",{
            method:"POST",
            headers:{Prefer:"return=minimal"},
            body:JSON.stringify({
                product_id:sizeProductId,
                size_ml:size,
                price,
                discount_enabled:on,
                discount_type:"percent",
                discount_value:on?value:0
            })
        });
        $("sizeModal").classList.remove("show");
        message("تم حفظ الحجم والسعر");
        loadProducts();
    }catch(x){message(x.message,true)}
}

async function deleteSize(id){if(!confirm("حذف الحجم؟"))return;try{await rest(`product_sizes?id=eq.${id}`,{method:"DELETE"});message("تم حذف الحجم");loadProducts()}catch(e){message(e.message,true)}}

// عرض الطلبات مع التعريب والأزرار
async function loadOrders(){
  try{
    orders=await rest("orders?select=*&order=id.desc")||[];
    $("ordersList").innerHTML=orders.length?orders.map(o=>`
      <article class="order-card">
        <div class="order-top"><strong>طلب #${o.id}</strong><span>${esc(orderStatusLabels[o.status]||o.status||"قيد الانتظار ⏳")}</span></div>
        <p>👤 ${esc(o.customer_name||"—")}</p>
        <p>📱 ${esc(o.phone||"—")}</p>
        <p>📍 ${esc(o.address||"—")}</p>
        <p>💰 ${money(o.total)}</p>
        <div style="display:flex;gap:6px;align-items:center;margin-top:10px;flex-wrap:wrap;">
          <select style="flex:1;min-width:130px;" onchange="changeStatus(${o.id},this.value)">
            <option value="pending" ${o.status==="pending"?"selected":""}>قيد الانتظار ⏳</option>
            <option value="confirmed" ${o.status==="confirmed"?"selected":""}>تم التأكيد ✅</option>
            <option value="shipped" ${o.status==="shipped"?"selected":""}>تم الشحن 🚚</option>
            <option value="delivered" ${o.status==="delivered"?"selected":""}>تم التوصيل 🎁</option>
            <option value="cancelled" ${o.status==="cancelled"?"selected":""}>ملغي ❌</option>
          </select>
          <button class="btn" onclick="printInvoice(${o.id})" style="padding:6px 10px;background:#2563eb;color:#fff;">🖨️ طباعة</button>
          <button class="btn danger" onclick="deleteOrder(${o.id})" style="padding:6px 10px;">🗑️ حذف</button>
        </div>
      </article>
    `).join(""):'<div class="empty">📦 لا توجد طلبات.</div>';
    stats();
  }catch(e){
    $("ordersList").innerHTML=`<div class="empty">❌ ${esc(e.message)}</div>`;
  }
}

// دالة طباعة فاتورة طلب مفرد
async function printInvoice(id){
  const order = orders.find(x=>Number(x.id)===Number(id));
  if(!order) return alert("تعذر العثور على الطلب");

  let items = [];
  try {
    items = await rest(`order_items?order_id=eq.${id}`) || [];
  } catch(e) {
    console.warn("تعذر جلب تفاصيل المنتجات:", e);
  }

  const storeName = settingsRow?.store_name || "الوسام للعطور";
  const dateStr = order.created_at ? new Date(order.created_at).toLocaleString("ar-EG") : new Date().toLocaleString("ar-EG");

  const printWin = window.open("", "_blank", "width=850,height=750");
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>فاتورة طلب #${order.id}</title>
      <style>
        body { font-family: 'Cairo', Tahoma, Arial, sans-serif; padding: 25px; color: #111; direction: rtl; }
        .invoice-header { text-align: center; border-bottom: 2px dashed #444; padding-bottom: 15px; margin-bottom: 20px; }
        .invoice-header h1 { margin: 0 0 5px; font-size: 24px; color: #111; }
        .invoice-header p { margin: 3px 0; color: #555; }
        .info-box { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 14px; background: #fafafa; padding: 14px; border: 1px solid #e5e5e5; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }
        th { background: #f3f3f3; }
        .total-box { text-align: left; font-size: 17px; font-weight: bold; margin-top: 15px; padding-left: 10px; }
        .footer { text-align: center; margin-top: 40px; font-size: 13px; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <h1>${esc(storeName)}</h1>
        <p>فاتورة شراء رقم: #${order.id}</p>
        <small>${dateStr}</small>
      </div>
      <div class="info-box">
        <div><strong>العميل:</strong> ${esc(order.customer_name || "—")}</div>
        <div><strong>الهاتف:</strong> ${esc(order.phone || "—")}</div>
        <div style="grid-column: 1 / -1;"><strong>العنوان:</strong> ${esc(order.address || "—")}</div>
        <div><strong>حالة الطلب:</strong> ${esc(orderStatusLabels[order.status] || order.status || "قيد الانتظار")}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>المنتج</th>
            <th>الحجم</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${items.length ? items.map((it, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${esc(it.product_name || "منتج")}</td>
              <td>${it.size_ml ? it.size_ml + ' ml' : '—'}</td>
              <td>${it.quantity}</td>
              <td>${money(it.final_price || it.original_price)}</td>
              <td>${money((it.final_price || it.original_price) * it.quantity)}</td>
            </tr>
          `).join("") : `
            <tr>
              <td colspan="6" style="padding:15px; color:#666;">تفاصيل الطلب: إجمالي فقط (${money(order.total)})</td>
            </tr>
          `}
        </tbody>
      </table>
      <div class="total-box">
        الإجمالي المستحق: ${money(order.total)}
      </div>
      <div class="footer">
        شكراً لاختياركم ${esc(storeName)} 🌹
      </div>
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  printWin.document.close();
}

// دالة طباعة جميع الطلبات
function printAllOrders(){
  if(!orders.length) return alert("لا توجد طلبات لطباعتها");

  const storeName = settingsRow?.store_name || "الوسام للعطور";
  const dateStr = new Date().toLocaleString("ar-EG");
  const totalSales = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const printWin = window.open("", "_blank", "width=900,height=750");
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>كشف كلي بجميع الطلبات</title>
      <style>
        body { font-family: 'Cairo', Tahoma, Arial, sans-serif; padding: 25px; color: #111; direction: rtl; }
        .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { margin: 0 0 5px; font-size: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
        th, td { border: 1px solid #bbb; padding: 8px; text-align: center; }
        th { background-color: #eee; }
        .total-summary { margin-top: 20px; text-align: left; font-size: 16px; font-weight: bold; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${esc(storeName)}</h1>
        <p>كشف تقرير بجميع الطلبات (${orders.length} طلب)</p>
        <small>${dateStr}</small>
      </div>
      <table>
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>العميل</th>
            <th>الهاتف</th>
            <th>العنوان</th>
            <th>الحالة</th>
            <th>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td>#${o.id}</td>
              <td>${esc(o.customer_name || "—")}</td>
              <td>${esc(o.phone || "—")}</td>
              <td>${esc(o.address || "—")}</td>
              <td>${esc(orderStatusLabels[o.status] || o.status || "قيد الانتظار")}</td>
              <td>${money(o.total)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="total-summary">
        إجمالي المبيعات لجميع الطلبات: ${money(totalSales)}
      </div>
      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `);
  printWin.document.close();
}

// دالة حذف الطلب
async function deleteOrder(id){if(!confirm(`هل أنت متأكد من حذف الطلب #${id}؟`))return;try{await rest(`orders?id=eq.${id}`,{method:"DELETE"});message("تم حذف الطلب بنجاح");await loadOrders()}catch(e){message("لم يتم الحذف: "+e.message,true)}}

async function changeStatus(id,status){try{await rest(`orders?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status})});message("تم تحديث الحالة")}catch(e){message(e.message,true)}}

$("refreshOrders").onclick=loadOrders;
const printAllBtn = $("printAllOrdersBtn");
if(printAllBtn) printAllBtn.onclick = printAllOrders;

async function loadSettings(){try{let d=await rest("settings?select=*&limit=1")||[];settingsRow=d[0]||null;if(settingsRow){$("storeName").value=settingsRow.store_name||"";$("whatsapp").value=settingsRow.whatsapp||"";$("tagline").value=settingsRow.tagline||""}}catch(e){message(e.message,true)}}
$("settingsForm").onsubmit=async e=>{e.preventDefault();try{let p={store_name:$("storeName").value.trim(),whatsapp:$("whatsapp").value.trim(),tagline:$("tagline").value.trim(),updated_at:new Date().toISOString()};if(settingsRow)await rest(`settings?id=eq.${settingsRow.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(p)});else await rest("settings",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(p)});message("تم حفظ الإعدادات")}catch(x){message(x.message,true)}}
function stats(){$("statProducts").textContent=products.length;$("statOrders").textContent=orders.length;$("statSales").textContent=money(orders.reduce((a,o)=>a+Number(o.total||0),0))}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).classList.remove("show"));
if(token&&uid){(async()=>{try{let a=await rest(`admins?select=id&user_id=eq.${encodeURIComponent(uid)}`);if(a.length){showApp();refresh()}else throw Error()}catch{localStorage.clear()}})()}
