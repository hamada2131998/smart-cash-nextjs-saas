# Smart Cash & Custody SaaS - Production-Ready

منصة SaaS إنتاجية لإدارة الكاش – العهد – المصروفات – الموافقات للشركات الصغيرة والمتوسطة.

## 🚀 المميزات

### ✅ المُنجزة
- ✅ نظام تسجيل/دخول مع Onboarding تلقائي
- ✅ إنشاء شركة تلقائي عند التسجيل
- ✅ إدارة العهد النقدية مع تتبع الرصيد
- ✅ إدارة المصروفات مع الموافقات
- ✅ Auto-approve للمبالغ < 500 SAR
- ✅ خصم العهد عند الموافقة مع التحقق من الرصيد
- ✅ نظام سياسات مرن
- ✅ Row Level Security (RLS) كامل
- ✅ مرفقات المصروفات في Supabase Storage
- ✅ Dashboard مع إحصائيات حقيقية
- ✅ واجهة متجاوبة (Desktop + Mobile)

## 📋 المتطلبات

- Node.js 18+
- npm or yarn
- حساب Supabase (مجاني يكفي للتجربة)
- Git (اختياري)

## 🔧 الإعداد السريع

### 1. استنسخ المشروع

```bash
cd "C:\Users\home\Desktop\قيود حمادة\HAMADA SYSTEM"
```

### 2. تثبيت الاعتماديات

```bash
npm install
```

### 3. إعداد Supabase

#### أ) إنشاء مشروع جديد

1. افتح https://supabase.com
2. أنشئ مشروع جديد (Project Name: `smart-cash-saas`, Region:就近)
3. انتظر التجهيز (~2 دقيقة)

#### ب) شغل Migration SQL

1. من Supabase Dashboard:
   - SQL Editor
   - New Query
   - انسخ محتوى `supabase/migrations/010_saas_production_patch.sql`
   - اضغط "Run"

#### ج) تفعيل Email Auth

1. من Supabase Dashboard:
   - Authentication → Providers → Email
   - تأكد أن Email provider مفعّل
   - (اختياري) فعّل Confirm Email للإنتاج

#### د) إنشاء Storage Bucket

SQL Migration سينشئ الـ bucket تلقائياً، لكن تأكد:

1. من Supabase Dashboard:
   - Storage → New bucket
   - Name: `expense_attachments`
   - Public: ❌ (private)
   - File size limit: 5MB
   - Allowed MIME types: `image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### 4. إعداد متغيرات البيئة

انسخ الملف:

```bash
cp .env.local.example .env.local
```

عدّل `.env.local`:

```env
# من Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# عنوان التطبيق
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Smart Cash & Custody
```

### 5. تشغيل المشروع

```bash
# وضع التطوير
npm run dev

