# Student Help Web - Deployment Guide

This guide provides steps for deploying the **Student Help Web (SHW)** portal locally or to cloud hosting providers.

---

## 1. Local Production Server

The Express server is configured to serve static frontend files and handle REST API routes on Port 3000.

### Start the Server:
```bash
npm start
```
- Open `http://localhost:3000` in your web browser.

### Run with PM2 Process Manager (Background / Auto-restart):
```bash
npm install -g pm2
pm2 start server.js --name "student-help-web"
pm2 save
```

---

## 2. Cloud Deployment Options

### Option A: Deploy to Render (Recommended - Free Tier Available)
1. Push this repository to GitHub or GitLab.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your repository.
4. Set the following parameters:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Create Web Service**.

---

### Option B: Deploy to Railway
1. Push repository to GitHub.
2. Go to [Railway.app](https://railway.app/) and create a new project.
3. Select **Deploy from GitHub repo** and choose this repository.
4. Railway will automatically detect `package.json` and deploy `node server.js`.

---

### Option C: Docker Deployment

Create a `Dockerfile` in the project root:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build & run container:
```bash
docker build -t student-help-web .
docker run -d -p 3000:3000 --name shw-app student-help-web
```

---

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port number on which the server listens. |
