from datetime import datetime, timedelta
import hashlib
from typing import Optional, Tuple
from fastapi import Request
from user_agents import parse
import urllib.request
import json

class SessionService:

    @staticmethod
    def hash_token(token: str) -> str:
        """Genera un hash SHA-256 seguro del refresh token."""
        return hashlib.sha256(token.encode('utf-8')).hexdigest()

    @staticmethod
    def get_client_ip(request: Request) -> str:
        """Obtiene la IP pública real del cliente contemplando proxies/load balancers."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip = forwarded_for.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "127.0.0.1"
        return ip

    @staticmethod
    def parse_user_agent(user_agent_str: Optional[str]) -> str:
        """Convierte el User-Agent bruto en un nombre legible para el usuario."""
        if not user_agent_str:
            return "Dispositivo desconocido"

        ua = parse(user_agent_str)

        # Si viene desde una app móvil personalizada, suele enviar datos en la cabecera
        if ua.is_mobile or ua.is_tablet:
            brand = ua.device.brand or ""
            model = ua.device.model or ""
            os_family = ua.os.family
            
            device_full = f"{brand} {model}".strip()
            if device_full:
                return device_full
            return f"{os_family} Mobile"

        elif ua.is_pc:
            os_name = ua.os.family  # Ej: Windows, Mac OS X, Linux
            browser = ua.browser.family  # Ej: Chrome, Safari, Firefox
            return f"{os_name} - {browser}"

        return "Dispositivo desconocido"

    @classmethod
    def get_location_from_ip(cls, ip: str) -> str:
        """Obtiene Ciudad, País a partir de la IP (Usa un servicio gratuito ip-api.com)."""
        # Ignorar IPs locales
        if ip in ("127.0.0.1", "localhost", "::1") or ip.startswith("192.168.") or ip.startswith("10."):
            return "Localhost (Desarrollo)"

        try:
            # Petición simple sin dependencias externas
            url = f"http://ip-api.com/json/{ip}?fields=status,country,city"
            req = urllib.request.Request(url, headers={'User-Agent': 'FastAPI-SessionService'})
            
            with urllib.request.urlopen(req, timeout=2) as response:
                data = json.loads(response.read().decode())
                if data.get("status") == "success":
                    city = data.get("city", "")
                    country = data.get("country", "")
                    if city and country:
                        return f"{city}, {country}"
                    return country or "Ubicación desconocida"
        except Exception:
            pass  # Si falla el servicio externo, no frena la ejecución

        return "Ubicación desconocida"

    @classmethod
    def create_session_data(
        cls, 
        request: Request, 
        refresh_token: str, 
        expires_days: int = 30
    ) -> dict:
        """
        Método helper listo para usar en tu Endpoint de Login.
        Devuelve un diccionario con todo lo necesario para instanciar el modelo Session de SQLAlchemy.
        """
        user_agent_raw = request.headers.get("User-Agent")
        client_ip = cls.get_client_ip(request)

        return {
            "refresh_token_hash": cls.hash_token(refresh_token),
            "device_name": cls.parse_user_agent(user_agent_raw),
            "ip_address": client_ip,
            "location": cls.get_location_from_ip(client_ip),
            "last_active_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=expires_days)
        }