# QuantiEdge CRM - Email Campaign Manager

A full-featured CRM and email campaign management system with OAuth authentication support for Gmail and Outlook.

## Features

- **User Authentication**: Sign up/login with email/password or OAuth (Gmail/Outlook)
- **Customer Management**: Add, edit, and organize customer contacts
- **Email Campaigns**: Create and send personalized email campaigns
- **Analytics Dashboard**: Track campaign performance and customer insights
- **OAuth Email Sending**: Send emails directly from user's Gmail or Outlook account
- **Secure Data Storage**: All data stored securely in Supabase with Row Level Security

## Quick Start

### 1. Sign Up

1. Open the application
2. Click "Don't have an account? Sign up"
3. Enter your email and password
4. Click "Sign up"
5. You'll be automatically logged in

### 2. Sign In (Existing Users)

**Email/Password:**
1. Enter your email and password
2. Click "Sign in"

**OAuth (Gmail/Outlook):**
1. Click "Sign in with Google" or "Sign in with Microsoft"
2. Authorize the application
3. You'll be redirected back and logged in

### 3. Using the Application

#### Dashboard
- View key metrics and statistics
- See customer distribution by class type
- Track monthly performance
- View recent activities

#### Customers
- View all your customers
- Add new customers manually
- Search and filter customers
- Edit or delete customer information
- Import customers from CSV

#### Email Campaigns
- Create new campaigns
- Compose personalized emails with template variables:
  - `{{firstName}}` - Customer's first name
  - `{{lastName}}` - Customer's last name
  - `{{email}}` - Customer's email
- Select recipients
- Preview emails before sending
- Send immediately or schedule for later

#### Settings
- Update business information
- Configure email settings
- Manage notification preferences
- Security settings

## Email Sending

### Method 1: OAuth (Recommended)

**For Gmail:**
1. Sign in with "Sign in with Google"
2. Your emails will be sent from your Gmail account
3. Gmail API handles all sending

**For Outlook:**
1. Sign in with "Sign in with Microsoft"
2. Your emails will be sent from your Outlook account
3. Microsoft Graph API handles all sending

**Note**: OAuth must be configured in Supabase Dashboard. See `OAUTH_SETUP.md` for detailed instructions.

### Method 2: Email Client

1. Compose your email
2. Click "Email Client" button
3. Your default email client will open with pre-filled content
4. Send from your email client

### Method 3: Preview & Copy

1. Compose your email
2. Click "Open Draft" to see a formatted preview
3. Copy content or print for reference

## Technical Details

### Built With

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with OAuth support
- **Email Sending**: Gmail API / Microsoft Graph API via Edge Functions

### Architecture

```
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React contexts (Auth, Customers)
│   ├── pages/           # Page components
│   ├── lib/             # Supabase client configuration
│   └── App.tsx          # Main application entry
├── supabase/
│   ├── migrations/      # Database migrations
│   └── functions/       # Edge Functions
└── .env                 # Environment variables
```

### Database Tables

- `user_oauth_credentials`: Stores OAuth tokens (encrypted)
- `email_campaigns`: Campaign data
- `contacts`: Customer information
- `contact_lists`: Customer lists/segments
- `campaign_recipients`: Email delivery tracking

### Security Features

- Row Level Security (RLS) on all tables
- User data isolation
- Encrypted OAuth token storage
- Secure API endpoints
- Protected routes

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Environment Variables

Required environment variables (in `.env`):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## OAuth Setup

To enable Gmail and Outlook OAuth:

1. See `OAUTH_SETUP.md` for detailed configuration instructions
2. Configure Google Cloud Console for Gmail API
3. Configure Azure Portal for Microsoft Graph API
4. Add credentials to Supabase Dashboard

## Troubleshooting

### Cannot send emails
- Ensure you're signed in with OAuth (Google/Microsoft)
- Check that OAuth is configured in Supabase
- Verify your OAuth credentials are saved (check browser console)

### Login fails
- Ensure you've created an account first
- Check your email and password
- Try the "Sign up" option if you're a new user

### No customers showing
- Import customers from CSV
- Add customers manually from the Customers page
- Sample data is loaded by default

## Support

For issues or questions, check:
- `OAUTH_SETUP.md` for OAuth configuration
- Browser console for error messages
- Supabase Dashboard for database issues

## License

MIT
