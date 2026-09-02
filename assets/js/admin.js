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
    sizeProductId = id;
    $("sizeModal").classList.add("show");
    $("sizeForm").reset();
    $("sizeDiscountEnabled").checked = false;
    if($("discountValue")) $("discountValue").value = "5";
    toggleDiscount();
}
function toggleDiscount(){
    const on = $("sizeDiscountEnabled").checked;
    $("discountFields").classList.toggle("hidden", !on);
}
$("sizeDiscountEnabled").onchange = toggleDiscount;

$("sizeForm").onsubmit = async e => {
    e.preventDefault();
    try {
        const size = Number($("sizeMl").value);
        const price = parseFloat($("sizePrice").value);
        const on = $("sizeDiscountEnabled").checked;
        const discountVal = on ? parseFloat($("discountValue")?.value || 0) : 0;

        if (isNaN(price) || price < 0) {
            throw new Error("يرجى إدخال سعر صحيح.");
        }
        if (!sizeProductId) {
            throw new Error("لم يتم تحديد المنتج.");
        }

        await rest("product_sizes", {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
                product_id: sizeProductId,
                size_ml: size,
                price: price,
                discount_enabled: on,
                discount_type: "percent",
                discount_value: discountVal
            })
        });

        $("sizeModal").classList.remove("show");
        message("✅ تم حفظ الحجم والسعر بنجاح");
        await loadProducts();
    } catch(x) {
        console.error("Save size error:", x);
        message("❌ لم يتم الحفظ: " + x.message, true);
        alert("خطأ أثناء حفظ الحجم:\n" + x.message);
    }
};

async function deleteSize(id){if(!confirm("حذف الحجم؟"))return;try{await rest(`product_sizes?id=eq.${id}`,{method:"DELETE"});message("تم حذف الحجم");loadProducts()}catch(e){message(e.message,true)}}

// عرض الطلبات وجلب المنتجات والملاحظات
async function loadOrders(){
  try{
    orders = await rest("orders?select=*,order_items(*)&order=id.desc") || [];
    $("ordersList").innerHTML = orders.length ? orders.map(o => {
      const currentSt = o.status || "pending";
      const arabicSt = orderStatusLabels[currentSt] || currentSt;
      const itemsCount = (o.order_items || []).reduce((sum, it) => sum + Number(it.quantity || 1), 0);

      return `
        <article class="order-card">
          <div class="order-top">
            <strong>طلب #${o.id}</strong>
            <span style="color:#d6b34b; font-weight:bold;">${arabicSt}</span>
          </div>
          <p>👤 <b>العميل:</b> ${esc(o.customer_name || "—")}</p>
          <p>📱 <b>الهاتف:</b> ${esc(o.phone || "—")}</p>
          <p>📍 <b>العنوان:</b> ${esc(o.address || "—")}</p>
          ${o.notes ? `<p style="color:#e9c77d;background:#241d0f;padding:6px 10px;border-radius:6px;margin:8px 0;font-size:13px;">📝 <b>ملاحظات:</b> ${esc(o.notes)}</p>` : ""}
          <p>📦 <b>عدد القطع:</b> ${itemsCount} قطعة</p>
          <p>💰 <b>المبلغ:</b> ${money(o.total)}</p>
          <div style="display:flex;gap:6px;align-items:center;margin-top:10px;flex-wrap:wrap;">
            <select style="flex:1;min-width:140px;padding:6px;border-radius:6px;background:#1e1e1e;color:#fff;border:1px solid #444;" onchange="changeStatus(${o.id},this.value)">
              <option value="pending" ${currentSt==="pending"?"selected":""}>قيد الانتظار ⏳</option>
              <option value="confirmed" ${currentSt==="confirmed"?"selected":""}>تم التأكيد ✅</option>
              <option value="shipped" ${currentSt==="shipped"?"selected":""}>تم الشحن 🚚</option>
              <option value="delivered" ${currentSt==="delivered"?"selected":""}>تم التوصيل 🎁</option>
              <option value="cancelled" ${currentSt==="cancelled"?"selected":""}>ملغي ❌</option>
            </select>
            <button class="btn" onclick="printInvoice(${o.id})" style="padding:6px 12px;background:#2563eb;color:#fff;cursor:pointer;">🖨️ طباعة</button>
            <button class="btn danger" onclick="deleteOrder(${o.id})" style="padding:6px 12px;cursor:pointer;">🗑️ حذف</button>
          </div>
        </article>
      `;
    }).join("") : '<div class="empty">📦 لا توجد طلبات.</div>';
    stats();
  }catch(e){
    $("ordersList").innerHTML=`<div class="empty">❌ ${esc(e.message)}</div>`;
  }
}

