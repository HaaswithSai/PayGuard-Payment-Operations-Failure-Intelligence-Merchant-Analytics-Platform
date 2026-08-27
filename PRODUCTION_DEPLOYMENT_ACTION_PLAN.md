# 🌐 PayGuard — Production Cloud Deployment Action Plan

> **Step-by-Step Guide for Deploying PayGuard on Vercel + Render + MongoDB Atlas**

---

## 📌 Prerequisites & Account Setup (Free Tier)
To deploy the live platform publicly, you will use free-tier accounts on:
1. **[GitHub](https://github.com/)** (To host the PayGuard repository)
2. **[MongoDB Atlas](https://www.mongodb.com/atlas)** (Managed cloud database)
3. **[Render](https://render.com/)** (Hosting Node.js Backend API + Python FastAPI ML service)
4. **[Vercel](https://vercel.com/)** (Hosting React 18 Frontend Dashboard)

---

## 🚀 Step 1: Push Codebase to GitHub

Run these commands in your terminal to push the local PayGuard repository to your GitHub account:

```bash
# 1. Create a new repository on github.com named 'PayGuard'
# 2. Link and push to GitHub:
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/PayGuard.git
git branch -M main
git push -u origin main
```

---

## 🗄️ Step 2: Set Up MongoDB Atlas

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create a new **Free M0 Shared Cluster** (e.g., in AWS us-east-1 or ap-south-1).
3. **Security $\rightarrow$ Database Access**:
   - Create a database user (e.g., username: `payguard_admin`, password: `YourStrongPassword123!`).
4. **Security $\rightarrow$ Network Access**:
   - Click **Add IP Address** $\rightarrow$ Select **Allow Access From Anywhere (`0.0.0.0/0`)** (Required for Render cloud web services).
5. **Connect**:
   - Click **Connect** $\rightarrow$ **Drivers (Node.js)**.
   - Copy your connection string:
     `mongodb+srv://payguard_admin:<password>@cluster0.xxxxx.mongodb.net/payguard?retryWrites=true&w=majority`

---

## ⚙️ Step 3: Deploy Backend & AI Service on Render (1-Click Blueprint)

1. Log in to [Render](https://dashboard.render.com/).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your GitHub repository (`PayGuard`).
4. Render will automatically detect [`render.yaml`](file:///c:/Users/Haaswith%20Sai/OneDrive/Desktop/PayGuard/render.yaml) and configure both services:
   - **`payguard-api`** (Node.js Backend on port 5000)
   - **`payguard-ml`** (Python FastAPI Microservice on port 8000)
5. **Environment Variables**:
   - When prompted for `MONGODB_URI`, paste your MongoDB Atlas connection string from Step 2.
6. Click **Apply**.
7. Once deployed:
   - Copy the backend URL (e.g., `https://payguard-api.onrender.com`).
   - Copy the ML service URL (e.g., `https://payguard-ml.onrender.com`).
8. **Initial Admin Seed**:
   - Go to `payguard-api` in Render $\rightarrow$ **Shell** tab $\rightarrow$ Run:
     ```bash
     npm run seed:admin
     ```
   - This creates the default Super Admin: `admin@payguard.io` / `Admin@123456`.

---

## 🎨 Step 4: Deploy Frontend Dashboard on Vercel

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository (`PayGuard`).
4. **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select **`frontend`**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - Name: `VITE_API_URL`
   - Value: `https://payguard-api.onrender.com/api/v1` (Your Render backend URL from Step 3 + `/api/v1`)
6. Click **Deploy**.
7. In ~45 seconds, your live Apple Frosted Glass dashboard is live at `https://payguard-xxxx.vercel.app`!

---

## 🔄 Step 5: Final Cross-Origin Wiring

Go back to **Render** $\rightarrow$ **`payguard-api`** $\rightarrow$ **Environment**:
- Update `CORS_ORIGIN`: Set to your Vercel URL (e.g., `https://payguard-xxxx.vercel.app`).
- Click **Save Changes** (Render will automatically redeploy).

---

## ✅ Step 6: Live Smoke Test

1. Open your Vercel URL in the browser: `https://payguard-xxxx.vercel.app`.
2. Click **"Super Admin"** one-click login preset (`admin@payguard.io` / `Admin@123456`).
3. Click the **"Simulate Webhook"** button on the Dashboard.
4. Watch the KPI cards update, Recharts velocity charts plot the event, and failure classification identify the decline category!
