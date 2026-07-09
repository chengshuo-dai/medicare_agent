"""CORS middleware with fnmatch wildcard support.

Replaces Starlette's CORSMiddleware to support patterns like:
  https://*.vercel.app
  https://*-myproject.vercel.app

Standard exact origins (https://example.com) still work as before.
"""

from __future__ import annotations

import fnmatch

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class WildcardCORSMiddleware(BaseHTTPMiddleware):
    """CORS middleware that supports fnmatch wildcard patterns in allowed origins.

    Usage (replaces CORSMiddleware):
        app.add_middleware(
            WildcardCORSMiddleware,
            allow_origins=["https://example.com", "https://*.vercel.app"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    """

    def __init__(
        self,
        app,
        allow_origins: list[str] | None = None,
        allow_credentials: bool = False,
        allow_methods: list[str] | None = None,
        allow_headers: list[str] | None = None,
        expose_headers: list[str] | None = None,
        max_age: int = 600,
    ) -> None:
        super().__init__(app)
        self.allow_origins = allow_origins or ["*"]
        self.allow_credentials = allow_credentials
        self.allow_methods = allow_methods or ["GET"]
        self.allow_headers = allow_headers or []
        self.expose_headers = expose_headers or []
        self.max_age = max_age

    async def dispatch(self, request: Request, call_next) -> Response:
        origin = request.headers.get("origin")

        # Preflight
        if request.method == "OPTIONS":
            response = Response(status_code=200)
            if origin and self._is_origin_allowed(origin):
                self._set_cors_headers(response, origin)
            return response

        # Normal request
        response = await call_next(request)
        if origin and self._is_origin_allowed(origin):
            self._set_cors_headers(response, origin)
        return response

    def _is_origin_allowed(self, origin: str) -> bool:
        """Check origin against allow list with fnmatch support."""
        for pattern in self.allow_origins:
            if pattern == "*":
                return not self.allow_credentials  # "*" not allowed with credentials
            if fnmatch.fnmatch(origin, pattern):
                return True
        return False

    def _set_cors_headers(self, response: Response, origin: str) -> None:
        response.headers["Access-Control-Allow-Origin"] = origin
        if self.allow_credentials:
            response.headers["Access-Control-Allow-Credentials"] = "true"
        if self.expose_headers:
            response.headers["Access-Control-Expose-Headers"] = ", ".join(self.expose_headers)

        # Preflight headers
        response.headers["Access-Control-Allow-Methods"] = ", ".join(self.allow_methods)
        response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allow_headers)
        if self.max_age:
            response.headers["Access-Control-Max-Age"] = str(self.max_age)
