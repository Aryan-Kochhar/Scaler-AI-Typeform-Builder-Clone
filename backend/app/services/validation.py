"""Server-side answer validation and normalization.

`normalize_answer` turns a raw JSON value from the respondent into the typed column
values stored on `Answer`. Every rule here mirrors the client-side validation in the
respondent UI so a crafted request can't bypass it.
"""

import math
import re
from collections.abc import Callable
from dataclasses import dataclass, field

from ..models import Choice, Question, UploadedFile

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
DEFAULT_MAX_LENGTH = {"short_text": 500, "long_text": 10_000, "email": 255}


class AnswerError(ValueError):
    pass


@dataclass
class NormalizedAnswer:
    value_text: str | None = None
    value_number: float | None = None
    value_boolean: bool | None = None
    choices: list[Choice] = field(default_factory=list)
    file: UploadedFile | None = None


def _is_empty(raw) -> bool:
    return raw is None or (isinstance(raw, str) and not raw.strip()) or (isinstance(raw, list) and not raw)


def _to_number(raw) -> float:
    if isinstance(raw, bool):
        raise AnswerError("Please enter a number")
    if isinstance(raw, (int, float)):
        value = float(raw)
    elif isinstance(raw, str):
        try:
            value = float(raw.strip())
        except ValueError:
            raise AnswerError("Please enter a number") from None
    else:
        raise AnswerError("Please enter a number")
    if math.isnan(value) or math.isinf(value):
        raise AnswerError("Please enter a number")
    return value


def normalize_answer(
    question: Question, raw, find_file: Callable[[str], UploadedFile | None] | None = None
) -> NormalizedAnswer | None:
    """Validate `raw` against `question`. Returns None for a valid empty answer.

    `find_file` resolves an uploaded file id (only needed for file_upload questions).
    """
    if _is_empty(raw):
        if question.required:
            raise AnswerError("Please fill this in")
        return None

    props = question.properties or {}
    qtype = question.type

    if qtype in ("short_text", "long_text", "email"):
        if not isinstance(raw, str):
            raise AnswerError("Please enter text")
        text = raw.strip()
        max_length = props.get("max_length") or DEFAULT_MAX_LENGTH[qtype]
        if len(text) > max_length:
            raise AnswerError(f"Please keep it under {max_length} characters")
        if qtype == "email" and not EMAIL_RE.match(text):
            raise AnswerError("Hmm... that email doesn't look right")
        return NormalizedAnswer(value_text=text)

    if qtype == "number":
        value = _to_number(raw)
        if props.get("min") is not None and value < props["min"]:
            raise AnswerError(f"Number must be at least {props['min']}")
        if props.get("max") is not None and value > props["max"]:
            raise AnswerError(f"Number must be at most {props['max']}")
        return NormalizedAnswer(value_number=value)

    if qtype == "rating":
        steps = int(props.get("steps") or 5)
        value = _to_number(raw)
        if not value.is_integer() or not 1 <= value <= steps:
            raise AnswerError(f"Please choose a rating between 1 and {steps}")
        return NormalizedAnswer(value_number=value)

    if qtype == "yes_no":
        if not isinstance(raw, bool):
            raise AnswerError("Please choose Yes or No")
        return NormalizedAnswer(value_boolean=raw, value_text="Yes" if raw else "No")

    if qtype in ("multiple_choice", "dropdown"):
        ids = [raw] if isinstance(raw, str) else raw
        if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
            raise AnswerError("Please choose an option")
        allow_multiple = qtype == "multiple_choice" and bool(props.get("allow_multiple"))
        if len(ids) > 1 and not allow_multiple:
            raise AnswerError("Please choose only one option")
        by_id = {c.id: c for c in question.choices}
        selected = []
        for choice_id in dict.fromkeys(ids):  # de-duplicate, keep order
            if choice_id not in by_id:
                raise AnswerError("That option doesn't exist")
            selected.append(by_id[choice_id])
        return NormalizedAnswer(value_text=", ".join(c.label for c in selected), choices=selected)

    if qtype == "file_upload":
        upload = find_file(raw) if isinstance(raw, str) and find_file else None
        if upload is None or upload.question_id != question.id:
            raise AnswerError("Please upload your file again")
        return NormalizedAnswer(value_text=upload.filename, file=upload)

    raise AnswerError("Unsupported question type")
