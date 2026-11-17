from fastapi import APIRouter, Depends, HTTPException, status

from databases.schema.user import UserPayload
from middlewares.auth_middleware import verify_access_token
from services.tuition_forwarding import (
    TuitionForwardingService,
    get_tuition_forwarding_service,
)


tuition_router = APIRouter(prefix="/api/v1", tags=["Tuition Forwarding"])


@tuition_router.get("/tuition/{student_id}")
async def forward_tuition_lookup(
    student_id: str,
    _user_payload: UserPayload = Depends(verify_access_token),
    service: TuitionForwardingService = Depends(get_tuition_forwarding_service),
):
    if not student_id.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Student ID is required",
        )
    return await service.get_tuition_by_student_id(student_id)
