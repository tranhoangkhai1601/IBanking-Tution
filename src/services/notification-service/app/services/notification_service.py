import smtplib
import ssl
from email.message import EmailMessage

from config import config
from schemas.notification_schema import EmailRequest, PaymentSuccessRequest, OTPRequest
from html import escape
from string import Template
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined

template_dir = Path(__file__).resolve().parents[1] / "templates"
templates = Environment(
    loader=FileSystemLoader(template_dir),
    autoescape=True,
    undefined=StrictUndefined
)

def send_email(request: EmailRequest, html_content: str | None = None) -> None:
    email = EmailMessage()
    email['From'] = config.SMTP_FROM
    email['To'] = request.recipient
    email['Subject'] = request.subject
    email.set_content(request.content)

    
    if html_content is not None:
        email.add_alternative(html_content, subtype="html")

    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout = 10) as smtp:
        smtp.starttls(context=ssl.create_default_context())
        smtp.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
        smtp.send_message(email)

def send_payment_success_email(request: PaymentSuccessRequest) -> None:
    amount = f"{request.amount:,.4f}".rstrip("0").rstrip(".")
    paid_at = request.paid_at.strftime("%d/%m/%Y %H:%M %z")

    template = templates.get_template("notification.html")
    html_content = template.render(
        otp_code=None,
        recipient=request.recipient,
        transaction_id=request.transaction_id,
        tuition_id=request.tuition_id,
        amount=amount,
        paid_at=paid_at,
    )

    email_request = EmailRequest(
        recipient=request.recipient,
        subject="Thanh toán học phí thành công",
        content=(
            f"Mã giao dịch: {request.transaction_id}\n"
            f"Mã học phí: {request.tuition_id}\n"
            f"Số tiền: {amount}\n"
            f"Thời gian thanh toán: {paid_at}"
        ),
    )

    send_email(email_request, html_content)

def send_otp_email(request: OTPRequest) -> None:
    expires_at = request.expires_at.strftime("%d/%m/%Y %H:%M %z")
    template = templates.get_template("notification.html")

    html_content = template.render(
        recipient=request.recipient,
        otp_code=request.otp_code,
        expires_at=expires_at,
    )

    email_request = EmailRequest(
        recipient=request.recipient,
        subject="Verify OTP",
        content=f"Your OTP is {request.otp_code}. Valid until {expires_at}.)",
    )
    send_email(email_request, html_content)