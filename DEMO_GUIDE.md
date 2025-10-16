# Demo Guide - QuantiEdge CRM with Real Gmail Integration

## Overview
Your CRM is now fully configured to send real emails using your Gmail account (bhatia.pradyprady28@gmail.com).

## What's Been Set Up

### 1. Real Gmail Email Sending
- **Email Account**: bhatia.pradyprady28@gmail.com
- **Method**: Gmail SMTP with App Password
- **Security**: TLS encrypted connection
- All emails will be sent from your actual Gmail account

### 2. Complete Authentication System
- **Sign Up**: New users can create accounts with email/password
- **Sign In**: Existing users can log in with their credentials
- **Google OAuth**: Users can sign in with Google (requires configuration)
- Secure Supabase authentication backend
- User data is properly isolated with Row Level Security

### 3. Key Features Working
- ✅ Sign up / Sign in with email and password
- ✅ Send real emails to customers
- ✅ Email campaigns with personalization (merge tags)
- ✅ Schedule emails for future delivery
- ✅ Track email delivery status
- ✅ Google OAuth login (when configured)
- ✅ Customer management
- ✅ Analytics dashboard

## How to Demo

### Step 1: Create an Account or Sign In
1. Open the application
2. You'll see the login page with multiple options:

   **Option A - Sign Up (New Users):**
   - Click "Don't have an account? Sign up"
   - Enter your business name (optional)
   - Enter your email
   - Create a password (minimum 6 characters)
   - Click "Create Account"
   - You'll be automatically logged in

   **Option B - Sign In (Existing Users):**
   - Enter your email
   - Enter your password
   - Click "Sign In"

   **Option C - Google OAuth (if configured):**
   - Click "Sign in with Google"
   - Note: Requires Google OAuth to be enabled in Supabase dashboard

### Step 2: Check Settings
1. Navigate to Settings → Email Setup
2. You'll see the email service is active with your Gmail account

### Step 3: Add Customers
1. Go to "Customers" page
2. Add some test customers with real email addresses (use your own email for testing)
3. Or import customers via CSV

### Step 4: Send a Test Email Campaign
1. Navigate to "Email Campaigns"
2. Click "New Campaign"
3. Fill in:
   - Campaign name
   - Subject line
   - Email content (you can use merge tags like {{firstName}})
4. Select recipients
5. Choose to send immediately or schedule for later
6. Click "Send Campaign"

### Step 5: Check Your Email
- The email will be sent from bhatia.pradyprady28@gmail.com
- Check the recipient's inbox to see the actual email
- Check your Gmail sent folder to confirm

## Important Notes

### Email Credentials
The system is configured with:
- **Sender Email**: bhatia.pradyprady28@gmail.com
- **App Password**: Securely stored in environment variables

### Testing Tips
1. **Use your own email** as a test recipient to see emails in real-time
2. **Check spam folder** if emails don't appear in inbox
3. **Gmail limits**: Google has daily sending limits (500 emails/day for regular accounts)
4. **Personalization**: Use merge tags like {{firstName}}, {{lastName}}, {{email}}

### Authentication
- **Email/Password Sign Up**: Works immediately - just create a new account!
- **Email/Password Sign In**: For existing users
- **Google OAuth**: Available but requires setup in Supabase dashboard
  - If Google OAuth doesn't work, it needs to be enabled in Supabase
  - Use email/password sign up instead - it works perfectly!

## Troubleshooting

### If emails aren't sending:
1. Check that the app password is correct (no spaces)
2. Verify 2-step verification is enabled on the Gmail account
3. Check Supabase edge function logs

### If Google OAuth doesn't work:
1. You need to enable Google OAuth in Supabase dashboard
2. Add OAuth credentials from Google Cloud Console
3. For now, use email/password authentication

## Demo Flow Suggestion

1. **Start**: Show the login page with Google OAuth option
2. **Sign In**: Use Google OAuth or create an account
3. **Tour**: Quick walkthrough of Dashboard, Customers, Email Campaigns
4. **Settings**: Show the email configuration is active
5. **Action**: Create and send a real email campaign
6. **Result**: Show the email arriving in the recipient's inbox
7. **Analytics**: Show the tracking and delivery status

## Next Steps for Production

To make this production-ready:
1. Enable Google OAuth in Supabase dashboard (Settings → Authentication → Providers)
2. Consider using a dedicated email service for higher limits (SendGrid, Mailgun)
3. Add email templates
4. Implement advanced scheduling features
5. Add A/B testing for campaigns
6. Enhance analytics with open rates and click tracking

---

**Ready to Demo!** The application is fully functional and will send real emails from your Gmail account.
