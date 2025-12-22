# Deployment Guide - GitHub Pages

## Pre-Deployment Checklist

### 1. GitHub Repository Setup
- [ ] Repository is created on GitHub
- [ ] Code is pushed to `main` branch
- [ ] GitHub Pages is enabled in repository settings

### 2. GitHub Secrets Configuration
Go to: **Settings → Secrets and variables → Actions**

Add these secrets:
- `VITE_GEMINI_API_KEY` - Your Gemini API key
- `VITE_GOOGLE_CLIENT_ID` - Your Google OAuth Client ID

### 3. Google Cloud Console Updates
Update OAuth 2.0 credentials to include production URL:
- **Authorized JavaScript origins**: 
  - `http://localhost:5173` (dev)
  - `http://localhost:5174` (dev)
  - `https://YOUR_USERNAME.github.io` (production)
- **Authorized redirect URIs**:
  - `http://localhost:5173` (dev)
  - `http://localhost:5174` (dev)
  - `https://YOUR_USERNAME.github.io` (production)

### 4. Enable GitHub Pages
1. Go to repository **Settings → Pages**
2. **Source**: Select "GitHub Actions" (not "Deploy from a branch")
3. Save

## Deployment Steps

### Automatic Deployment (Recommended)
1. Push code to `main` branch
2. GitHub Actions will automatically:
   - Build the app
   - Deploy to GitHub Pages
3. Check Actions tab for deployment status
4. Your app will be live at: `https://YOUR_USERNAME.github.io/sam-fit/`

### Manual Deployment
If you need to deploy manually:

```bash
# Build the project
npm run build

# The dist/ folder contains the built files
# You can manually upload these to GitHub Pages if needed
```

## Post-Deployment

### 1. Verify Deployment
- Visit your GitHub Pages URL
- Test authentication
- Test workout upload
- Test workout save/load

### 2. Update OAuth Redirect URIs
After deployment, update Google Cloud Console with your actual GitHub Pages URL:
- Replace `YOUR_USERNAME` with your GitHub username
- Add the full URL: `https://YOUR_USERNAME.github.io`

### 3. Test All Features
- [ ] Sign in works
- [ ] Image upload works
- [ ] Workout extraction works
- [ ] Workout save works
- [ ] Workout list loads
- [ ] Search works
- [ ] Navigation works

## Troubleshooting

### Issue: Blank page after deployment
**Solution**: Make sure `base: '/sam-fit/'` in `vite.config.ts` matches your repository name

### Issue: 404 on refresh
**Solution**: This is expected for SPAs on GitHub Pages. Users should navigate via app links, not by refreshing.

### Issue: OAuth not working
**Solution**: 
- Verify GitHub Pages URL is in authorized origins
- Check that secrets are set correctly
- Wait a few minutes after updating OAuth settings

### Issue: API keys not working
**Solution**: 
- Verify secrets are set in GitHub repository
- Check Actions logs for build errors
- Ensure secret names match exactly: `VITE_GEMINI_API_KEY` and `VITE_GOOGLE_CLIENT_ID`

## Repository Name
If your repository is named something other than `sam-fit`, update:
1. `vite.config.ts` - Change `base: '/sam-fit/'` to match your repo name
2. Rebuild and redeploy

## Custom Domain (Optional)
If you want to use a custom domain:
1. Add `CNAME` file to `public/` folder with your domain
2. Update DNS settings
3. Update OAuth redirect URIs in Google Cloud Console

