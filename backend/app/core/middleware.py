"""Custom FastAPI middleware: audit logging and IP whitelist."""
import ipaddress
import time
from typing import List

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

log = structlog.get_logger()

AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_AUDIT_PATHS = {"/health", "/api/docs", "/api/redoc", "/api/openapi.json"}


class AuditMiddleware(BaseHTTPMiddleware):
    """Log every mutating API call with user, path, method, and duration."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        if request.method in AUDIT_METHODS and request.url.path not in SKIP_AUDIT_PATHS:
            user_id = getattr(request.state, "user_id", "anonymous")
            log.info(
                "api.request",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=duration_ms,
                user_id=user_id,
                ip=request.client.host if request.client else "unknown",
            )

        return response


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """Block requests from IPs not in the allowed list/subnets."""

    def __init__(self, app, allowed_ips: List[str]):
        super().__init__(app)
        self._networks = []
        for ip_str in allowed_ips:
            try:
                self._networks.append(ipaddress.ip_network(ip_str, strict=False))
            except ValueError:
                log.warning("ip_whitelist.invalid_entry", entry=ip_str)

    def _is_allowed(self, client_ip: str) -> bool:
        if not self._networks:
            return True
        try:
            addr = ipaddress.ip_address(client_ip)
            return any(addr in net for net in self._networks)
        except ValueError:
            return False

    async def dispatch(self, request: Request, call_next):
        # Always allow health checks
        if request.url.path == "/health":
            return await call_next(request)

        client_ip = request.client.host if request.client else ""
        if not self._is_allowed(client_ip):
            log.warning("ip_whitelist.blocked", ip=client_ip, path=request.url.path)
            return JSONResponse(
                status_code=403,
                content={"message": "Access denied from this IP address."},
            )
        return await call_next(request)
