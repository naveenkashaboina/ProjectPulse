# ProjectPulse 🚀
> **Agile Project Management & Team Collaboration Platform**

ProjectPulse is an enterprise-grade full-stack project management and issue-tracking platform built for high-velocity software teams. It provides end-to-end agile workflows, interactive Kanban boards, sprint capacity planning, defect tracking, and team analytics.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, React Router v7, Zustand, Axios, Responsive Vanilla CSS (Design Tokens) |
| **Backend** | Node.js, Express, MongoDB (Mongoose), JWT (Access + Refresh tokens with HttpOnly cookies) |
| **Security** | Helmet, Express Rate Limit, Mongo Sanitize, BCrypt (Salt 12), Role-Based Access Control (RBAC) |
| **Testing** | Jest, Supertest, MongoDB Memory Server |

---

## 🚀 Quickstart (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection string.

### 2. Installation
Clone the repository and install all dependencies:
```bash
npm run install:all
```

### 3. Environment Configuration
Create `.env` inside `server/`:
```bash
cp server/.env.example server/.env
```
Ensure your `server/.env` includes:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/projectpulse
JWT_SECRET=super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads
```

### 4. Seed Demo Data
Populate the database with demo organizations, 10 team members, projects, sprints, tasks, and activity logs:
```bash
npm run seed
```

### 5. Start Application
Launch both backend and frontend concurrently:
```bash
npm run dev
```
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:5000/api](http://localhost:5000/api)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 👥 Demo Accounts
All pre-seeded demo accounts share the password: **`Password123!`**

| Name | Role | Email |
| :--- | :--- | :--- |
| **Sarah Chen** | OrgAdmin (Acme Corp) | `sarah.chen@acmecorp.com` |
| **Marcus Williams** | Project Manager | `marcus.williams@acmecorp.com` |
| **Elena Rodriguez** | Team Lead | `elena.rodriguez@acmecorp.com` |
| **David Kim** | Developer | `david.kim@acmecorp.com` |
| **Priya Patel** | Developer | `priya.patel@acmecorp.com` |
| **Tom Nakamura** | OrgAdmin (Stellar Labs) | `tom.nakamura@stellarlabs.com` |

---

## 🚢 Production Deployment

ProjectPulse supports two production deployment models:

### Option A: Unified Single-Service Deployment (Recommended — Render / Railway / Heroku)
In this model, the Express server serves both the REST API and the compiled React production bundle from the same domain. This avoids cross-domain cookie restrictions and simplifies hosting.

1. **Build Command**:
   ```bash
   npm run install:all && npm run build
   ```
2. **Start Command**:
   ```bash
   npm start
   ```
3. **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/projectpulse?retryWrites=true&w=majority
   JWT_SECRET=<strong-random-secret>
   JWT_REFRESH_SECRET=<strong-random-refresh-secret>
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-app-domain.onrender.com
   ```

---

### Option B: Split Deployment (Frontend on Vercel + Backend on Render / Railway)

#### 1. Backend Setup (Render / Railway):
- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `NODE_ENV=production`
  - `CORS_ORIGIN=https://your-projectpulse.vercel.app` (must match your frontend URL exactly)
  - `MONGODB_URI=<your-atlas-connection-string>`
  - `JWT_SECRET=<strong-secret>`
  - `JWT_REFRESH_SECRET=<strong-secret>`

#### 2. Frontend Setup (Vercel / Netlify):
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**:
  - `VITE_API_URL=https://your-backend-api.onrender.com/api`

---

## 🧪 Testing

Execute automated backend test suite (unit, RBAC, auth, security, and workflow tests):
```bash
npm test
```
*Note: Test runs strictly utilize an isolated test database (`projectpulse_test`), preventing development data resets.*

---

## 🛡️ Production Checklist

- [ ] **MongoDB Atlas**: Deploy a managed MongoDB replica set with IP whitelist (allow `0.0.0.0/0` with strong authentication).
- [ ] **Cryptographic Secrets**: Generate 64-character random strings for `JWT_SECRET` and `JWT_REFRESH_SECRET` using `openssl rand -hex 32`.
- [ ] **CORS Origin**: Set `CORS_ORIGIN` to your exact production frontend domain.
- [ ] **SSL / HTTPS**: Ensure your domain enforces HTTPS so `HttpOnly` and `SameSite=None` secure cookies function correctly.
- [ ] **Persistent Uploads**: For ephemeral containers (e.g., Render free tier), attach a persistent disk to `/uploads` or integrate cloud storage (AWS S3 / Cloudinary).
