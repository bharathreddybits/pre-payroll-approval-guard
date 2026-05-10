# Trial Expiration & Access Control System

Complete implementation of 7-day free trial with expiration tracking, notifications, and access control.

## Implementation Date
May 9, 2026

## System Overview

The trial expiration system ensures users subscribe after their 7-day free trial ends by:
1. **Tracking** trial end dates in the database
2. **Checking** subscription status on every page load
3. **Notifying** users when trial is expiring soon (≤3 days)
4. **Blocking** access to protected pages when trial expires

---

## Components

### 1. Database Schema (`supabase/migrations/009_add_trial_tracking.sql`)

**New Fields:**
- `trial_end_date`: When the trial expires (NULL if not on trial)
- `trial_days`: Number of trial days offered (default: 7)

**Helper Functions:**
```sql
-- Check if trial has expired
is_trial_expired(sub_id UUID) → BOOLEAN

-- Get days remaining in trial
trial_days_remaining(sub_id UUID) → INTEGER
```

**Subscription Status Values:**
- `trialing`: On free trial
- `active`: Paid subscription
- `past_due`: Payment failed (grace period)
- `cancelled`: User cancelled
- `expired`: Subscription/trial expired

---

### 2. Access Control Logic (`lib/billing/entitlements.ts`)

**Key Functions:**

```typescript
// Get entitlements with real trial status
getEntitlements(organizationId: string): Promise<Entitlement>

// Check subscription access
checkSubscriptionAccess(organizationId: string): Promise<{
  hasAccess: boolean;
  status: 'active' | 'trialing' | 'expired' | 'none';
  daysRemaining?: number;
  trialEnded?: boolean;
  needsSubscription?: boolean;
}>
```

**Access Rules:**
- ✅ **Active** subscription → Full access
- ✅ **Trialing** (not expired) → Full access
- 🟡 **Past Due** → Access granted (grace period)
- ❌ **Trialing** (expired) → Access BLOCKED
- ❌ **Expired/Cancelled** → Access BLOCKED
- ❌ **No subscription** → Access BLOCKED

---

### 3. React Hook (`hooks/useSubscriptionStatus.ts`)

**Usage:**
```typescript
const { hasAccess, status, daysRemaining, trialEnded, loading } = useSubscriptionStatus();
```

**Returns:**
```typescript
{
  hasAccess: boolean;           // Whether user can access product
  status: 'active' | 'trialing' | 'expired' | 'none' | 'loading';
  daysRemaining?: number;       // Days until trial/period ends
  trialEnded?: boolean;         // Trial has expired
  needsSubscription?: boolean;  // Needs to subscribe
  loading: boolean;             // Loading state
  error?: string;               // Error message
}
```

---

### 4. Trial Banner Component (`components/TrialBanner.tsx`)

**Banner Types:**

**🔴 Red Banner (Critical)** - Trial Expired
- Shown when: Trial has ended
- Message: "Your free trial has ended. Subscribe now to continue using PayrollShield."
- CTA: "View Plans" button
- User Action: Must subscribe to continue

**🟡 Amber Banner (Warning)** - Trial Expiring Soon
- Shown when: ≤3 days remaining
- Message: "Your free trial ends in X days. Subscribe now to keep your access."
- CTA: "Subscribe Now" button
- User Action: Encouraged to subscribe

**🔵 Blue Banner (Info)** - No Subscription
- Shown when: User has access but no subscription
- Message: "Start your 7-day free trial to unlock all features."
- CTA: "Start Free Trial" button
- User Action: Optional - can dismiss

---

### 5. Subscription Guard Component (`components/SubscriptionGuard.tsx`)

**Purpose:** Blocks access to protected pages when trial expires

**Usage:**
```tsx
<SubscriptionGuard>
  <ProtectedPageContent />
</SubscriptionGuard>
```

**Behavior:**
- ✅ Has access → Renders children
- ❌ No access → Shows "Trial Ended" screen with subscribe CTA
- 🔄 Loading → Shows loading spinner
- 🚫 Not authenticated → Redirects to login

**Screen When Blocked:**
- Large warning icon
- "Trial Ended" or "Subscription Required" message
- "View Plans & Subscribe" button
- "Go to Dashboard" button
- 7-day money-back guarantee note

---

## Implementation in Pages

### Dashboard Page (`pages/dashboard.tsx`)

