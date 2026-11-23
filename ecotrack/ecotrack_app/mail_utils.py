import smtplib
from email.message import EmailMessage

from flask import current_app


def send_otp_email(to_email, otp):
    """Send the 6-digit OTP using Gmail SMTP or print it in local dev."""
    subject = "EcoTrack email verification OTP"
    body = (
        "Welcome to EcoTrack.\n\n"
        f"Your email verification OTP is: {otp}\n"
        "This OTP expires in 5 minutes.\n\n"
        "If you did not register, please ignore this email."
    )

    username = current_app.config.get("MAIL_USERNAME")
    password = current_app.config.get("MAIL_PASSWORD")

    # Local development fallback: app still works without SMTP credentials.
    if not username or not password:
        current_app.logger.warning("EcoTrack OTP for %s is %s", to_email, otp)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = username
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(current_app.config["MAIL_SERVER"], current_app.config["MAIL_PORT"]) as smtp:
        if current_app.config["MAIL_USE_TLS"]:
            smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(message)
    return True
