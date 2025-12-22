# Tech Debt: Supabase Session Persistence Issue

**Date:** 2024-12-22
**Status:** Workaround Implemented
**Priority:** Medium

## Problem

Supabase's built-in session persistence (`persistSession: true`) was not working. Sessions were being created successfully during Google OAuth authentication but were never saved to localStorage. This caused:

- `getSession()` calls to hang indefinitely (nothing to read from storage)
- Database queries to hang (no auth token available)
- User profile creation to fail
- Complete inability to use authenticated features

## Symptoms

1. User could sign in with Google OAuth successfully
2. `onAuthStateChange` fired with valid session data
3. But `localStorage` remained empty - no session keys stored
4. All subsequent `getSession()` calls would hang forever
5. All database queries would hang forever

## Current Workaround

Implemented a custom storage adapter in `src/lib/supabase.ts`:

```typescript
const customStorageAdapter = {
  getItem: (key: string) => {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};
```

This explicitly uses `window.localStorage` and bypasses Supabase's default storage mechanism.

## Why This Should Be Investigated

1. **Root cause unknown** - We don't know WHY the default storage failed
2. **Framework compatibility** - Could be a Vite/React/Browser specific issue
3. **Future updates** - Supabase updates might fix or break this workaround
4. **Performance** - The default storage might have optimizations we're missing
5. **Other projects** - This issue could affect other Supabase projects

## Potential Root Causes to Investigate

### 1. Browser/Environment Issue
- Check if this happens in all browsers (Chrome, Firefox, Safari)
- Test in different environments (production build vs. dev server)
- Check if browser extensions are interfering

### 2. Vite Configuration
- HMR (Hot Module Reload) might be clearing localStorage
- Build configuration might affect how Supabase initializes
- Check Vite's handling of environment variables

### 3. Supabase Client Version
- Version used: `@supabase/supabase-js@^2.89.0`
- Check if this is a known issue in this version
- Test with latest version
- Check GitHub issues: https://github.com/supabase/supabase-js/issues

### 4. OAuth Redirect Flow
- PKCE flow might have timing issues
- Session might be created but cleared during redirect
- `detectSessionInUrl: true` might conflict with custom storage

### 5. React Strict Mode
- React 18's strict mode causes double-rendering
- This might interfere with session initialization
- Test with strict mode disabled

### 6. Storage API Compatibility
- Supabase might be using a different storage API internally
- Check if they're using `sessionStorage` instead of `localStorage`
- Verify localStorage quota isn't exceeded

## How to Reproduce (for testing)

1. Remove the custom storage adapter from `src/lib/supabase.ts`
2. Use default Supabase configuration:
   ```typescript
   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       flowType: 'pkce',
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: true,
     },
   });
   ```
3. Sign in with Google OAuth
4. Check localStorage: `Object.keys(localStorage)`
5. Observe that it's empty
6. Try to load workouts - observe queries hanging

## Investigation Steps

1. **Create minimal reproduction**
   - Set up fresh Vite + React + Supabase project
   - Test if issue reproduces with minimal code
   - Helps isolate if it's our code or a general issue

2. **Check Supabase logs**
   - Enable debug logging in Supabase client
   - Check for any silent errors
   - Monitor network requests during OAuth flow

3. **Test different configurations**
   - Try `flowType: 'implicit'` instead of `'pkce'`
   - Try without `detectSessionInUrl`
   - Try different storage keys

4. **Check browser console**
   - Look for any security/CORS errors
   - Check for localStorage quota errors
   - Monitor for any silent failures

5. **Community research**
   - Search Supabase Discord
   - Check Supabase GitHub issues
   - Search Stack Overflow

## Success Criteria

The issue is resolved when:
- [ ] Can remove custom storage adapter
- [ ] Default `persistSession: true` works
- [ ] Sessions persist across page refreshes
- [ ] No hanging queries
- [ ] Root cause is identified and documented

## References

- Supabase Auth docs: https://supabase.com/docs/reference/javascript/auth-api
- Custom storage: https://supabase.com/docs/reference/javascript/initializing#custom-storage
- GitHub issues: https://github.com/supabase/supabase-js/issues

## Related Files

- `src/lib/supabase.ts` - Supabase client initialization with custom storage
- `src/hooks/useAuth.tsx` - Auth context and session management
- `src/services/supabaseStorage.ts` - Database operations requiring auth

---

**Note:** This workaround is functioning correctly in production. The custom storage adapter is working as expected, but we should still investigate the root cause to:
1. Ensure we're not missing any Supabase features
2. Prevent similar issues in future projects
3. Potentially contribute a fix back to the Supabase community
