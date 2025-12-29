# Rebranding Proposal: SamFit → WODsApp

## Executive Summary

This proposal outlines the plan to rebrand the application from **SamFit** to **WODsApp**. "WOD" stands for "Workout of the Day," which is a common term in the CrossFit community and better reflects the app's core functionality of tracking daily workouts.

## Rationale

### Why WODsApp?

1. **Industry Alignment**: "WOD" is universally recognized in the CrossFit community as "Workout of the Day"
2. **Clearer Purpose**: The name immediately communicates what the app does
3. **Brand Identity**: More distinctive and memorable than "SamFit"
4. **Scalability**: Less personal, more product-focused branding
5. **SEO Benefits**: "WOD" is a high-value search term in the fitness/CrossFit space

### Current State

- **Current Name**: SamFit / sam-fit
- **Current Domain**: samfit.xyz
- **Branding**: "SAM" (white) + "FIT" (red #E11931)
- **Target Audience**: CrossFit athletes tracking whiteboard workouts

## Scope of Changes

### 1. Code & Configuration Files

#### Package Management
- [ ] `package.json` - Change `"name": "sam-fit"` → `"wodsapp"` or `"wods-app"`
- [ ] `package-lock.json` - Will auto-update on next `npm install`

#### Application Configuration
- [ ] `public/manifest.json` - Update `name` and `short_name`
- [ ] `index.html` - Update all meta tags (title, og:title, twitter:title)
- [ ] `public/404.html` - Update title and any references
- [ ] `public/og-image.html` - Update branding and title
- [ ] `vite.config.ts` - Review base path (currently supports custom domain)

#### Source Code
- [ ] `src/pages/FeedPage.tsx` - Update welcome message
- [ ] `src/components/Footer.tsx` - Update copyright text
- [ ] `src/services/emailService.ts` - Update all email templates and branding
- [ ] `src/services/driveStorage.ts` - Update `DRIVE_FOLDER_NAME` constant
- [ ] `src/services/workoutCache.ts` - Update IndexedDB database name
- [ ] `src/lib/supabase.ts` - Update client info header
- [ ] `src/App.tsx` - Review routing paths (currently `/sam-fit/`)

#### Supabase Functions
- [ ] `supabase/functions/send-email/index.ts` - Update email from address
- [ ] `supabase/functions/send-email/README.md` - Update documentation
- [ ] `supabase/functions/daily-activity-email/index.ts` - Update email templates
- [ ] `supabase/config.toml` - Update `project_id` if needed

### 2. Documentation Files

#### Main Documentation
- [ ] `README.md` - Update title and all references
- [ ] `docs/architecture.md` - Update all references
- [ ] `docs/style-guide.md` - Update branding guidelines
- [ ] `docs/implementation-plan.md` - Update references
- [ ] `docs/social-feed-implementation-plan.md` - Update references
- [ ] `docs/social-feed-proposal.md` - Update references
- [ ] `docs/production-oauth-setup.md` - Update domain references
- [ ] `docs/supabase-setup-guide.md` - Update project name references
- [ ] `docs/DEEP_RESEARCH_PROMPT.md` - Update app name references
- [ ] `docs/search-architecture.md` - Update references

#### AI Guides
- [ ] `ai-guides/CUSTOM_DOMAIN_SETUP.md` - Update domain references (if changing domain)
- [ ] `ai-guides/DNS_VERIFICATION.md` - Update domain references
- [ ] `ai-guides/DEPLOYMENT.md` - Update repository and domain references
- [ ] `ai-guides/OG_IMAGE_GUIDE.md` - Update branding guidelines
- [ ] `ai-guides/OAUTH_COMPLETE_SETUP.md` - Update app name
- [ ] `ai-guides/OAUTH_SETUP.md` - Update references
- [ ] `ai-guides/DRIVE_API_SETUP.md` - Update folder name references

### 3. Branding Assets

#### Visual Assets
- [ ] Logo SVG (`public/favicon.svg`) - Update to WODsApp branding
- [ ] App Icons (`public/icon-192.png`, `public/icon-512.png`) - Regenerate with new branding
- [ ] OG Image (`public/og-image.png`) - Regenerate with new branding
- [ ] Email Logo - Update base64 encoded logo in `emailService.ts`

#### Branding Guidelines
- **New Logo Design**: "WODs" (white) + "App" (red #E11931) or similar variation
- **Color Scheme**: Maintain current red (#E11931) and black theme
- **Typography**: Continue using Oswald for headings

### 4. External Services & Configuration

#### Domain & DNS
- [ ] **Decision Required**: Keep `samfit.xyz` or acquire new domain (e.g., `wodsapp.com`, `wods.app`)
  - If keeping current domain: Update all references to reflect new branding
  - If changing domain: Full DNS migration required

#### Google Cloud Console
- [ ] OAuth 2.0 App Name - Update to "WODsApp"
- [ ] OAuth Redirect URIs - Update if domain changes
- [ ] API Project Name - Consider updating for consistency

#### Email Service (Resend)
- [ ] From Address - Update from `noreply@samfit.xyz` to new domain (if changing)
- [ ] Domain Verification - Verify new domain if changing
- [ ] Email Templates - All templates already updated in code

#### Supabase
- [ ] Project Name - Consider updating for consistency
- [ ] Email Templates - Verify all references updated

### 5. User-Facing Content

#### UI Text
- [ ] Welcome messages
- [ ] Page titles
- [ ] Footer copyright
- [ ] Email subject lines
- [ ] Email body content
- [ ] Error messages (if any contain branding)

## Implementation Plan

### Phase 1: Preparation (1-2 days)
1. **Decision on Domain**
   - Option A: Keep `samfit.xyz` (easier, no DNS changes)
   - Option B: Acquire new domain (better branding, more work)
   
2. **Design New Logo**
   - Create WODsApp logo variations
   - Test at different sizes (favicon, app icons, email)
   - Ensure readability and brand consistency

3. **Create Migration Checklist**
   - Use this document as base
   - Add any project-specific items

### Phase 2: Code Changes (2-3 days)
1. **Update Configuration Files**
   - Package.json, manifest.json, index.html
   - Test build process after each major change

2. **Update Source Code**
   - Search and replace all "SamFit" references
   - Update constants and configuration values
   - Update email templates

3. **Update Documentation**
   - Systematically go through all docs
   - Update code examples and references

### Phase 3: Assets & Branding (1-2 days)
1. **Generate New Assets**
   - Logo SVG
   - App icons (192x192, 512x512)
   - OG image (1200x630)
   - Email logo

2. **Update Visual Assets**
   - Replace all image files
   - Test on different devices/sizes

### Phase 4: External Services (1-2 days)
1. **Google Cloud Console**
   - Update OAuth app name
   - Update redirect URIs if domain changes

2. **Email Service**
   - Update from address
   - Verify domain (if changed)
   - Test email delivery

3. **Supabase**
   - Update project settings if needed
   - Test edge functions

### Phase 5: Testing & Validation (2-3 days)
1. **Functional Testing**
   - [ ] App loads correctly
   - [ ] Authentication works
   - [ ] Workout extraction works
   - [ ] Storage/Drive integration works
   - [ ] Email notifications work
   - [ ] All pages render correctly
   - [ ] PWA installation works
   - [ ] Search functionality works

2. **Branding Verification**
   - [ ] Logo appears correctly everywhere
   - [ ] App name appears correctly in UI
   - [ ] Email templates use new branding
   - [ ] Meta tags are correct
   - [ ] OG image displays correctly when sharing

3. **Cross-Platform Testing**
   - [ ] Desktop browsers (Chrome, Firefox, Safari, Edge)
   - [ ] Mobile browsers (iOS Safari, Chrome Android)
   - [ ] PWA installation on mobile
   - [ ] Email rendering in various clients

### Phase 6: Deployment (1 day)
1. **Pre-Deployment**
   - [ ] Run full test suite
   - [ ] Build production bundle
   - [ ] Verify all assets included
   - [ ] Check bundle size

2. **Deployment**
   - [ ] Deploy to staging/test environment first
   - [ ] Verify staging deployment
   - [ ] Deploy to production
   - [ ] Monitor for errors

3. **Post-Deployment**
   - [ ] Verify production site loads
   - [ ] Test critical user flows
   - [ ] Monitor error logs
   - [ ] Check analytics

## Risks & Considerations

### High Risk Items

1. **Domain Change**
   - **Risk**: Breaking existing links, OAuth redirects, email deliverability
   - **Mitigation**: 
     - Keep old domain active with redirects if possible
     - Update all OAuth redirect URIs before switching
     - Test email delivery thoroughly

2. **OAuth Redirect URIs**
   - **Risk**: Users unable to authenticate if URIs not updated
   - **Mitigation**: Update Google Cloud Console before deployment

3. **Email Deliverability**
   - **Risk**: Emails marked as spam if domain/from address changes
   - **Mitigation**: 
     - Verify new domain with SPF/DKIM records
     - Warm up new domain if changing
     - Consider keeping old domain for email initially

4. **IndexedDB Migration**
   - **Risk**: Users lose cached data if database name changes
   - **Mitigation**: 
     - Keep old database name OR
     - Implement migration script to copy data

5. **Google Drive Folder**
   - **Risk**: Existing users' workouts in old folder structure
   - **Mitigation**: 
     - Support both folder names initially OR
     - Migrate existing data to new folder

### Medium Risk Items

1. **Bookmarks & PWA Installations**
   - Users with bookmarked pages or installed PWA may see old branding
   - Clear browser cache may be needed
   - PWA updates automatically on next visit

2. **External Links**
   - Any external sites linking to samfit.xyz will still work (if keeping domain)
   - Social media shares may show old OG image until cache clears

3. **Documentation Consistency**
   - Risk of missing some documentation updates
   - Mitigation: Systematic checklist and review

### Low Risk Items

1. **Package Name**
   - Internal only, doesn't affect users
   - Can be changed anytime

2. **Repository Name**
   - GitHub repo can be renamed
   - Update any CI/CD references

## Migration Strategy for Existing Data

### Google Drive
- **Option 1**: Keep "SamFit" folder, just update code to use "WODsApp" going forward
- **Option 2**: Create migration script to rename/move folder
- **Recommendation**: Option 1 for simplicity, Option 2 for clean break

### IndexedDB
- **Option 1**: Keep database name, just update display name
- **Option 2**: Create new database, copy data on first load
- **Recommendation**: Option 2 for clean migration

### User Accounts
- No changes needed - Supabase handles this
- Users will see new branding on next login

## Timeline Estimate

**Total Estimated Time: 8-12 days**

- Preparation: 1-2 days
- Code Changes: 2-3 days
- Assets & Branding: 1-2 days
- External Services: 1-2 days
- Testing: 2-3 days
- Deployment: 1 day

**Can be done in parallel:**
- Documentation updates (can be done alongside code changes)
- Asset creation (can be done in parallel with code changes)

## Success Criteria

1. ✅ All references to "SamFit" replaced with "WODsApp"
2. ✅ New branding appears consistently across app
3. ✅ All functionality works as before
4. ✅ No user data loss
5. ✅ Email notifications work correctly
6. ✅ OAuth authentication works
7. ✅ PWA installation works with new branding
8. ✅ Documentation is up to date
9. ✅ No broken links or references
10. ✅ Production deployment successful

## Open Questions

1. **Domain Strategy**: Keep `samfit.xyz` or acquire new domain?
   - Recommendation: Keep for now, acquire `wodsapp.com` or `wods.app` later if desired

2. **Logo Design**: Exact styling for "WODsApp"?
   - Suggestion: "WODs" (white) + "App" (red) maintaining current aesthetic

3. **Package Name Format**: `wodsapp` or `wods-app`?
   - Recommendation: `wodsapp` (simpler, no hyphens)

4. **Drive Folder**: Migrate existing or support both?
   - Recommendation: Support both initially, migrate later if needed

5. **IndexedDB**: Migrate data or start fresh?
   - Recommendation: Migrate data to preserve user experience

## Next Steps

1. **Review and Approve Proposal**
   - Stakeholder review
   - Address open questions
   - Finalize domain strategy

2. **Create Detailed Task List**
   - Break down into specific, actionable tasks
   - Assign ownership if team-based
   - Set deadlines

3. **Begin Phase 1: Preparation**
   - Design logo
   - Make domain decision
   - Set up project tracking

## Appendix: Complete File Inventory

### Files Requiring Updates (119 references found)

**Configuration:**
- `package.json`
- `package-lock.json`
- `public/manifest.json`
- `index.html`
- `public/404.html`
- `public/og-image.html`
- `vite.config.ts` (review)
- `supabase/config.toml`

**Source Code:**
- `src/pages/FeedPage.tsx`
- `src/components/Footer.tsx`
- `src/services/emailService.ts`
- `src/services/driveStorage.ts`
- `src/services/workoutCache.ts`
- `src/lib/supabase.ts`
- `src/App.tsx` (review routing)

**Supabase Functions:**
- `supabase/functions/send-email/index.ts`
- `supabase/functions/send-email/README.md`
- `supabase/functions/daily-activity-email/index.ts`

**Documentation:**
- All files in `docs/` directory
- All files in `ai-guides/` directory
- `README.md`

**Assets:**
- `public/favicon.svg`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/og-image.png`
- Email logo in `emailService.ts`

---

**Document Version**: 1.0  
**Created**: [Current Date]  
**Last Updated**: [Current Date]

