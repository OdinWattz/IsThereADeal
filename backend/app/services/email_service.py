"""
Email alert service – sends price-drop notifications to users.
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings


async def send_price_alert_email(
    to_email: str,
    username: str,
    game_name: str,
    current_price: float,
    target_price: float,
    store_name: str,
    store_url: str,
    header_image: str = "",
):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[Email] Would send alert to {to_email}: {game_name} is now ${current_price:.2f}")
        return

    subject = f"🎮 Prijsalert: {game_name} is nu €{current_price:.2f}!"

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #1a1a2e; color: #eee; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: #16213e; border-radius: 12px; padding: 24px;">
        <h1 style="color: #4ade80;">🎮 Price Drop Alert!</h1>
        {f'<img src="{header_image}" style="width:100%; border-radius:8px; margin-bottom:16px;">' if header_image else ''}
        <h2 style="color: #60a5fa;">{game_name}</h2>
        <p>Hi <strong>{username}</strong>,</p>
        <p>Goed nieuws! De prijs van <strong>{game_name}</strong> is onder je doelprijs gezakt.</p>
        <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #334;">Huidige prijs</td>
            <td style="padding: 8px; border: 1px solid #334; color: #4ade80; font-size: 1.4em;">
              <strong>€{current_price:.2f}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #334;">Jouw doelprijs</td>
            <td style="padding: 8px; border: 1px solid #334;">€{target_price:.2f}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #334;">Winkel</td>
            <td style="padding: 8px; border: 1px solid #334;">{store_name}</td>
          </tr>
        </table>
        <a href="{store_url}"
           style="display:inline-block; background:#4ade80; color:#000; padding:12px 24px;
                  border-radius:8px; text-decoration:none; font-weight:bold; margin-top:8px;">
          Nu kopen
        </a>
        <p style="margin-top: 24px; color: #888; font-size: 0.85em;">
          Je ontvangt dit bericht omdat je een prijsalert hebt ingesteld op IsThereADeal.
        </p>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
        )
        print(f"[Email] Sent price alert to {to_email}")
    except Exception as e:
        print(f"[Email] Failed to send to {to_email}: {e}")
