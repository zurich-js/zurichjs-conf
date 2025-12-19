# CFP Flow - Suggested Improvements

This document outlines suggested improvements for the Call for Papers (CFP) system, organized by category.

## UI/UX Improvements

### High Priority

1. **Toast Notifications System**
   - Replace `alert()` calls with proper toast notifications
   - Add success toasts for actions like submission, review saved, etc.
   - Add error toasts with actionable messages
   - Files affected: `src/pages/cfp/reviewer/dashboard.tsx`, `src/pages/admin/cfp.tsx`

2. **Mobile Optimization**
   - Improve table layouts on mobile (use cards instead of tables)
   - Add swipe gestures for navigation between submissions
   - Optimize modal sizing on small screens
   - Files: All CFP pages with tables

3. **Loading States**
   - Add skeleton loaders for all data fetching
   - Add optimistic updates for better perceived performance
   - Show progress indicators for multi-step operations

### Medium Priority

4. **Pagination Improvements**
   - Add pagination to speaker's submission list on dashboard
   - Add "load more" option as alternative to pagination
   - Remember pagination state in URL

5. **Search & Filtering**
   - Add search to speaker dashboard for their submissions
   - Add full-text search for admin submission list
   - Save filter preferences in localStorage

6. **Bulk Actions for Admin**
   - Select multiple submissions for bulk status changes
   - Bulk export selected submissions
   - Bulk email to selected speakers

7. **Keyboard Shortcuts**
   - `Cmd/Ctrl + Enter` to submit forms
   - Arrow keys to navigate between submissions in reviewer dashboard
   - `Esc` to close modals

### Low Priority

8. **Accessibility Improvements**
   - Add ARIA labels to all interactive elements
   - Improve focus management in modals
   - Add screen reader announcements for status changes

9. **Visual Feedback**
   - Add animations for state changes (status badges, score updates)
   - Add hover states for all clickable elements
   - Add visual confirmation for autosave

---

## Data Flow Improvements

### High Priority

1. **Optimistic Updates**
   - Implement optimistic updates for status changes
   - Show immediate UI feedback while API calls complete
   - Rollback on failure with error notification
   - Files: All mutation hooks in `src/hooks/useCfp.ts`

2. **Real-time Updates**
   - Use Supabase Realtime for live updates
   - Show when another reviewer is viewing the same submission
   - Real-time notification when submission status changes
   - Update review counts live

3. **Cache Strategy**
   - Implement more targeted cache invalidation
   - Use background revalidation for stale data
   - Prefetch next/previous submissions

### Medium Priority

4. **API Consolidation**
   - Combine related API calls where possible
   - Use `getServerSideProps` more efficiently
   - Implement proper data normalization

5. **Error Handling**
   - Implement global error boundary
   - Add retry logic for failed requests
   - Better error messages with recovery suggestions

---

## Feature Additions

### High Priority

1. **Email Notifications**
   - Send email when submission status changes
   - Send email when new review is submitted
   - Send reminder emails for incomplete profiles
   - Weekly digest for reviewers with pending submissions

2. **Export Functionality**
   - Export submissions to CSV/Excel for admin
   - Export reviews with scores
   - Export speaker list with contact info

3. **Reviewer Assignment**
   - Assign specific reviewers to submissions
   - Track which submissions each reviewer has seen
   - Load balancing for review assignments

### Medium Priority

4. **Scoring & Ranking**
   - Automatic ranking based on aggregate scores
   - Weighted scoring based on reviewer role
   - Score normalization across reviewers
   - Conflict detection (outlier scores)

5. **Draft Auto-save**
   - Auto-save submission drafts every 30 seconds
   - Show "last saved" timestamp
   - Recover unsaved changes on page reload

6. **Submission Versioning**
   - Track changes to submissions
   - Allow viewing previous versions
   - Show diff between versions

### Low Priority

7. **Analytics Dashboard**
   - Submission statistics over time
   - Reviewer activity metrics
   - Conversion funnel (draft → submitted → accepted)

8. **Duplicate Detection**
   - Detect similar submissions from same speaker
   - Flag potential duplicate topics across speakers

9. **Archive & History**
   - Archive completed CFP cycles
   - View historical data from previous years
   - Compare submission quality across years

---

## Security & Auth Improvements

### High Priority

1. **Rate Limiting**
   - Add rate limiting to login endpoints
   - Limit magic link requests per email
   - Limit API calls per user

2. **Token Security**
   - Reduce magic link expiration to 15 minutes
   - Add one-time use for magic links
   - Implement proper CSRF protection

### Medium Priority

3. **Session Management**
   - Implement session timeout
   - Add "remember me" option
   - Show active sessions and allow logout from other devices

4. **Audit Logging**
   - Log all status changes with user info
   - Log admin actions
   - Provide audit trail for compliance

---

## Code Quality Improvements

### High Priority

1. **Component Extraction**
   - Extract common patterns into reusable components
   - Create shared form components
   - Standardize modal patterns

2. **Type Safety**
   - Add stricter TypeScript configurations
   - Remove any `any` types
   - Add runtime validation for API responses

### Medium Priority

3. **Testing**
   - Add unit tests for hooks
   - Add integration tests for API routes
   - Add E2E tests for critical flows

4. **Documentation**
   - Add JSDoc comments to all public functions
   - Create Storybook stories for components
   - Document API endpoints

---

## Performance Improvements

1. **Image Optimization**
   - Use Next.js Image component for all images
   - Implement lazy loading for profile images
   - Add image placeholders/blur

2. **Code Splitting**
   - Lazy load modal components
   - Split large pages into smaller chunks
   - Prefetch linked pages

3. **Database Optimization**
   - Add proper indexes for common queries
   - Optimize JOIN queries
   - Implement connection pooling

---

## Priority Matrix

| Priority | Impact | Effort | Items |
|----------|--------|--------|-------|
| P0 | High | Low | Toast notifications, Rate limiting |
| P1 | High | Medium | Email notifications, Optimistic updates |
| P2 | Medium | Medium | Real-time updates, Export functionality |
| P3 | Medium | High | Reviewer assignment, Scoring system |
| P4 | Low | Low | Keyboard shortcuts, Visual feedback |

---

## Implementation Order (Suggested)

1. **Phase 1 - Polish** (1-2 weeks)
   - Toast notification system
   - Loading skeletons
   - Mobile optimization
   - Error handling improvements

2. **Phase 2 - Features** (2-3 weeks)
   - Email notifications
   - Export functionality
   - Bulk actions for admin
   - Search improvements

3. **Phase 3 - Advanced** (3-4 weeks)
   - Real-time updates
   - Reviewer assignment
   - Scoring & ranking
   - Analytics dashboard

4. **Phase 4 - Security & Quality** (1-2 weeks)
   - Rate limiting
   - Token security
   - Testing
   - Documentation
