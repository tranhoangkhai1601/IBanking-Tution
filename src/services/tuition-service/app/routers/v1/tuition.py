
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from services.tuition_service import TuitionService, get_tuition_service

tuition_router = APIRouter(prefix="/tuition", tags=['Tuition Core'])


@tuition_router.get("/history-details")
async def get_tuition_history_details(
    tuition_ids: list[UUID] = Query(min_length=1, max_length=100),
    service: TuitionService = Depends(get_tuition_service),
):
    return await service.get_tuition_history_details(tuition_ids)


@tuition_router.get("/{student_id}")
async def get_tuition_by_student_id(
    student_id: str,
    service: TuitionService = Depends(get_tuition_service),
):
    tuition_data = await service.get_tuition_by_stdid(student_id)
    if tuition_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student was not found",
        )
    return tuition_data


@tuition_router.get("/{tuition_id}/payment-details")
async def get_tuition_payment_details(
    tuition_id: UUID,
    student_id: str,
    service: TuitionService = Depends(get_tuition_service),
):
    return await service.get_tuition_for_payment(tuition_id, student_id)