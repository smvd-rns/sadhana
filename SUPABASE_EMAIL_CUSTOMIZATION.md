# Supabase Email Customization Guide

## Changing Email Sender Name for Password Reset

By default, Supabase sends password reset emails with the sender name "Supabase Auth". To customize this to your application name (e.g., "ISKCON Sadhana Platform"), you need to configure Custom SMTP settings.

## Option 1: Custom SMTP (Recommended for Production)

This allows you to:
- Change the sender name (e.g., "ISKCON Sadhana Platform")
- Use your own domain email address (e.g., `noreply@yourdomain.com`)
- Customize email templates
- Better deliverability and branding

### Steps to Configure Custom SMTP:

1. **Access Supabase Dashboard:**
   - Go to your Supabase project: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SMTP Settings:**
   - Go to **Project Settings** (gear icon in sidebar)
   - Click on **Authentication** in the left menu
   - Scroll down to **SMTP Settings** section

3. **Enable Custom SMTP:**
   - Toggle **Enable Custom SMTP** to ON

4. **Configure SMTP Provider:**
   
   You'll need SMTP credentials from an email service provider. Popular options:
   
   **Option A: SendGrid (Recommended)**
   - Sign up at https://sendgrid.com
   - Create an API key with "Mail Send" permissions
   - Use these settings:
     - **Host:** `smtp.sendgrid.net`
     - **Port:** `587` (or `465` for SSL)
     - **Username:** `apikey`
     - **Password:** Your SendGrid API key
     - **Sender Email:** `noreply@yourdomain.com` (verify domain in SendGrid)
     - **Sender Name:** `ISKCON Sadhana Platform` (or your preferred name)

   **Option B: Mailgun**
   - Sign up at https://mailgun.com
   - Get SMTP credentials from dashboard
   - Use provided host, port, username, and password

   **Option C: AWS SES**
   - Set up AWS SES
   - Get SMTP credentials from AWS Console
   - Use provided SMTP settings

   **Option D: Gmail/Google Workspace**
   - For Gmail: Use App Password (not regular password)
   - Settings:
     - **Host:** `smtp.gmail.com`
     - **Port:** `587`
     - **Username:** Your Gmail address
     - **Password:** App Password (generate from Google Account settings)
   - ⚠️ Note: Gmail has sending limits (500 emails/day for free accounts)

5. **Set Sender Details:**
   - **Sender Email:** The email address that will appear as sender
   - **Sender Name:** The display name (e.g., "ISKCON Sadhana Platform")

6. **Save Settings:**
   - Click **Save** at the bottom
   - Supabase will test the connection

7. **Test the Configuration:**
   - Try the "Forgot Password" flow
   - Check that emails come from your custom sender name

## Option 2: Customize Email Templates (Without Custom SMTP)

Even without custom SMTP, you can customize the email content:

1. **Navigate to Email Templates:**
   - Go to **Project Settings** > **Authentication** > **Email Templates**

2. **Customize Templates:**
   - **Reset Password:** Edit the template for password reset emails
   - You can change the subject, body, and styling
   - Note: The sender name will still show "Supabase Auth" unless you use Custom SMTP

3. **Available Variables:**
   - `{{ .ConfirmationURL }}` - Password reset link
   - `{{ .Email }}` - User's email
   - `{{ .Token }}` - Reset token
   - `{{ .TokenHash }}` - Hashed token
   - `{{ .SiteURL }}` - Your site URL

### Example Custom Email Template:

```html
<h2>Reset Your Password</h2>
<p>Hello,</p>
<p>You requested to reset your password for your ISKCON Sadhana Platform account.</p>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>Best regards,<br>ISKCON Sadhana Platform Team</p>
```

## Important Notes:

1. **Domain Verification:**
   - If using a custom domain email, you may need to verify it with your SMTP provider
   - Add SPF, DKIM, and DMARC records to your domain DNS

2. **Email Limits:**
   - Free Supabase tier: Limited emails per month
   - Custom SMTP providers have their own limits
   - Check your provider's pricing and limits

3. **Testing:**
   - Always test password reset emails after configuration
   - Check spam folders if emails don't arrive
   - Verify sender name appears correctly in email clients

4. **Security:**
   - Never commit SMTP credentials to version control
   - Use environment variables if configuring programmatically
   - Rotate API keys regularly

## Quick Setup for SendGrid (Free Tier):

1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Verify your sender email or domain
3. Create API key: Settings > API Keys > Create API Key
4. In Supabase SMTP Settings:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: [Your SendGrid API Key]
   - Sender Email: `noreply@yourdomain.com` (or verified email)
   - Sender Name: `ISKCON Sadhana Platform`

## Troubleshooting:

- **Emails not sending:** Check SMTP credentials, verify sender email/domain
- **Sender name not changing:** Ensure Custom SMTP is enabled and saved
- **Emails going to spam:** Set up SPF/DKIM records for your domain
- **Connection errors:** Check firewall settings, verify port numbers

For more details, see: https://supabase.com/docs/guides/auth/auth-smtp
