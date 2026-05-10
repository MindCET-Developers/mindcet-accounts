# MindCET Accounts and Payments — External Setup Guide

לפני שמתחילים לקודד, צריך להקים 4 חשבונות חיצוניים. כל אחד נותן ערך מסויים. בסוף נאסוף את כל המפתחות לקובץ `.env.local`.

---

## 1. Supabase (Database + Auth + Storage)

מסד נתונים, אימות, ואחסון PDFs של חשבוניות. **חינם** עד 500MB.

### שלבים:

1. היכנס ל-https://supabase.com → **Start your project** → התחבר עם Google.
2. **New project**:
   - **Name**: `mindcet-accounts`
   - **Database Password**: צור סיסמה חזקה ושמור (מנהל סיסמאות)
   - **Region**: `Frankfurt (eu-central-1)` — הכי קרוב לישראל
   - **Plan**: Free
3. המתן ~2 דקות עד שהפרויקט נוצר.
4. אחרי שנוצר, לחץ **Settings** (⚙ בצד שמאל) → **API**.
5. שמור את שלושת הערכים האלה:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key (תחת Project API keys) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **סודי — לא לחשוף ב-client**

---

## 2. Google Cloud (OAuth + Gmail API + Calendar API)

נדרש כדי שמשתמשים יוכלו להתחבר עם Google ולתת לנו גישה לסריקת Gmail וליצירת אירועי קלנדר.

### שלבים:

1. היכנס ל-https://console.cloud.google.com.
2. בחר/צור פרויקט: למעלה ליד הלוגו → **New Project** → Name: `MindCET Accounts`.
3. **APIs & Services** → **Library**:
   - חפש **Gmail API** → **Enable**
   - חפש **Google Calendar API** → **Enable**
4. **APIs & Services** → **OAuth consent screen**:
   - **User Type**: External → Create
   - **App name**: `MindCET Accounts and Payments`
   - **User support email**: `mindcetdev@gmail.com`
   - **Developer contact**: `mindcetdev@gmail.com`
   - בעמוד הבא **Add or Remove Scopes** → הוסף:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/calendar.events`
   - **Test users**: הוסף את כל חברי הצוות שיתחברו (כולל `mindcetdev@gmail.com`)
5. **APIs & Services** → **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**:
   - **Application type**: Web application
   - **Name**: `MindCET Accounts Web`
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback`
     - `https://<YOUR-SUPABASE-PROJECT>.supabase.co/auth/v1/callback` (תחליף את `<YOUR-SUPABASE-PROJECT>` במזהה הפרויקט שלך מ-Supabase)
   - **Create**
6. שמור:
   - `Client ID` → `GOOGLE_CLIENT_ID`
   - `Client secret` → `GOOGLE_CLIENT_SECRET`
7. **חזור ל-Supabase** → **Authentication** → **Providers** → **Google** → **Enable** → הדבק את ה-Client ID וה-Client Secret מלמעלה → **Save**.

---

## 3. Resend (Email Sending)

לשליחת תזכורות אימייל. **חינם** עד 3,000 מיילים בחודש.

### שלבים:

1. היכנס ל-https://resend.com → **Sign up** עם Google.
2. **API Keys** (בתפריט הצדדי) → **+ Create API Key**:
   - **Name**: `mindcet-accounts-dev`
   - **Permission**: Sending access
   - **Domain**: All domains
3. שמור את ה-key → `RESEND_API_KEY`
4. **לפיתוח**: אפשר לשלוח מ-`onboarding@resend.dev` ללא verification (רק לכתובת שאיתה נרשמת).
5. **לפרודקשן** (אחר כך): **Domains** → **Add Domain** → `mindcet.org` (או דומיין אחר שלכם) → תוסיף DNS records.

---

## 4. Anthropic API (Claude — Invoice Extraction)

חילוץ נתוני חשבונית מ-PDF/מייל. ~$0.01 לחשבונית.

### שלבים:

1. היכנס ל-https://console.anthropic.com → **Sign up** או התחבר.
2. **Settings** → **Billing** → הוסף $5 קרדיט (יספיק להמון בדיקות).
3. **API Keys** → **Create Key**:
   - **Name**: `mindcet-accounts`
   - **Workspace**: Default
4. שמור את ה-key → `ANTHROPIC_API_KEY` ⚠️ זה היחיד שמראים פעם אחת.

---

## 5. אופציונלי: Vercel (Hosting)

לפרודקשן. אפשר לדחות עד שמסיימים פיתוח מקומי.

1. https://vercel.com → Sign up עם GitHub.
2. נחבר את הפרויקט בהמשך.

---

## בסיום — מה לשלוח לי

כשסיימת את **1, 2, 3, 4** (Vercel אפשר לדחות), שלח לי בצ'אט את הערכים הבאים — ואני אכניס אותם ל-`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
```

⚠️ **שלח רק בצ'אט הפרטי שלנו, לא במקום ציבורי.**

לחלופין — אם נוח לך — אתה יכול להכניס אותם בעצמך ל-`.env.local` אחרי שאני מקים את הפרויקט, ולא לשתף אותם איתי בכלל. נדבר על זה כשנגיע לשם.
