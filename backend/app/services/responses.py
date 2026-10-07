"""Response serialization, per-question summary stats and CSV export."""

import csv
import io
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import Answer, Form, Question, Response
from ..schemas import AnswerOut, ChoiceStat, FormSummary, QuestionSummary, ResponseOut


def _format_number(value: float | None) -> str:
    if value is None:
        return ""
    return str(int(value)) if float(value).is_integer() else str(value)


def answer_display(answer: Answer) -> str:
    if answer.value_boolean is not None:
        return "Yes" if answer.value_boolean else "No"
    if answer.value_number is not None:
        return _format_number(answer.value_number)
    return answer.value_text or ""


def to_answer_out(answer: Answer) -> AnswerOut:
    return AnswerOut(
        question_id=answer.question_id,
        text=answer.value_text,
        number=answer.value_number,
        boolean=answer.value_boolean,
        choice_ids=[c.id for c in answer.choices],
        file_id=answer.file_id,
        display=answer_display(answer),
    )


def to_response_out(response: Response) -> ResponseOut:
    return ResponseOut(
        id=response.id,
        started_at=response.started_at,
        submitted_at=response.submitted_at,
        answers=[to_answer_out(a) for a in response.answers],
    )


def responses_query(form_id: str):
    return (
        select(Response)
        .where(Response.form_id == form_id)
        .options(selectinload(Response.answers).selectinload(Answer.choices))
        .order_by(Response.submitted_at.desc())
    )


def _question_summary(question: Question, answers: list[Answer], total: int) -> QuestionSummary:
    summary = QuestionSummary(
        question_id=question.id,
        type=question.type,
        title=question.title,
        answered=len(answers),
        skipped=total - len(answers),
    )

    def pct(count: int) -> float:
        return round(count * 100 / len(answers), 1) if answers else 0.0

    if question.type in ("multiple_choice", "dropdown"):
        counts = Counter(c.id for a in answers for c in a.choices)
        summary.choices = [
            ChoiceStat(id=c.id, label=c.label, count=counts[c.id], percent=pct(counts[c.id]))
            for c in question.choices
        ]
    elif question.type == "yes_no":
        yes = sum(1 for a in answers if a.value_boolean)
        no = len(answers) - yes
        summary.choices = [
            ChoiceStat(id=None, label="Yes", count=yes, percent=pct(yes)),
            ChoiceStat(id=None, label="No", count=no, percent=pct(no)),
        ]
    elif question.type in ("rating", "number"):
        values = [a.value_number for a in answers if a.value_number is not None]
        if values:
            summary.average = round(sum(values) / len(values), 2)
            summary.minimum = min(values)
            summary.maximum = max(values)
        if question.type == "rating":
            steps = int((question.properties or {}).get("steps") or 5)
            counts = Counter(int(v) for v in values)
            summary.choices = [
                ChoiceStat(id=None, label=str(step), count=counts[step], percent=pct(counts[step]))
                for step in range(1, steps + 1)
            ]
    else:
        summary.latest = [a.value_text for a in answers[:5] if a.value_text]
    return summary


def build_summary(db: Session, form: Form) -> FormSummary:
    responses = list(db.scalars(responses_query(form.id)))
    by_question: dict[str, list[Answer]] = {}
    for response in responses:
        for answer in response.answers:
            by_question.setdefault(answer.question_id, []).append(answer)

    durations = [
        (r.submitted_at - r.started_at).total_seconds()
        for r in responses
        if r.started_at and r.submitted_at and r.submitted_at >= r.started_at
    ]
    starts = max(form.start_count, len(responses))
    views = max(form.view_count, starts)
    return FormSummary(
        views=views,
        starts=starts,
        submissions=len(responses),
        completion_rate=round(len(responses) * 100 / starts, 1) if starts else None,
        average_time_seconds=round(sum(durations) / len(durations)) if durations else None,
        questions=[_question_summary(q, by_question.get(q.id, []), len(responses)) for q in form.questions],
    )


def export_csv(db: Session, form: Form) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Response ID", "Submitted at", *[q.title or "Untitled" for q in form.questions]])
    for response in db.scalars(responses_query(form.id)):
        by_question = {a.question_id: answer_display(a) for a in response.answers}
        writer.writerow(
            [response.id, response.submitted_at.isoformat(), *[by_question.get(q.id, "") for q in form.questions]]
        )
    return buffer.getvalue()
