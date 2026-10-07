import os
import tempfile
import uuid

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _definition(form, questions):
    return {"title": form["title"], "theme": form["theme"], "settings": form["settings"], "questions": questions}


def test_seeded_forms_listed(client):
    forms = client.get("/api/forms").json()
    assert len(forms) == 3
    assert {f["status"] for f in forms} == {"draft", "published"}
    assert any(f["response_count"] > 0 for f in forms)


def test_builder_round_trip_and_respondent_flow(client):
    form = client.post("/api/forms", json={"title": "Test form"}).json()
    assert form["status"] == "draft"

    q_text, q_choice, q_email = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    c1, c2 = str(uuid.uuid4()), str(uuid.uuid4())
    questions = [
        {"id": q_text, "type": "short_text", "title": "Name?", "required": True},
        {"id": q_choice, "type": "multiple_choice", "title": "Pick", "choices": [{"id": c1, "label": "A"}, {"id": c2, "label": "B"}]},
        {"id": q_email, "type": "email", "title": "Email?"},
    ]
    saved = client.put(f"/api/forms/{form['id']}", json=_definition(form, questions)).json()
    assert [q["id"] for q in saved["questions"]] == [q_text, q_choice, q_email]

    # Reorder keeps ids
    reordered = client.put(f"/api/forms/{form['id']}", json=_definition(form, [questions[1], questions[0], questions[2]])).json()
    assert [q["id"] for q in reordered["questions"]] == [q_choice, q_text, q_email]

    # Not reachable publicly until published
    assert client.get(f"/api/public/forms/{form['slug']}").status_code == 404
    assert client.post(f"/api/forms/{form['id']}/publish").json()["status"] == "published"
    assert client.get(f"/api/public/forms/{form['slug']}").status_code == 200

    # Server-side validation
    bad = client.post(f"/api/public/forms/{form['slug']}/responses", json={"answers": {q_email: "nope"}})
    assert bad.status_code == 422
    errors = bad.json()["detail"]["errors"]
    assert q_text in errors and q_email in errors

    ok = client.post(
        f"/api/public/forms/{form['slug']}/responses",
        json={"answers": {q_text: "Ada", q_choice: [c2], q_email: "ada@example.com"}},
    )
    assert ok.status_code == 201

    responses = client.get(f"/api/forms/{form['id']}/responses").json()
    assert responses["total"] == 1
    summary = client.get(f"/api/forms/{form['id']}/summary").json()
    choice_stats = next(q for q in summary["questions"] if q["question_id"] == q_choice)["choices"]
    assert [c["count"] for c in choice_stats] == [0, 1]

    csv_text = client.get(f"/api/forms/{form['id']}/responses.csv").text
    assert "ada@example.com" in csv_text

    dup = client.post(f"/api/forms/{form['id']}/duplicate").json()
    assert dup["status"] == "draft" and len(dup["questions"]) == 3 and dup["response_count"] == 0

    assert client.delete(f"/api/forms/{form['id']}").status_code == 204
    assert client.get(f"/api/forms/{form['id']}").status_code == 404


def test_logic_jump_skips_required_questions(client):
    form = client.post("/api/forms", json={"title": "Branching"}).json()
    q1, q2, q3 = (str(uuid.uuid4()) for _ in range(3))
    questions = [
        {"id": q1, "type": "yes_no", "title": "Skip ahead?", "required": True, "properties": {"jumps": {"yes": q3}}},
        {"id": q2, "type": "short_text", "title": "Only if no", "required": True},
        {"id": q3, "type": "short_text", "title": "Last", "required": True},
    ]
    client.put(f"/api/forms/{form['id']}", json=_definition(form, questions))
    client.post(f"/api/forms/{form['id']}/publish")
    url = f"/api/public/forms/{form['slug']}/responses"

    # "Yes" jumps over the required q2
    assert client.post(url, json={"answers": {q1: True, q3: "done"}}).status_code == 201
    # "No" follows the default path, so q2 is required
    res = client.post(url, json={"answers": {q1: False, q3: "done"}})
    assert res.status_code == 422 and q2 in res.json()["detail"]["errors"]

    # Duplicating keeps the logic, pointing at the copy's own questions
    dup = client.post(f"/api/forms/{form['id']}/duplicate").json()
    dup_ids = [q["id"] for q in dup["questions"]]
    assert dup["questions"][0]["properties"]["jumps"] == {"yes": dup_ids[2]}


def test_single_choice_rejects_multiple(client):
    form = next(f for f in client.get("/api/forms").json() if f["title"] == "Customer Feedback Survey")
    full = client.get(f"/api/public/forms/{form['slug']}").json()
    choice_q = next(q for q in full["questions"] if q["type"] == "multiple_choice")
    ids = [c["id"] for c in choice_q["choices"][:2]]
    res = client.post(f"/api/public/forms/{form['slug']}/responses", json={"answers": {choice_q["id"]: ids}})
    assert res.status_code == 422
    assert choice_q["id"] in res.json()["detail"]["errors"]
