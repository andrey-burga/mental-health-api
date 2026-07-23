from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from typing import List

conf = ConnectionConfig(
    MAIL_USERNAME="jhonyandreyburga@gmail.com",
    # Recuerda usar una "Contraseña de aplicación" de Google aquí, no tu contraseña normal
    MAIL_PASSWORD="bnpi uqvo twwb atkz",
    MAIL_FROM="jhonyandreyburga@gmail.com",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_FROM_NAME="Recuperación de contraseña",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
)

async def send_reset_email(email: EmailStr, reset_link: str):
    # Definimos una plantilla HTML elegante y responsiva
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecer Contraseña</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f6f9;
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                border: 1px solid #eef2f5;
            }}
            .header {{
                background-color: #4F46E5; /* Un azul/violeta moderno */
                padding: 30px;
                text-align: center;
                color: #ffffff;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                letter-spacing: -0.5px;
            }}
            .content {{
                padding: 40px 30px;
                color: #334155;
                line-height: 1.6;
            }}
            .content p {{
                margin: 0 0 20px;
                font-size: 16px;
            }}
            .btn-container {{
                text-align: center;
                margin: 30px 0;
            }}
            .btn {{
                background-color: #4F46E5;
                color: #ffffff !important;
                text-decoration: none;
                padding: 14px 28px;
                font-weight: bold;
                border-radius: 6px;
                display: inline-block;
                box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
                transition: background-color 0.2s;
            }}
            .footer {{
                background-color: #f8fafc;
                padding: 20px;
                text-align: center;
                font-size: 13px;
                color: #64748B;
                border-top: 1px solid #e2e8f0;
            }}
            .footer a {{
                color: #4F46E5;
                text-decoration: none;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Restablecer Contraseña</h1>
            </div>
            <div class="content">
                <p>Hola,</p>
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. No te preocupes, puedes volver a ingresar haciendo clic en el botón de abajo:</p>
                
                <div class="btn-container">
                    <a href="{reset_link}" class="btn" target="_blank">Restablecer mi contraseña</a>
                </div>
                
                <p>Si no solicitaste este cambio o si fue un error, simplemente puedes ignorar este correo de manera segura. Tu contraseña seguirá siendo la misma.</p>
                <p>Saludos,<br><strong>El equipo de soporte</strong></p>
            </div>
            <div class="footer">
                <p>¿Tienes problemas con el botón? Copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all;"><a href="{reset_link}">{reset_link}</a></p>
            </div>
        </div>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="Restablecer contraseña",
        recipients=[email],
        body=html_content,
        subtype="html" # <--- Cambiado a HTML
    )

    fm = FastMail(conf)
    await fm.send_message(message)