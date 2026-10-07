from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

QuestionType = Literal[
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
]
AnswerValue = str | int | float | bool | list[str] | None


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Users ----------


class UserOut(ORMModel):
    id: int
    name: str
    email: str


# ---------- Questions ----------


class ChoiceIn(BaseModel):
    id: str | None = None
    label: str = Field(default="", max_length=500)


class ChoiceOut(ORMModel):
    id: str
    label: str
    position: int


class QuestionIn(BaseModel):
    id: str | None = None
    type: QuestionType
    title: str = ""
    description: str | None = None
    required: bool = False
    properties: dict[str, Any] = Field(default_factory=dict)
    choices: list[ChoiceIn] = Field(default_factory=list)


class QuestionOut(ORMModel):
    id: str
    type: QuestionType
    title: str
    description: str | None
    required: bool
    position: int
    properties: dict[str, Any]
    choices: list[ChoiceOut]


# ---------- Forms ----------


class FormCreate(BaseModel):
    title: str = Field(default="My new form", min_length=1, max_length=255)


class FormPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)


class FormDefinition(BaseModel):
    """Full form document. The builder autosaves by PUT-ing this whole shape."""

    title: str = Field(min_length=1, max_length=255)
    theme: dict[str, Any] = Field(default_factory=dict)
    settings: dict[str, Any] = Field(default_factory=dict)
    questions: list[QuestionIn] = Field(default_factory=list, max_length=200)


class FormListItem(ORMModel):
    id: str
    title: str
    slug: str
    status: str
    theme: dict[str, Any]
    response_count: int
    question_count: int
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None


class FormOut(ORMModel):
    id: str
    title: str
    slug: str
    status: str
    theme: dict[str, Any]
    settings: dict[str, Any]
    questions: list[QuestionOut]
    response_count: int = 0
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None


class PublicFormOut(ORMModel):
    id: str
    title: str
    slug: str
    theme: dict[str, Any]
    settings: dict[str, Any]
    questions: list[QuestionOut]


# ---------- Responses ----------


class SubmissionIn(BaseModel):
    answers: dict[str, AnswerValue]
    started_at: datetime | None = None


class SubmissionOut(BaseModel):
    id: str
    submitted_at: datetime


class FormEventIn(BaseModel):
    type: Literal["view", "start"]


class AnswerOut(BaseModel):
    question_id: str
    text: str | None = None
    number: float | None = None
    boolean: bool | None = None
    choice_ids: list[str] = Field(default_factory=list)
    display: str


class ResponseOut(BaseModel):
    id: str
    started_at: datetime | None
    submitted_at: datetime
    answers: list[AnswerOut]


class ResponseList(BaseModel):
    total: int
    items: list[ResponseOut]


class ChoiceStat(BaseModel):
    id: str | None
    label: str
    count: int
    percent: float


class QuestionSummary(BaseModel):
    question_id: str
    type: QuestionType
    title: str
    answered: int
    skipped: int
    choices: list[ChoiceStat] | None = None
    average: float | None = None
    minimum: float | None = None
    maximum: float | None = None
    latest: list[str] | None = None


class FormSummary(BaseModel):
    views: int
    starts: int
    submissions: int
    completion_rate: float | None
    average_time_seconds: float | None
    questions: list[QuestionSummary]