// طباعة فاتورة مفردة بها كافة التفاصيل والقطع والملاحظات
async function printInvoice(id){
  const order = orders.find(x => Number(x.id) === Number(id));
  if(!order) return alert("تعذر العثور على الطلب");

  let items = order.order_items || [];
  if(!items.length) {
    try {
      items = await rest(`order_items?order_id=eq.${id}`) || [];
    } catch(e) {
      console.warn(e);
    }
  }

  const storeName = settingsRow?.store_name || "الوسام للعطور";
  const dateStr = order.created_at ? new Date(order.created_at).toLocaleString("ar-EG") : new Date().toLocaleString("ar-EG");
  const arabicStatus = orderStatusLabels[order.status] || order.status || "قيد الانتظار";

  const printWin = window.open("", "_blank", "width=850,height=750");
  if(!printWin) return alert("يرجى السماح بالنوافذ المنبثقة (Pop-ups) للمتصفح للطباعة");

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>فاتورة طلب #${order.id}</title>
      <style>
        body { font-family: 'Cairo', Tahoma, Arial, sans-serif; padding: 25px; color: #111; direction: rtl; }
        .invoice-header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 12px; margin-bottom: 18px; }
        .invoice-header h1 { margin: 0 0 5px; font-size: 24px; }
        .invoice-header p { margin: 3px 0; color: #555; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 14px; background: #fdfdfd; padding: 14px; border: 1px solid #e2e2e2; border-radius: 6px; }
        .notes-box { grid-column: 1 / -1; background: #fffbe6; border: 1px dashed #d4b106; padding: 8px 12px; border-radius: 6px; color: #614700; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
        th, td { border: 1px solid #ccc; padding: 10px; text-align: center; }
        th { background: #f4f4f4; font-weight: bold; }
        .total-box { text-align: left; font-size: 18px; font-weight: bold; margin-top: 15px; }
        .footer { text-align: center; margin-top: 40px; font-size: 13px; color: #777; border-top: 1px solid #ddd; padding-top: 15px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <h1>${esc(storeName)}</h1>
        <p>فاتورة شراء رقم: #${order.id}</p>
        <small>${dateStr}</small>
      </div>
      <div class="info-grid">
        <div><b>اسم العميل:</b> ${esc(order.customer_name || "—")}</div>
        <div><b>رقم الهاتف:</b> ${esc(order.phone || "—")}</div>
        <div style="grid-column: 1 / -1;"><b>عنوان التوصيل:</b> ${esc(order.address || "—")}</div>
        <div><b>حالة الطلب:</b> ${esc(arabicStatus)}</div>
        ${order.notes ? `<div class="notes-box"><b>ملاحظات العميل:</b> ${esc(order.notes)}</div>` : ""}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>اسم العطر / المنتج</th>
            <th>الحجم</th>
            <th>الكمية (القطع)</th>
            <th>سعر القطعة</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${items.length ? items.map((it, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td style="font-weight:bold;">${esc(it.product_name || "عطر")}</td>
              <td>${it.size_ml ? it.size_ml + ' ml' : '—'}</td>
              <td><b>${it.quantity}</b></td>
              <td>${money(it.final_price || it.original_price)}</td>
              <td>${money((it.final_price || it.original_price) * it.quantity)}</td>
            </tr>
          `).join("") : `
            <tr>
              <td colspan="6" style="padding:15px; color:#888;">لم يتم تسجيل عناصر تفصيلية لهذا الطلب القديم. الإجمالي: ${money(order.total)}</td>
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

// دالة طباعة كل الطلبات مع الملاحظات
function printAllOrders(){
  if(!orders.length) return alert("لا توجد طلبات حالياً لطباعتها");

  const storeName = settingsRow?.store_name || "الوسام للعطور";
  const dateStr = new Date().toLocaleString("ar-EG");
  const totalSales = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const printWin = window.open("", "_blank", "width=950,height=750");
  if(!printWin) return alert("يرجى السماح بالنوافذ المنبثقة (Pop-ups) للمتصفح للطباعة");

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>كشف كلي بجميع الطلبات</title>
      <style>
        body { font-family: 'Cairo', Tahoma, Arial, sans-serif; padding: 25px; color: #111; direction: rtl; }
        .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0 0 5px; font-size: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #999; padding: 8px; text-align: center; }
        th { background-color: #eee; }
        .total-summary { margin-top: 25px; text-align: left; font-size: 17px; font-weight: bold; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${esc(storeName)}</h1>
        <p>تقرير مجمع بجميع الطلبات (${orders.length} طلب)</p>
        <small>${dateStr}</small>
      </div>
      <table>
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>العميل</th>
            <th>الهاتف</th>
            <th>العنوان</th>
            <th>المنتجات المطلوبة</th>
            <th>ملاحظات</th>
            <th>الحالة</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => {
            const itemsText = (o.order_items || []).map(i => `${i.product_name} (${i.size_ml}ml × ${i.quantity})`).join("<br>") || "—";
            return `
              <tr>
                <td>#${o.id}</td>
                <td>${esc(o.customer_name || "—")}</td>
                <td>${esc(o.phone || "—")}</td>
                <td>${esc(o.address || "—")}</td>
                <td style="font-size:12px; text-align:right;">${itemsText}</td>
                <td style="font-size:12px; color:#555;">${esc(o.notes || "—")}</td>
                <td>${esc(orderStatusLabels[o.status] || o.status || "قيد الانتظار")}</td>
                <td>${money(o.total)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
      <div class="total-summary">
        إجمالي المبيعات الكلي: ${money(totalSales)}
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

async function changeStatus(id,status){try{await rest(`orders?id=eq.${id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status})});message("تم تحديث الحالة");await loadOrders();}catch(e){message(e.message,true)}}

$("refreshOrders").onclick=loadOrders;

window.addEventListener("DOMContentLoaded", () => {
  const btn = $("printAllOrdersBtn");
  if(btn) btn.onclick = printAllOrders;
});
const directBtn = $("printAllOrdersBtn");
if(directBtn) directBtn.onclick = printAllOrders;

async function loadSettings(){
  try{
    let d=await rest("settings?select=*&limit=1")||[];
    settingsRow=d[0]||null;
    if(settingsRow){
      $("storeName").value=settingsRow.store_name||"";
      $("whatsapp").value=settingsRow.whatsapp||"";
      $("tagline").value=settingsRow.tagline||"";
      if($("offerEnabled")) $("offerEnabled").checked = !!settingsRow.offer_enabled;
      if($("offerTitle")) $("offerTitle").value = settingsRow.offer_title || "عرض خاص: اشترِ 2 واحصل على الثالثة هدية 🎁";
      if($("offerBuyQty")) $("offerBuyQty").value = settingsRow.offer_buy_qty || 2;
      if($("offerFreeQty")) $("offerFreeQty").value = settingsRow.offer_free_qty || 1;
    }
  }catch(e){message(e.message,true)}
}

$("settingsForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    let p={
      store_name:$("storeName").value.trim(),
      whatsapp:$("whatsapp").value.trim(),
      tagline:$("tagline").value.trim(),
      offer_enabled:$("offerEnabled")?.checked || false,
      offer_title:$("offerTitle")?.value.trim() || "",
      offer_buy_qty:Number($("offerBuyQty")?.value || 2),
      offer_free_qty:Number($("offerFreeQty")?.value || 1),
      updated_at:new Date().toISOString()
    };
    if(settingsRow)await rest(`settings?id=eq.${settingsRow.id}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(p)});
    else await rest("settings",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(p)});
    message("تم حفظ الإعدادات والعروض بنجاح");
  }catch(x){message(x.message,true)}
};

function stats(){$("statProducts").textContent=products.length;$("statOrders").textContent=orders.length;$("statSales").textContent=money(orders.reduce((a,o)=>a+Number(o.total||0),0))}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).classList.remove("show"));
if(token&&uid){(async()=>{try{let a=await rest(`admins?select=id&user_id=eq.${encodeURIComponent(uid)}`);if(a.length){showApp();refresh()}else throw Error()}catch{localStorage.clear()}})()}
