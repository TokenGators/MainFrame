# TokenGaters Social Media Auth Storage

This directory contains encrypted credentials for social media scraping.

## Platforms

### X (Twitter) Account
- **Account**: @tokengators
- **Auth Type**: Username/Password + 2FA
- **Required Scopes**: Read media, Read tweets
- **Storage**: `.auth/x_credentials.enc` (encrypt with gpg)

### Instagram Account
- **Account**: @tokengators
- **Auth Type**: Username/Password + 2FA
- **Required Scopes**: Basic Instagram content
- **Storage**: `.auth/ig_credentials.enc`

## Security

Credentials are stored encrypted using GPG with a master key.
Access is restricted via `chmod 700` on this directory.

## Setup Commands

```bash
# Encrypt credentials (run after obtaining tokens)
gpg --encrypt --recipient "tokengaters@example.com" x_credentials.txt
gpg --encrypt --recipient "tokengaters@example.com" ig_credentials.txt

# Decrypt for use
gpg --decrypt x_credentials.enc > temp/x_cred.json
gpg --decrypt ig_credentials.enc > temp/ig_cred.json
```

## Browser Login Test

To test browser login:
1. Run: `openclaw browser open --url https://x.com/login`
2. Run: `openclaw browser open --url https://instagram.com/accounts/login`
3. Authenticate manually or use automated credentials

## Session Security

- Credentials are decrypted only during active scraping
- Temporary files are wiped after use: `shred -u temp/*`
- Sessions expire after 1 hour of inactivity
