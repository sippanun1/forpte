# Firebase Cloud Functions Email Setup Guide

This guide explains how to set up Firebase Cloud Functions to send room booking emails using Gmail or SendGrid.

## Why Cloud Functions?

- ✅ No CORS errors (no browser restrictions)
- ✅ Secure (API keys hidden from frontend)
- ✅ Scalable
- ✅ Free tier available (up to 2M invocations/month)

---

## Option 1: Using Gmail (Recommended for Testing)

### Step 1: Enable Gmail Less Secure Apps

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **"Less secure app access"** or use an **App Password** (recommended)
3. **For App Password Method (Better):**
   - Enable 2-Step Verification first
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select Mail and Windows Computer
   - Copy the generated 16-character password

### Step 2: Set Firebase Environment Variables

In your Firebase Console:

1. Go to **Cloud Functions** → Click on a function → **Runtime settings**
2. Add environment variables:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password-or-password
   ```

### Step 3: Install Dependencies

In your `functions` folder:

```bash
cd functions
npm install nodemailer --save
npm install --save-dev @types/nodemailer
```

### Step 4: Deploy Functions

```bash
firebase deploy --only functions
```

---

## Option 2: Using SendGrid

### Step 1: Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for free account
3. Verify your email address

### Step 2: Create API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it "Room Booking App"
4. Give it **Mail Send** permission
5. Copy the API key

### Step 3: Set Firebase Environment Variables

In Firebase Console:

1. Go to **Cloud Functions** → **Runtime settings**
2. Add:
   ```
   SENDGRID_API_KEY=your_api_key_here
   EMAIL_USER=noreply@your-domain.com
   ```

### Step 4: Install Dependencies

```bash
cd functions
npm install @sendgrid/mail --save
```

### Step 5: Update Cloud Function Code

Replace the email transporter in `emailFunctions.ts`:

```typescript
import * as sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '')

// In the function, use:
await sgMail.send({
  to: data.userEmail,
  from: process.env.EMAIL_USER,
  subject: 'Your Subject',
  html: '<html content>'
})
```

### Step 6: Deploy

```bash
firebase deploy --only functions
```

---

## How to Test

### Local Testing with Firebase Emulator

1. Start emulator:
```bash
firebase emulators:start
```

2. Update your frontend to use emulator:
```typescript
import { connectFunctionsEmulator } from 'firebase/functions'

const functions = getFunctions()
if (location.hostname === 'localhost') {
  connectFunctionsEmulator(functions, 'localhost', 5001)
}
```

3. Book a room and check console logs

### Production Testing

1. Deploy: `firebase deploy --only functions`
2. Book a room in your app
3. Check your email inbox (and spam folder)

---

## Troubleshooting

### "Unauthenticated" Error
- Make sure Cloud Functions has **proper CORS headers** (should be automatic)
- Check Firebase Console for function errors

### Emails Not Sending
1. Check Cloud Functions logs in Firebase Console
2. Verify email credentials (Gmail app password or SendGrid API key)
3. Check if function is deployed successfully

### Gmail: "Invalid credentials"
- Use 16-character App Password (not your regular password)
- Enable 2-Step Verification first
- Check email is correct

### SendGrid: "Invalid API key"
- Copy the full API key (no spaces)
- Make sure it has Mail Send permission
- Verify sender email is verified in SendGrid

---

## Security Notes

- ⚠️ Environment variables are hidden from frontend (secure)
- ⚠️ Never expose API keys in client-side code
- ⚠️ Use restricted API keys where possible
- ⚠️ Rotate keys periodically

---

## Next Steps

Future enhancements:
1. Send approval/rejection emails
2. Send equipment borrow reminders
3. Add email scheduling
4. Create custom email templates in SendGrid
