# Send Email Edge Function

This Supabase Edge Function sends emails using Resend.

## Setup

1. **Install Resend** (if using npm):
   ```bash
   npm install resend
   ```

2. **Get Resend API Key**:
   - Sign up at https://resend.com
   - Create an API key in the dashboard
   - Copy the API key

3. **Set Environment Variable in Supabase**:
   - Go to Supabase Dashboard
   - Navigate to: Project Settings > Edge Functions > Secrets
   - Add secret: `RESEND_API_KEY` with your Resend API key

4. **Deploy the Function**:
   ```bash
   supabase functions deploy send-email
   ```

## Usage

The function accepts POST requests with:
- `to`: Email address to send to
- `subject`: Email subject
- `html`: HTML email content
- `from`: (optional) From address, defaults to "SamFit <noreply@samfit.xyz>"
  
**Note**: Make sure to add and verify `samfit.xyz` at https://resend.com/domains before using this function.

## Alternative: Using Other Email Services

You can modify this function to use:
- **SendGrid**: `npm install @sendgrid/mail`
- **Mailgun**: `npm install mailgun.js`
- **AWS SES**: Use AWS SDK
- **SMTP**: Use `nodemailer`

## Cost

Resend offers:
- Free tier: 3,000 emails/month
- Paid: $20/month for 50,000 emails

