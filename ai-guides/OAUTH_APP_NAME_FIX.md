# Fix OAuth Sign-in Page Text: Show "WODsApp" Instead of Supabase URL

## The Problem
The Google sign-in page shows "to continue to mfnxmnlzdsttpxfdxsmt.supabase.co" instead of "to continue to WODsApp".

**Root Cause**: Google requires branding verification before the app name can be shown to users. If branding isn't verified, Google displays the redirect URI domain instead.

## Solution: Configure Branding for Verification

### Step 1: Go to OAuth Consent Screen
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **OAuth consent screen**

### Step 2: Configure Required Branding Fields
To enable branding verification, you need to fill in these required fields:

1. **App name**: `WODsApp`
2. **User support email**: Your email address
3. **Developer contact information**: Your email address
4. **Application home page**: `https://wodsapp.online` (your production URL)
5. **Privacy policy link**: Required for verification
   - You can create a simple privacy policy page or use a service like:
   - `https://wodsapp.online/privacy` (if you have one)
   - Or use a privacy policy generator and host it

### Step 3: Add Privacy Policy (Required for Verification)

You need a privacy policy URL. Options:

**Option A: Create a simple privacy policy page**
- Create a `/privacy` route in your app
- Add basic privacy policy content
- Use: `https://wodsapp.online/privacy`

**Option B: Use a privacy policy generator**
- Use a service like [Privacy Policy Generator](https://www.privacypolicygenerator.info/)
- Host the generated policy on your site
- Add the URL to OAuth Consent Screen

### Step 4: Save and Request Verification
1. Fill in all required fields (App name, home page, privacy policy)
2. Click **SAVE AND CONTINUE** at the bottom
3. Go through all the steps (Scopes, Test users, Summary)
4. Go to the **Verification status** section
5. Click **Verify branding** (if available) or submit for verification

### Step 5: For Testing Mode Apps
If your app is in **Testing** mode:
- Branding verification may not be required immediately
- Make sure all fields are filled in
- The app name should work for test users even without verification
- Wait 5-10 minutes after saving for changes to propagate

### Step 6: Clear Cache and Test
1. Clear your browser cache or use **Incognito/Private mode**
2. Try signing in again
3. The sign-in page should now show "to continue to WODsApp" (for test users in Testing mode)

## Important Notes

- **Branding Verification**: Google requires branding verification for the app name to show to all users. In Testing mode, it may work for test users without verification, but verification is still recommended.
- **Privacy Policy Required**: A privacy policy URL is required for branding verification. This is a Google requirement.
- **App Publishing Status**: If your app is in "Testing" mode, the app name should work for test users. For production/public apps, branding verification is mandatory.
- **Multiple OAuth Clients**: Make sure you're updating the OAuth Consent Screen for the same project that contains your OAuth 2.0 Client ID.
- **Propagation Time**: Google's changes can take 5-10 minutes to propagate. Be patient!

## If It Still Shows Supabase URL

If after updating the app name it still shows the Supabase URL:

1. **Check Verification Status**: Go to the "Verification status" section in OAuth Consent Screen. If it says "Your branding needs to be verified", you need to:
   - Fill in all required fields (App name, home page, privacy policy)
   - Submit for verification (if in production mode)
   - For Testing mode, ensure all fields are filled and wait for propagation

2. **Double-check Required Fields**:
   - App name: `WODsApp`
   - Application home page: `https://wodsapp.online`
   - Privacy policy link: Must be a valid, accessible URL

3. **Verify you saved**: Go back to OAuth Consent Screen and confirm all fields are saved

4. **Check the OAuth Client**: Make sure your OAuth 2.0 Client ID is in the same Google Cloud project

5. **Try a different browser**: Sometimes browser cache can be persistent

6. **Wait longer**: Some changes can take up to 15 minutes to propagate

## Understanding Branding Verification

- **Testing Mode**: Branding may work for test users without full verification, but all fields must still be filled
- **Production Mode**: Branding verification is mandatory and can take several days for Google to review
- **Why It Matters**: Without verified branding, Google shows the redirect URI domain instead of your app name

## Common Verification Issues

### Issue 1: "The website of your home page URL is not registered to you"

Google needs to verify that you own the domain. To fix this:

1. **Option A: Verify Domain Ownership in Google Search Console** (Recommended)
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Add your property: `https://wodsapp.online`
   - Verify ownership using one of these methods:
     - **HTML file upload**: Download the verification file and add it to your site's root
     - **HTML tag**: Add a meta tag to your site's `<head>`
     - **DNS record**: Add a TXT record to your domain's DNS
   - Once verified, wait 24-48 hours for Google to recognize the verification

2. **Option B: Use Google Sites Verification**
   - If you have access to your domain's DNS, you can add a TXT record for Google verification
   - Check Google's domain verification documentation for the exact record to add

### Issue 2: "Your home page URL does not include a link to your privacy policy"

Google requires a visible link to your privacy policy on your home page. The privacy policy link has been added to:
- ✅ Footer (visible on desktop)
- ✅ Home page footer section (visible on all devices)

Make sure the link is visible and accessible at `https://wodsapp.online/` before requesting re-verification.

## Quick Privacy Policy Solution

If you need a privacy policy quickly, you can:

1. Create a simple page at `https://wodsapp.online/privacy` with basic privacy information
2. Or use a privacy policy generator and host it
3. Add the URL to your OAuth Consent Screen

Example minimal privacy policy content:
- What data you collect (email, profile info)
- How you use it (authentication, app functionality)
- How you store it (Supabase)
- User rights (access, deletion)

