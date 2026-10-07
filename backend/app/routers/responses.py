from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response as HTTPResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Response, UploadedFile, User
from ..schemas import FormSummary, ResponseList, ResponseOut
from ..services import responses as response_service
from ..services.forms import get_owned_form

router = APIRouter(prefix="/api/forms/{form_id}", tags=["responses"])


@router.get("/responses", response_model=ResponseList)
def list_responses(
    form_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_owned_form(db, form_id, user)
    total = db.scalar(select(func.count(Response.id)).where(Response.form_id == form_id)) or 0
    items = db.scalars(response_service.responses_query(form_id).limit(limit).offset(offset))
    return ResponseList(total=total, items=[response_service.to_response_out(r) for r in items])


@router.get("/responses/{response_id}", response_model=ResponseOut)
def get_response(form_id: str, response_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    get_owned_form(db, form_id, user)
    response = db.scalar(response_service.responses_query(form_id).where(Response.id == response_id))
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
    return response_service.to_response_out(response)


@router.delete("/responses/{response_id}", status_code=204)
def delete_response(
    form_id: str, response_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    get_owned_form(db, form_id, user)
    response = db.scalar(select(Response).where(Response.id == response_id, Response.form_id == form_id))
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
    db.delete(response)
    db.commit()
    return HTTPResponse(status_code=204)


@router.get("/files/{file_id}")
def download_file(form_id: str, file_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Download a respondent's uploaded file (always as an attachment, never rendered inline)."""
    get_owned_form(db, form_id, user)
    upload = db.scalar(select(UploadedFile).where(UploadedFile.id == file_id, UploadedFile.form_id == form_id))
    if not upload:
        raise HTTPException(status_code=404, detail="File not found")
    ascii_name = upload.filename.encode("ascii", "ignore").decode().replace('"', "") or "file"
    return HTTPResponse(
        content=upload.data,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(upload.filename)}",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/summary", response_model=FormSummary)
def get_summary(form_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return response_service.build_summary(db, get_owned_form(db, form_id, user))


@router.get("/responses.csv")
def export_responses(form_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = get_owned_form(db, form_id, user)
    filename = "".join(ch if ch.isalnum() else "_" for ch in form.title)[:60] or "responses"
    return HTTPResponse(
        content=response_service.export_csv(db, form),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
    )