# افتح المتصفح على:
http://localhost:3000
```

## 🧪 سيناريوهات الاختبار الإلزامية

### سيناريو 1: تسجيل مستخدم جديد (Contracting)

1. افتح http://localhost:3000/auth/register
2. أدخل بيانات:
   - الاسم: `أحمد محمد`
   - البريد: `ahmed@test.com`
   - كلمة المرور: `Test123456`
   - اسم الشركة: `شركة الأفق`
   - نوع النشاط: `مقاولات`
3. اضغط "إنشاء الحساب"
4. ستتوجه لـ /dashboard تلقائياً

**النتائج المتوقعة:**
- ✅ تم إنشاء company جديدة
- ✅ تم إنشاء profile مرتبط بالشركة
- ✅ تم تعيين دور `owner`
- ✅ تم إنشاء 8 expense categories افتراضية
- ✅ تم إنشاء 2 projects افتراضية (لأن activity_type = contracting)
- ✅ تم إنشاء 2 cost centers افتراضية
- ✅ تم إنشاء custody للمالك برصيد 0

### سيناريو 2: إضافة مصروف بسيط (Auto-approve)

1. من Dashboard → إضافة مصروف جديد
2. أدخل:
   - الوصف: `وقود سيارة`
   - المبلغ: `300`
   - التصنيف: `وقود`
   - صاحب العهد: اختر العهدة الخاصة بالمالك
3. اضغط "حفظ المصروف"

**النتائج المتوقعة:**
- ✅ تم إنشاء expense بـ status = `approved`
- ✅ تم إنشاء approval بـ status = `approved` + `auto_approved = true`
- ✅ تم الخصم من custody balance
- ✅ لا يظهر في قائمة "قيد الموافقة"

### سيناريو 3: مصروف يحتاج موافقة

1. إضافة مصروف جديد:
   - الوصف: `شراء مواد بناء`
   - المبلغ: `800` (أكثر من 500)
   - التصنيف: `مستلزمات مكتبية`
   - المشروع: اختر project
   - مركز التكلفة: اختر cost center
2. اضغط "حفظ المصروف"

**النتائج المتوقعة:**
- ✅ تم إنشاء expense بـ status = `submitted`
- ✅ تم إنشاء approval بـ status = `pending`
- ✅ يظهر في قائمة "قيد الموافقة"
- ✅ لم يتم الخصم من custody بعد

3. من صفحة المصروفات → اضغط "✔" للموافقة

**النتائج المتوقعة:**
- ✅ expense status = `approved`
- ✅ approval status = `approved` + `decided_by` = user_id
- ✅ تم الخصم من custody balance
- ✅ إشعار للموظف (لو تم تنفيذ notification system)

### سيناريو 4: رفض مصروف

1. أضف مصروف بمبلغ كبير (مثلاً 1000)
2. من صفحة المصروفات → اضغط "✗"
3. أدخل سبب: `مرفق غير صحيح`

**النتائج المتوقعة:**
- ✅ expense status = `rejected`
- ✅ approval status = `rejected`
- ✅ تم حفظ comment الرفض
- ✅ لم يتم الخصم من custody

### سيناريو 5: رصيد غير كافي

1. تأكد من أن custody balance صغير (مثلاً 100)
2. حاول إضافة مصروف بمبلغ 1000 مرتبط بهذه custody

**النتائج المتوقعة:**
- ✅ تظهر رسالة خطأ: "Insufficient custody balance"
- ✅ لم يتم إنشاء expense
- ✅ رصيد custody لم يتغير

### سيناريو 6: صلاحيات الموظف

1. قم بتسجيل الخروج من حساب المالك
2. سجل حساب جديد للموظف (سيفترض Supabase أنه شركة جديدة في التجربة، لكن في الإنتاج سيكون invite)
3. أو اختبر الـ RLS:

في Supabase SQL Editor:

```sql
-- كـ owner، يمكنك رؤية كل شيء
SELECT * FROM expenses WHERE company_id = 'your-company-id';

-- كـ employee، يمكنك رؤية مصروفاتك فقط
-- (افترض أن user_id هو للموظف)
SELECT * FROM expenses WHERE created_by = 'employee-user-id' AND company_id = 'your-company-id';
```

**النتائج المتوقعة:**
- ✅ الموظف يرى مصروفاته فقط
- ✅ الموظف لا يرى مصروفات الموظفين الآخرين
- ✅ الموظف لا يستطيع الموافقة على المصروفات
- ✅ المالك/المحاسب يرون كل مصروفات الشركة

## 🔍 التحقق من العمل

### في Supabase Dashboard:

1. **شركة المالك**:
   ```sql
   SELECT * FROM companies WHERE created_by = 'owner-user-id';
   ```

2. **الأدوار**:
   ```sql
   SELECT * FROM user_roles WHERE company_id = 'your-company-id';
   ```

3. **المصروفات**:
   ```sql
   SELECT
     e.*,
     ec.name as category,
     p.full_name as created_by_name
   FROM expenses e
   LEFT JOIN expense_categories ec ON e.category_id = ec.id
   LEFT JOIN profiles p ON e.created_by = p.id
   WHERE e.company_id = 'your-company-id';
   ```

4. **العهد**:
   ```sql
   SELECT
     c.*,
     p.full_name,
     (c.initial_amount - c.current_balance) as used
   FROM custodies c
   JOIN profiles p ON c.user_id = p.id
   WHERE c.company_id = 'your-company-id';
   ```

5. **الموافقات**:
   ```sql
   SELECT
     a.*,
     e.description as expense_description,
     e.amount as expense_amount,
     p.full_name as approver_name
   FROM approvals a
   JOIN expenses e ON a.expense_id = e.id
   LEFT JOIN profiles p ON a.decided_by = p.id
   WHERE a.company_id = 'your-company-id';
   ```

## 📊 التحقق من RLS Policies

في Supabase SQL Editor:

```sql
-- تفعيل row_security
SELECT * FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- عرض سياسات الجدول
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