**Added:**
```tsx
import { TrialBanner } from '../components/TrialBanner';

<Header />
<TrialBanner />  // Shows appropriate banner based on status
<main>...</main>
```

**Future Implementation:**
Add `<SubscriptionGuard>` to protect specific features:
```tsx
// Protect upload feature
<SubscriptionGuard>
  <UploadForm />
</SubscriptionGuard>

// Protect review feature
<SubscriptionGuard>
  <ReviewSession />
</SubscriptionGuard>
```

---

## Testing the System

### Test Script (`scripts/test-trial-expiration.mjs`)

**Create Test Scenarios:**

```bash
# 1. Expired trial (blocks access)
node scripts/test-trial-expiration.mjs expired

# 2. Expiring soon (2 days - shows warning)
node scripts/test-trial-expiration.mjs expiring

# 3. Active subscription (no warnings)
node scripts/test-trial-expiration.mjs active

# 4. New trial (7 days remaining)
node scripts/test-trial-expiration.mjs new-trial

# 5. Reset (remove subscription)
node scripts/test-trial-expiration.mjs reset
```

### Manual Testing Steps

**Test 1: Expired Trial**
1. Run: `node scripts/test-trial-expiration.mjs expired`
2. Log in to the application
3. Navigate to `/dashboard`
4. **Expected:**
   - 🔴 Red banner: "Your free trial has ended"
   - Try accessing `/upload` or `/review`
   - ❌ Should see "Trial Ended" screen
   - CTA: "View Plans & Subscribe"

**Test 2: Trial Expiring Soon**
1. Run: `node scripts/test-trial-expiration.mjs expiring`
2. Log in and go to `/dashboard`
3. **Expected:**
   - 🟡 Amber banner: "Your free trial ends in 2 days"
   - ✅ Full access to all features
   - CTA: "Subscribe Now"
   - Banner can be dismissed

**Test 3: Active Subscription**
1. Run: `node scripts/test-trial-expiration.mjs active`
2. Log in and go to `/dashboard`
3. **Expected:**
   - ✅ No trial banners
   - ✅ Full access to all features
   - Normal dashboard view

**Test 4: New Trial**
1. Run: `node scripts/test-trial-expiration.mjs new-trial`
2. Log in and go to `/dashboard`
3. **Expected:**
   - ℹ️ No banners initially (7 days remaining)
   - ✅ Full access to all features
   - Banner appears when ≤3 days remain

**Test 5: No Subscription**
1. Run: `node scripts/test-trial-expiration.mjs reset`
2. Log in and go to `/dashboard`
3. **Expected:**
   - 🔵 Blue banner: "Start your 7-day free trial"
   - ✅ Has access (for now - can be configured)
   - CTA: "Start Free Trial"

---

## User Flow

### New User Signup
1. User signs up → Account created
2. Auto-create organization (already implemented)
3. **NEW:** Create initial trial subscription:
   ```typescript
   {
     status: 'trialing',
     trial_end_date: NOW() + 7 days,
     trial_days: 7,
     current_period_start: NOW(),
     current_period_end: NOW() + 30 days
   }
   ```

### During Trial (Days 1-4)
- ✅ Full access to product
- ℹ️ No warnings
- User can subscribe anytime

### Trial Expiring (Days 5-7)
- ✅ Full access continues
- 🟡 Warning banner appears
- Encouraged to subscribe
- Shows days remaining

### Trial Expired (Day 8+)
- ❌ Access BLOCKED
- 🔴 Critical banner everywhere
- Must subscribe to continue
- Shows "Trial Ended" screen on protected pages

### After Subscription
- ✅ Full access restored
- ✅ No banners
- Status changes to 'active'
- Trial tracking ends

---

## Integration with LemonSqueezy

When a user subscribes via LemonSqueezy:

**Webhook Handler Updates:**
```typescript
// Update subscription status
{
  status: 'active',              // Changed from 'trialing'
  trial_end_date: null,          // No longer on trial
  current_period_end: <new_date>, // From LemonSqueezy
  lemonsqueezy_subscription_id: <id>
}
```

**Subscription Created:**
- Creates new subscription record
- Sets status to 'active'
- No trial period

**Subscription Updated:**
- Updates existing trial subscription
- Changes status from 'trialing' to 'active'
- Clears trial_end_date

---

## Configuration Options

### Trial Length
Change default trial period in migration:
```sql
ALTER TABLE public.subscription
ALTER COLUMN trial_days SET DEFAULT 14;  -- 14-day trial instead of 7
```

