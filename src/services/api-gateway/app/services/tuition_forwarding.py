from urllib.parse import quote

import httpx2
from fastapi import HTTPException, status

from config import config


class TuitionForwardingService:
    async def get_tuition_by_student_id(self, student_id: str) -> dict:
        try:
            async with httpx2.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{config.TUITION_SERVICE_URL.rstrip('/')}/tuition/"
                    f"{quote(student_id, safe='')}"
                )
                response.raise_for_status()
        except httpx2.HTTPStatusError as exc:
            try:
                error_body = exc.response.json()
                detail = (
                    error_body.get("detail", "Tuition lookup failed")
                    if isinstance(error_body, dict)
                    else "Tuition lookup failed"
                )
            except ValueError:
                detail = "Tuition lookup failed"
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=detail,
            ) from exc
        except httpx2.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Tuition service is unavailable",
            ) from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Tuition service returned an invalid response",
            ) from exc
        if not isinstance(data, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Tuition service returned an invalid response",
            )
        return data


def get_tuition_forwarding_service() -> TuitionForwardingService:
    return TuitionForwardingService()
