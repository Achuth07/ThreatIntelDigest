# Google OAuth Callback URL Update Instructions

## Current Issue
The Google OAuth callback URL needs to be updated in the Google Cloud Console to match our new consolidated authentication endpoint.

## New Callback URL
```
https://threatfeed.whatcyber.com/api/auth?action=callback
```

## Steps to Update Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Find your OAuth 2.0 Client ID for the web application
5. Click the pencil icon to edit the credentials
6. Under "Authorized redirect URIs", add the new callback URL:
   ```
   https://threatfeed.whatcyber.com/api/auth?action=callback
   ```
7. Click "Save"

## Local Development Callback URL
For local development, you should also add:
```
http://localhost:5001/api/auth?action=callback
```

## Verification
After updating the callback URLs, test the Google Sign-In functionality on your production site at https://threatfeed.whatcyber.com