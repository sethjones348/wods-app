# Secrets Troubleshooting Guide

## Quick Fix: Use Repository Secrets (Recommended)

The simplest solution is to use **Repository Secrets** instead of Environment Secrets:

1. Go to your repository: **Settings → Secrets and variables → Actions**
2. Click **"New repository secret"** (not environment secret)
3. Add:
   - Name: `VITE_GOOGLE_CLIENT_ID`
   - Value: Your Google OAuth Client ID
4. Add:
   - Name: `VITE_GEMINI_API_KEY`
   - Value: Your Gemini API key
5. Remove the environment requirement from the build job (see below)

## Update Workflow for Repository Secrets

If you want to use Repository Secrets (simpler), remove the `environment` block from the build job:

```yaml
jobs:
  build:
    # Remove these lines if using repository secrets:
    # environment:
    #   name: github-pages
    runs-on: ubuntu-latest
    steps:
      # ... rest of workflow
```

## If Using Environment Secrets

If you prefer to keep Environment Secrets:

1. **Verify Environment Exists**:
   - Go to **Settings → Environments**
   - Ensure `github-pages` environment exists
   - If it doesn't exist, create it

2. **Verify Secrets in Environment**:
   - Go to **Settings → Environments → github-pages**
   - Click "Secrets" tab
   - Verify both secrets are listed:
     - `VITE_GOOGLE_CLIENT_ID`
     - `VITE_GEMINI_API_KEY`

3. **Check Actions Logs**:
   - Go to **Actions** tab
   - Click on the latest workflow run
   - Check the "Verify secrets are set" step
   - If it fails, the secrets aren't accessible

4. **Re-run Workflow**:
   - After fixing secrets, click "Re-run all jobs" on the failed workflow

## Common Issues

### Issue: "Configuration Error" on deployed site
**Cause**: Secrets weren't available during build, so they're empty in the production bundle.

**Solution**:
1. Check Actions logs for "Verify secrets are set" step
2. If it passed but you still see the error, the secrets might be empty strings
3. Verify the secret values are correct (not just the names)
4. Re-run the workflow after fixing

### Issue: "Verify secrets are set" step fails
**Cause**: Secrets aren't accessible to the workflow.

**Solutions**:
- Switch to Repository Secrets (simpler)
- Or verify Environment Secrets are in the correct environment
- Ensure the workflow job specifies the environment name correctly

### Issue: Secrets work locally but not in GitHub Actions
**Cause**: Local `.env.local` file isn't used by GitHub Actions.

**Solution**: Secrets must be set in GitHub repository settings, not just locally.

## Verification Steps

1. **Check Secret Names**: Must match exactly (case-sensitive):
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GEMINI_API_KEY`

2. **Check Secret Values**: 
   - No extra spaces or quotes
   - Full values copied correctly

3. **Check Workflow Logs**:
   - Look for "Verify secrets are set" step
   - Should show "✓ Secrets are configured"
   - If it shows "ERROR", secrets aren't accessible

4. **Test Build Locally**:
   ```bash
   # Set secrets in .env.local
   VITE_GOOGLE_CLIENT_ID=your_client_id
   VITE_GEMINI_API_KEY=your_api_key
   
   # Build
   npm run build
   
   # Check if build succeeds
   ```

## Recommended Approach

**Use Repository Secrets** - They're simpler and work immediately:
1. Settings → Secrets and variables → Actions
2. New repository secret
3. Add both secrets
4. Remove `environment:` from build job (optional, but cleaner)
5. Push to trigger new build

