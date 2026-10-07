"""Unauthenticated endpoints used by the public respondent flow (/to/<slug>)."""

from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Answer, Form, Response, UploadedFile, utcnow
from ..schemas import FormEventIn, PublicFormOut, SubmissionIn, SubmissionOut, UploadedFileOut
from ..services.forms import form_query
from ..services.logic import visited_question_ids
from ..services.validation import AnswerError, normalize_answer

router = APIRouter(prefix="/api/public/forms", tags=["public"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def get_published_form(db: Session, slug: str) -> Form:
    form = db.scalar(form_query().where(Form.slug == slug))
    if not form or form.status != "published":
        raise HTTPException(status_code=404, detail="This typeform is not accepting responses")
    return form


@router.get("/{slug}", response_model=PublicFormOut)
def get_public_form(slug: str, db: Session = Depends(get_db)):
    return get_published_form(db, slug)


@router.post("/{slug}/events", status_code=204)
def track_event(slug: str, payload: FormEventIn, db: Session = Depends(get_db)):
    """Lightweight funnel tracking used for the views/starts/completion-rate stats."""
    form = get_published_form(db, slug)
    if payload.type == "view":
        form.view_count += 1
    else:
        form.start_count += 1
    db.commit()


@router.post("/{slug}/questions/{question_id}/files", response_model=UploadedFileOut, status_code=201)
def upload_file(slug: str, question_id: str, file: UploadFile, db: Session = Depends(get_db)):
    """Upload a file for a file_upload question; the returned id is the answer value on submit."""
    form = get_published_form(db, slug)
    if not any(q.id == question_id and q.type == "file_upload" for q in form.questions):
        raise HTTPException(status_code=404, detail="This question doesn't accept files")
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if not data:
        raise HTTPException(status_code=422, detail="That file is empty")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (max 10 MB)")
    upload = UploadedFile(
        form_id=form.id,
        question_id=question_id,
        filename=(file.filename or "file").replace("/", "_").replace("\\", "_")[:255],
        content_type=(file.content_type or "application/octet-stream")[:127],
        size=len(data),
        data=data,
    )
    db.add(upload)
    db.commit()
    return upload


@router.post("/{slug}/responses", response_model=SubmissionOut, status_code=201)
def submit_response(slug: str, payload: SubmissionIn, request: Request, db: Session = Depends(get_db)):
    form = get_published_form(db, slug)
    questions = {q.id: q for q in form.questions}

    unknown = set(payload.answers) - set(questions)
    if unknown:
        raise HTTPException(status_code=422, detail={"message": "Unknown questions in submission"})

    started_at = payload.started_at
    if started_at and started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)

    errors: dict[str, str] = {}
    response = Response(
        form_id=form.id,
        started_at=started_at,
        submitted_at=utcnow(),
        user_agent=(request.headers.get("user-agent") or "")[:500],
    )
    def find_file(file_id: str) -> UploadedFile | None:
        # Must belong to this form and not already be attached to another answer.
        upload = db.scalar(select(UploadedFile).where(UploadedFile.id == file_id, UploadedFile.form_id == form.id))
        if upload is None or db.scalar(select(Answer.id).where(Answer.file_id == file_id)) is not None:
            return None
        return upload

    # Questions skipped by logic jumps are neither validated nor stored.
    visited = visited_question_ids(form.questions, payload.answers)
    for question in form.questions:
        if question.id not in visited:
            continue
        try:
            normalized = normalize_answer(question, payload.answers.get(question.id), find_file)
        except AnswerError as exc:
            errors[question.id] = str(exc)
            continue
        if normalized is not None:
            response.answers.append(
                Answer(
                    question_id=question.id,
                    value_text=normalized.value_text,
                    value_number=normalized.value_number,
                    value_boolean=normalized.value_boolean,
                    choices=normalized.choices,
                    file=normalized.file,
                )
            )

    if errors:
        raise HTTPException(status_code=422, detail={"message": "Some answers are invalid", "errors": errors})

    if response.started_at and response.started_at > response.submitted_at:
        response.started_at = None
    db.add(response)
    db.commit()
    return SubmissionOut(id=response.id, submitted_at=response.submitted_at)