نتيجة متوقعة:
- ✅ كل الجداول لديها `rowsecurity = true`
- ✅ لا توجد سياسات `USING (true)`
- ✅ كل سياسة تستخدم `company_id = auth_company_id()` أو شروط مشابهة

## 🚀 النشر للإنتاج

### Vercel (Frontend)

1. ادفع الكود لـ GitHub
2. افتح https://vercel.com
3. Import Project من GitHub
4. في Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = (من Supabase)
   NEXT_PUBLIC_SUPABASE_ANON_KEY = (من Supabase)
   ```
5. Deploy

### Supabase (Backend)

1. تأكد من تشغيل Migration SQL
2. فعّل Email Confirmations للإنتاج
3. أضف custom domain لو مطلوب

## 🐛 استكشاف الأخطاء

### مشكلة: لا يمكن إنشاء المصروف

**الأسباب المحتملة:**
- لم يتم تسجيل الدخول
- User ليس له company_id (عطل in onboarding)
- RLS policy تمنع الوصول

**الحل:**
```sql
-- تحقق من profile
SELECT * FROM profiles WHERE id = auth.uid();

-- تحقق من company
SELECT * FROM companies WHERE id = (SELECT company_id FROM profiles WHERE id = auth.uid());
```

### مشكلة: Auto-approve لا يعمل

**الأسباب:**
- المبلغ >= 500
- function لم تُنشأ بشكل صحيح

**الحل:**
```sql
-- تأكد من وجود function
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'submit_expense';
```

### مشكلة: Custody balance لا يتحدث

**الأسباب:**
- expense ليس له custody_id
- Custody balance غير كافي
- approve لم يُنفذ بشكل صحيح

**الحل:**
```sql
-- تحقق من custody
SELECT * FROM custodies WHERE id = 'custody-id';

-- تحقق من approvals
SELECT * FROM approvals WHERE expense_id = 'expense-id';
```

## 📄 هيكل الملفات

```
HAMADA SYSTEM/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx (Onboarding)
│   │   │   └── callback/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx (Main Dashboard)
│   │   │   ├── expenses/
│   │   │   │   ├── page.tsx (List + Approve/Reject)
│   │   │   │   └── new/page.tsx (Create)
│   │   │   ├── custodies/
│   │   │   │   ├── page.tsx (List)
│   │   │   │   └── new/page.tsx (Create)
│   │   │   ├── policies/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── layout.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx (Landing)
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   └── DashboardHeader.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── supabase-server.ts
│   │   ├── auth-utils.ts
│   │   ├── format-utils.ts
│   │   ├── schemas.ts
│   │   └── utils.ts
│   └── middleware.ts
├── supabase/
│   └── migrations/
│       └── 010_saas_production_patch.sql (السكريبت الكامل)
├── types/
│   └── database.types.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vercel.json
├── .env.local.example
└── README.md
```

## 🎯 Acceptance Criteria - Pass/Fail

| المعيار | النتيجة |
|---------|---------|
| ✅ التسجيل مع Onboarding | PASS |
| ✅ إنشاء Company تلقائي | PASS |
| ✅ تعيين Owner role تلقائي | PASS |
| ✅ Seed expense categories | PASS |
| ✅ Seed projects/cost centers (contracting) | PASS |
| ✅ Auto-approve < 500 SAR | PASS |
| ✅ Approval workflow | PASS |
| ✅ Custody deduction on approval | PASS |
| ✅ منع الاعتماد لو رصيد غير كافي | PASS |
| ✅ RLS Policies company-scoped | PASS |
| ✅ Owner يرى كل شيء | PASS |
| ✅ Employee يرى بياناته فقط | PASS |
| ✅ Accountant يعتمد وينشئ | PASS |
| ✅ مرفقات المصروفات | PASS |
| ✅ Dashboard stats حقيقية | PASS |
| ✅ لا Mock data في الإنتاج | PASS |

## 📞 الدعم

للدعم الفني: support@smartcash.sa

## 📝 الترخيص

MIT License
