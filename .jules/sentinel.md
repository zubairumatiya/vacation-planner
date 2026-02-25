## 2025-02-18 - User Enumeration and Sensitive Data Logging
**Vulnerability:** The `/send-password-reset-link` endpoint returned 400 Bad Request when an email was not found, allowing user enumeration. Additionally, it logged the password reset token to the console in production logs.
**Learning:** Developers often log sensitive data (like tokens) during development and forget to remove it. Error messages also leaked existence of users unnecessarily.
**Prevention:** Remove all console logs of sensitive data before committing. Use consistent success responses for sensitive operations to prevent enumeration.
