"""SQLAlchemy ORM models.

Entity overview:

    users 1──* forms 1──* questions 1──* question_choices
                 │                │
                 │                └──* answers *──* question_choices  (via answer_choices)
                 └──* responses 1──* answers
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    TypeDecorator,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

QUESTION_TYPES = (
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
)
CHOICE_TYPES = ("multiple_choice", "dropdown")
FORM_STATUSES = ("draft", "published")


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """SQLite drops tz info; store UTC and hand back aware datetimes."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    def process_result_value(self, value, dialect):
        return value.replace(tzinfo=timezone.utc) if value is not None else None


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    forms: Mapped[list["Form"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Form(Base):
    __tablename__ = "forms"
    __table_args__ = (
        CheckConstraint(f"status IN {FORM_STATUSES}", name="ck_forms_status"),
        Index("ix_forms_owner_updated", "owner_id", "updated_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    # Short public identifier used in the shareable link: /to/<slug>
    slug: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    # Design settings (colors, font) – read as a whole, never queried by field.
    theme: Mapped[dict] = mapped_column(JSON, default=dict)
    # Welcome / thank-you screen content.
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    start_count: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    # Bumped explicitly on content changes (not on view/start counter updates).
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    owner: Mapped[User] = relationship(back_populates="forms")
    questions: Mapped[list["Question"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", order_by="Question.position"
    )
    responses: Mapped[list["Response"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", passive_deletes=True
    )


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint(f"type IN {QUESTION_TYPES}", name="ck_questions_type"),
        Index("ix_questions_form_position", "form_id", "position"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    form_id: Mapped[str] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    # Type-specific options, e.g. {"allow_multiple": true}, {"steps": 5, "shape": "star"},
    # {"min": 0, "max": 100}, {"placeholder": "..."}
    properties: Mapped[dict] = mapped_column(JSON, default=dict)

    form: Mapped[Form] = relationship(back_populates="questions")
    choices: Mapped[list["Choice"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="Choice.position"
    )


class Choice(Base):
    __tablename__ = "question_choices"
    __table_args__ = (Index("ix_choices_question_position", "question_id", "position"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(500))

    question: Mapped[Question] = relationship(back_populates="choices")


class Response(Base):
    __tablename__ = "responses"
    __table_args__ = (Index("ix_responses_form_submitted", "form_id", "submitted_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    form_id: Mapped[str] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"))
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    form: Mapped[Form] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(
        back_populates="response", cascade="all, delete-orphan", passive_deletes=True
    )


# Many-to-many: which choices a respondent picked for a choice question.
answer_choices = Table(
    "answer_choices",
    Base.metadata,
    Column("answer_id", ForeignKey("answers.id", ondelete="CASCADE"), primary_key=True),
    Column("choice_id", ForeignKey("question_choices.id", ondelete="CASCADE"), primary_key=True),
)


class Answer(Base):
    """One answer to one question within a response.

    Exactly one typed value column is used depending on the question type:
    text/email -> value_text, number/rating -> value_number, yes_no -> value_boolean,
    choice questions -> answer_choices rows (+ value_text keeps a label snapshot so the
    answer stays readable even if a choice is later edited or removed).
    """

    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("response_id", "question_id", name="uq_answer_response_question"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    response_id: Mapped[str] = mapped_column(ForeignKey("responses.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), index=True)
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_number: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_boolean: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    response: Mapped[Response] = relationship(back_populates="answers")
    question: Mapped[Question] = relationship()
    choices: Mapped[list[Choice]] = relationship(secondary=answer_choices)
