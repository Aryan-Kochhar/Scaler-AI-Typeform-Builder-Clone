"""Form-level business logic: creation defaults, definition sync, duplication."""

import secrets
import string
import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..models import CHOICE_TYPES, Choice, Form, Question, Response, User, new_id, utcnow
from ..schemas import FormDefinition, FormOut, QuestionIn

SLUG_ALPHABET = string.ascii_letters + string.digits

DEFAULT_THEME = {
    "preset": "classic",
    "background": "#FFFFFF",
    "question": "#191919",
    "answer": "#0445AF",
    "button": "#0445AF",
    "button_text": "#FFFFFF",
    "font": "Karla",
}

DEFAULT_SETTINGS = {
    "welcome_screen": {
        "enabled": False,
        "title": "Hey there 👋",
        "description": "This will only take a minute.",
        "button_text": "Start",
    },
    "thank_you_screen": {
        "title": "Thanks for completing this typeform",
        "description": "Now create your own — it's free, easy, & beautiful.",
    },
}


def generate_slug(db: Session) -> str:
    while True:
        slug = "".join(secrets.choice(SLUG_ALPHABET) for _ in range(8))
        if not db.scalar(select(Form.id).where(Form.slug == slug)):
            return slug


def form_query():
    return select(Form).options(selectinload(Form.questions).selectinload(Question.choices))


def get_owned_form(db: Session, form_id: str, user: User) -> Form:
    form = db.scalar(form_query().where(Form.id == form_id, Form.owner_id == user.id))
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


def response_count(db: Session, form_id: str) -> int:
    return db.scalar(select(func.count(Response.id)).where(Response.form_id == form_id)) or 0


def to_form_out(db: Session, form: Form) -> FormOut:
    out = FormOut.model_validate(form)
    out.response_count = response_count(db, form.id)
    return out


def create_form(db: Session, user: User, title: str) -> Form:
    form = Form(
        owner_id=user.id,
        title=title,
        slug=generate_slug(db),
        status="draft",
        theme=dict(DEFAULT_THEME),
        settings={k: dict(v) for k, v in DEFAULT_SETTINGS.items()},
    )
    db.add(form)
    return form


def _resolve_id(db: Session, model, client_id: str | None, owned: dict) -> str:
    """Accept a client-generated UUID for new rows so the builder never has to
    reconcile temporary ids after an autosave. Reject ids that belong elsewhere."""
    if not client_id:
        return new_id()
    try:
        uuid.UUID(client_id)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid id: {client_id}") from None
    if client_id not in owned and db.get(model, client_id) is not None:
        raise HTTPException(status_code=409, detail=f"Id already in use: {client_id}")
    return client_id


def _sync_choices(db: Session, question: Question, payload: QuestionIn) -> None:
    if payload.type not in CHOICE_TYPES:
        question.choices = []
        return
    existing = {c.id: c for c in question.choices}
    synced = []
    for position, choice_in in enumerate(payload.choices):
        choice = existing.get(choice_in.id) if choice_in.id else None
        if choice is None:
            choice = Choice(id=_resolve_id(db, Choice, choice_in.id, existing))
        choice.label = choice_in.label
        choice.position = position
        synced.append(choice)
    question.choices = synced  # delete-orphan removes anything not in the payload


def apply_definition(db: Session, form: Form, definition: FormDefinition) -> None:
    """Replace the form's content with `definition` (Typeform-style PUT semantics).

    Questions/choices are matched by id: existing ones are updated in place (so their
    answers survive), new ones are inserted, and missing ones are deleted.
    """
    form.title = definition.title
    form.theme = {**DEFAULT_THEME, **definition.theme}
    form.settings = {**DEFAULT_SETTINGS, **definition.settings}

    existing = {q.id: q for q in form.questions}
    seen: set[str] = set()
    synced = []
    for position, q_in in enumerate(definition.questions):
        if q_in.id and q_in.id in seen:
            raise HTTPException(status_code=422, detail=f"Duplicate question id: {q_in.id}")
        question = existing.get(q_in.id) if q_in.id else None
        if question is None:
            question = Question(id=_resolve_id(db, Question, q_in.id, existing))
        seen.add(question.id)
        question.position = position
        question.type = q_in.type
        question.title = q_in.title
        question.description = q_in.description
        question.required = q_in.required
        question.properties = q_in.properties
        _sync_choices(db, question, q_in)
        synced.append(question)
    form.questions = synced
    form.updated_at = utcnow()


def duplicate_form(db: Session, source: Form) -> Form:
    copy = Form(
        owner_id=source.owner_id,
        title=f"{source.title} (copy)"[:255],
        slug=generate_slug(db),
        status="draft",
        theme=dict(source.theme or {}),
        settings=dict(source.settings or {}),
    )
    for q in source.questions:
        copy.questions.append(
            Question(
                position=q.position,
                type=q.type,
                title=q.title,
                description=q.description,
                required=q.required,
                properties=dict(q.properties or {}),
                choices=[Choice(position=c.position, label=c.label) for c in q.choices],
            )
        )
    db.add(copy)
    return copy
