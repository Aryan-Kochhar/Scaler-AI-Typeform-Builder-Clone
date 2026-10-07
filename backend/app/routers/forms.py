from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import CHOICE_TYPES, Form, Question, Response as FormResponse, User, utcnow
from ..schemas import FormCreate, FormDefinition, FormListItem, FormOut, FormPatch, UserOut
from ..services import forms as form_service

router = APIRouter(prefix="/api", tags=["forms"])


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/forms", response_model=list[FormListItem])
def list_forms(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    response_count = (
        select(func.count(FormResponse.id)).where(FormResponse.form_id == Form.id).correlate(Form).scalar_subquery()
    )
    question_count = (
        select(func.count(Question.id)).where(Question.form_id == Form.id).correlate(Form).scalar_subquery()
    )
    rows = db.execute(
        select(Form, response_count, question_count)
        .where(Form.owner_id == user.id)
        .order_by(Form.updated_at.desc())
    ).all()
    return [
        FormListItem(
            id=form.id,
            title=form.title,
            slug=form.slug,
            status=form.status,
            theme=form.theme or {},
            response_count=responses,
            question_count=questions,
            created_at=form.created_at,
            updated_at=form.updated_at,
            published_at=form.published_at,
        )
        for form, responses, questions in rows
    ]


@router.post("/forms", response_model=FormOut, status_code=201)
def create_form(payload: FormCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = form_service.create_form(db, user, payload.title)
    db.commit()
    return form_service.to_form_out(db, form_service.get_owned_form(db, form.id, user))


@router.get("/forms/{form_id}", response_model=FormOut)
def get_form(form_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return form_service.to_form_out(db, form_service.get_owned_form(db, form_id, user))


@router.put("/forms/{form_id}", response_model=FormOut)
def replace_form(
    form_id: str, payload: FormDefinition, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    form = form_service.get_owned_form(db, form_id, user)
    form_service.apply_definition(db, form, payload)
    db.commit()
    return form_service.to_form_out(db, form_service.get_owned_form(db, form_id, user))


@router.patch("/forms/{form_id}", response_model=FormOut)
def patch_form(form_id: str, payload: FormPatch, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = form_service.get_owned_form(db, form_id, user)
    if payload.title is not None:
        form.title = payload.title.strip()
    form.updated_at = utcnow()
    db.commit()
    return form_service.to_form_out(db, form)


@router.delete("/forms/{form_id}", status_code=204)
def delete_form(form_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = form_service.get_owned_form(db, form_id, user)
    db.delete(form)
    db.commit()
    return Response(status_code=204)


@router.post("/forms/{form_id}/duplicate", response_model=FormOut, status_code=201)
def duplicate_form(form_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    copy = form_service.duplicate_form(db, form_service.get_owned_form(db, form_id, user))
    db.commit()
    return form_service.to_form_out(db, form_service.get_owned_form(db, copy.id, user))


@router.post("/forms/{form_id}/publish", response_model=FormOut)
def publish_form(form_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = form_service.get_owned_form(db, form_id, user)
    if not form.questions:
        raise HTTPException(status_code=400, detail="Add at least one question before publishing")
    for q in form.questions:
        if not q.title.strip():
            raise HTTPException(status_code=400, detail=f"Question {q.position + 1} needs a title before publishing")
        if q.type in CHOICE_TYPES and (not q.choices or any(not c.label.strip() for c in q.choices)):
            raise HTTPException(status_code=400, detail=f"Question {q.position + 1} has an empty choice")
    form.status = "published"
    form.published_at = form.updated_at = utcnow()
    db.commit()
    return form_service.to_form_out(db, form)


@router.post("/forms/{form_id}/unpublish", response_model=FormOut)
def unpublish_form(form_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = form_service.get_owned_form(db, form_id, user)
    form.status = "draft"
    form.updated_at = utcnow()
    db.commit()
    return form_service.to_form_out(db, form)
