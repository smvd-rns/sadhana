# Render Microservice Deployment

To deploy this background worker to Render:

1. **Create a new Web Service** on Render.
2. **Connect your GitHub repository** containing this code.
3. In the Render settings, specify the **Root Directory** as: `indexer-service`
4. Use the following **Build Command**: `npm install`
5. Use the following **Start Command**: `npm start`
6. Add the following **Environment Variables** in Render:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
   - `NEXT_PUBLIC_SADHANA_DB_URL`
   - `SADHANA_DB_SERVICE_ROLE_KEY`
7. Once your Web Service is live on Render (e.g., `https://my-indexer-service.onrender.com`), go to your **Vercel Project Settings** -> **Environment Variables** and add:
   - Key: `NEXT_PUBLIC_RENDER_INDEXER_URL`
   - Value: `https://my-indexer-service.onrender.com` (no trailing slash)
8. Redeploy your Vercel frontend so it picks up the URL.