### Warning Threshold
Change when warning appears (currently ≤3 days):
```typescript
// In TrialBanner.tsx
if (daysRemaining <= 5) {  // Show warning 5 days before expiration
  // ...
}
```

### Grace Period
Allow access after trial expires (grace period):
```typescript
// In lib/billing/entitlements.ts - checkSubscriptionAccess()
if (isExpired) {
  const gracePeriodDays = 3;
  const daysSinceExpired = Math.ceil((now - trialEnd) / (1000 * 60 * 60 * 24));

  if (daysSinceExpired <= gracePeriodDays) {
    return {
      hasAccess: true,  // Allow access during grace period
      status: 'trialing',
      daysRemaining: -daysSinceExpired,  // Negative = overdue
    };
  }
  // Block access after grace period
}
```

---

## Database Migration

**Apply Migration:**
```bash
# Via Supabase CLI (if installed)
supabase db push

# Or manually in Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Open supabase/migrations/009_add_trial_tracking.sql
# 3. Execute the migration
```

**Verify Migration:**
```sql
-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscription'
  AND column_name IN ('trial_end_date', 'trial_days');

-- Test helper functions
SELECT is_trial_expired('<some-subscription-id>');
SELECT trial_days_remaining('<some-subscription-id>');
```

---

## Monitoring & Metrics

**Key Metrics to Track:**

1. **Trial Conversion Rate**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE status = 'trialing') AS trials,
     COUNT(*) FILTER (WHERE status = 'active') AS conversions,
     ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'active') /
           NULLIF(COUNT(*), 0), 2) AS conversion_rate
   FROM subscription;
   ```

2. **Days to Conversion**
   ```sql
   SELECT
     AVG(EXTRACT(DAY FROM (updated_at - created_at))) AS avg_days_to_convert
   FROM subscription
   WHERE status = 'active' AND trial_end_date IS NOT NULL;
   ```

3. **Trial Expiration Without Conversion**
   ```sql
   SELECT COUNT(*)
   FROM subscription
   WHERE status = 'trialing'
     AND trial_end_date < NOW()
     AND lemonsqueezy_subscription_id IS NULL;
   ```

4. **Banner Engagement**
   - Track clicks on "Subscribe Now" vs dismissals
   - A/B test different banner messages
   - Monitor conversion after seeing banner

---

## Email Notifications (Future Enhancement)

**Trial Expiration Emails:**

**Day 5:** "Your trial ends in 2 days"
- Reminder email
- Link to pricing page
- Highlight value proposition

**Day 7:** "Last day of your trial"
- Urgent tone
- Limited-time offer (if any)
- Direct subscribe link

**Day 8:** "Your trial has ended"
- Access suspended notice
- Re-subscribe link
- Contact support offer

**Implementation:**
- Use a Supabase Edge Function or a scheduled cron job
- Trigger based on trial_end_date
- Track email opens/clicks

---

## Troubleshooting

**User can't access product after subscribing:**
1. Check subscription status in database
2. Verify webhook fired correctly
3. Check trial_end_date is NULL or in future
4. Verify status is 'active'

**Banner not showing:**
1. Check subscription exists for organization
2. Verify trial_end_date is set correctly
3. Check browser console for errors
4. Verify useSubscriptionStatus hook is loading

**Trial not expiring:**
1. Check current time vs trial_end_date
2. Verify timezone handling (use UTC)
3. Test with `test-trial-expiration.mjs expired`

---

## Security Considerations

✅ **Server-side enforcement**: Access control in API routes and database RLS
✅ **Client-side UX**: Banners and guards for user experience
✅ **No client bypass**: Backend validates subscription status
✅ **Secure functions**: Database functions use SECURITY DEFINER
⚠️ **Important**: Never rely solely on client-side checks for access control

---

## Status

- ✅ Database schema updated
- ✅ Trial tracking implemented
- ✅ Access control logic complete
- ✅ React hook implemented
- ✅ Trial banner component created
- ✅ Subscription guard component created
- ✅ Dashboard updated with banner
- ✅ Test script created
- ⏳ Needs: Apply database migration
- ⏳ Needs: Add SubscriptionGuard to protected pages
- ⏳ Needs: Integrate with signup flow
- ⏳ Needs: Email notifications (optional)

---

**Last Updated:** May 9, 2026
**Version:** 1.0
