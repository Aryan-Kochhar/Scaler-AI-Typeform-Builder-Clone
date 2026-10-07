"""Basic logic jumps (branching).

A question may define `properties.jumps = {answer_key: target}` where `answer_key` is a
choice id (single-select multiple choice / dropdown) or "yes"/"no" (yes/no questions),
and `target` is a later question id or "end" (go straight to the thank-you screen).
Only forward jumps are honoured, so a form can never loop.

Mirrored on the client in frontend/src/lib/logic.ts.
"""

from ..models import Question


def jump_key(question: Question, raw) -> str | None:
    if question.type == "yes_no" and isinstance(raw, bool):
        return "yes" if raw else "no"
    if question.type == "dropdown" or (
        question.type == "multiple_choice" and not (question.properties or {}).get("allow_multiple")
    ):
        ids = [raw] if isinstance(raw, str) else raw if isinstance(raw, list) else []
        return ids[0] if len(ids) == 1 and isinstance(ids[0], str) else None
    return None


def visited_question_ids(questions: list[Question], answers: dict) -> set[str]:
    """Ids of the questions a respondent actually sees given their answers."""
    index = {q.id: i for i, q in enumerate(questions)}
    visited: set[str] = set()
    i = 0
    while i < len(questions):
        question = questions[i]
        visited.add(question.id)
        key = jump_key(question, answers.get(question.id))
        target = ((question.properties or {}).get("jumps") or {}).get(key) if key else None
        if target == "end":
            break
        j = index.get(target) if target else None
        i = j if j is not None and j > i else i + 1
    return visited
