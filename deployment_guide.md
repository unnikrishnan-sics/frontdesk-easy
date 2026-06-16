# TechnoPass Deployment Guide (Cloud Setup)

This guide outlines how to deploy the **TechnoPass** application to the cloud, allowing interns/students to scan the registration QR code and submit details using their own mobile data (4G/5G) from anywhere.

---

## Prerequisites

Before starting, make sure you have:
1. A **MongoDB Atlas** account (free cluster).
2. A **Cloudinary** account (free tier).
3. A **GitHub** account to store your code.
4. Accounts on **Render** (for backend) and **Vercel** (for frontend).

---

## Step 1: Push Project to GitHub

Initialize git in the root workspace folder (`Frontdesk Automation Pdf creator`) and push it to a private or public GitHub repository.

```bash
git init
git add .
git commit -m "Initial commit of TechnoPass MERN application"
# Create a repository on GitHub and link it
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

---

## Step 2: Set up Cloud Database & Storage

### 1. MongoDB Atlas
- Log in to MongoDB Atlas and create a free Shared Cluster.
- Go to **Database Access** and create a user with read/write access.
- Go to **Network Access** and select **Allow Access from Anywhere (0.0.0.0/0)** (Render servers need dynamic IP access).
- Copy your connection string. It should look like:
  `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/technopass?retryWrites=true&w=majority`

### 2. Cloudinary
- Log in to your Cloudinary Dashboard.
- Copy your **Cloud Name**, **API Key**, and **API Secret**.

---

## Step 3: Deploy Backend on Render (or Railway)

1. Log in to [Render](https://render.com) and click **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Set the following details:
   - **Name:** `technopass-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Click **Advanced** and add the following **Environment Variables**:
   - `PORT`: `5000` (Render binds automatically, but it's safe to define)
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<your-mongodb-atlas-connection-string>`
   - `JWT_ACCESS_SECRET`: `<a-long-random-string>`
   - `JWT_REFRESH_SECRET`: `<another-long-random-string>`
   - `CLOUDINARY_CLOUD_NAME`: `<your-cloudinary-cloud-name>`
   - `CLOUDINARY_API_KEY`: `<your-cloudinary-api-key>`
   - `CLOUDINARY_API_SECRET`: `<your-cloudinary-api-secret>`
   - `CORS_ORIGIN`: `<your-vercel-frontend-url-once-created>` (Update this in Render settings after Step 4)
5. Click **Deploy Web Service**. Once deployed, copy your Render app URL (e.g. `https://technopass-backend.onrender.com`).

---

## Step 4: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New** -> **Project**.
2. Select your GitHub repository.
3. Configure the Project:
   - **Framework Preset:** `Vite` (Vercel auto-detects this)
   - **Root Directory:** `frontend`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: `<your-render-backend-url-from-step-3>/api`
     *(Example: `https://technopass-backend.onrender.com/api`)*
5. Click **Deploy**.
6. Once the build finishes, copy your live Vercel URL (e.g. `https://technopass.vercel.app`).

> [!IMPORTANT]
> **Go back to your Render Dashboard** for the backend service, navigate to **Environment Variables**, and update `CORS_ORIGIN` with your Vercel URL (e.g., `https://technopass.vercel.app`). Render will redeploy automatically with CORS security configured to permit access exclusively from your Vercel frontend.

---

## Step 5: Verify the Setup

1. Open your Vercel URL in your browser.
2. Go to `/login` and sign in with the default admin account:
   - **Email:** `admin@srishtis.com`
   - **Password:** `srishti@2026`
3. Go to the registration page `/register` on your mobile phone (using your 4G/5G data network) and submit a test registration.
4. Verify that the Admin Dashboard updates in real time (via Socket.io) showing your new request!
