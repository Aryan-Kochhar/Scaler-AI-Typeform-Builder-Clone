"""Seed the database with a default creator, three forms and sample responses.

Runs automatically on startup when the database is empty (`seed_if_empty`), or
manually with `python -m app.seed --reset`.
"""

import random
import sys
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Answer, Choice, Form, Question, Response, User, utcnow
from .services.forms import DEFAULT_SETTINGS, DEFAULT_THEME, generate_slug
from .services.logic import visited_question_ids

THEMES = {
    "classic": DEFAULT_THEME,
    "midnight": {
        "preset": "midnight",
        "background": "#1C1B3A",
        "question": "#FFFFFF",
        "answer": "#A9C7FF",
        "button": "#A9C7FF",
        "button_text": "#1C1B3A",
        "font": "Montserrat",
    },
    "lavender": {
        "preset": "lavender",
        "background": "#F1EDFF",
        "question": "#2B1B5A",
        "answer": "#6B4EFF",
        "button": "#6B4EFF",
        "button_text": "#FFFFFF",
        "font": "Space Grotesk",
    },
}

FORMS = [
    {
        "title": "Customer Feedback Survey",
        "status": "published",
        "theme": "classic",
        "welcome": {
            "enabled": True,
            "title": "Help us get better 💬",
            "description": "Tell us about your experience. It takes less than 2 minutes.",
            "button_text": "Start",
        },
        "thank_you": {
            "title": "Thanks for the feedback! 🙌",
            "description": "We read every single response.",
        },
        "responses": 14,
        "questions": [
            {"type": "short_text", "title": "What's your name?", "description": "First name is fine.", "required": True},
            {"type": "email", "title": "What's your email address?", "description": "We'll only use it to follow up on your feedback.", "required": True},
            {"type": "multiple_choice", "title": "How did you hear about us?", "choices": ["Search engine", "Friend or colleague", "Social media", "Podcast", "Other"]},
            {"type": "rating", "title": "How would you rate your overall experience?", "required": True, "properties": {"steps": 5, "shape": "star"}},
            # Logic jump demo: "No" skips straight to the open feedback question.
            {"type": "yes_no", "title": "Would you recommend us to a friend?", "jumps": {"no": 7}},
            {"type": "dropdown", "title": "Which plan are you on?", "choices": ["Free", "Basic", "Plus", "Business", "Enterprise"]},
            {"type": "number", "title": "How many people on your team use the product?", "properties": {"min": 1, "max": 10000}},
            {"type": "long_text", "title": "Anything we could do better?", "description": "Be as honest as you like."},
        ],
    },
    {
        "title": "Product Meetup Registration",
        "status": "published",
        "theme": "midnight",
        "welcome": {
            "enabled": True,
            "title": "Product Meetup — Bengaluru",
            "description": "An evening of talks, workshops and good food. Grab your spot!",
            "button_text": "Register",
        },
        "thank_you": {
            "title": "You're on the list! 🎉",
            "description": "Your ticket is on its way to your inbox.",
        },
        "responses": 9,
        "questions": [
            {"type": "short_text", "title": "What's your full name?", "required": True},
            {"type": "email", "title": "Where should we send your ticket?", "required": True},
            {"type": "dropdown", "title": "Which session will you attend?", "required": True, "choices": ["Morning keynote", "Afternoon workshops", "Evening networking"]},
            {"type": "multiple_choice", "title": "Any dietary requirements?", "description": "Choose as many as you like.", "properties": {"allow_multiple": True}, "choices": ["Vegetarian", "Vegan", "Gluten-free", "Nut allergy", "None"]},
            {"type": "number", "title": "How many guests are you bringing?", "properties": {"min": 0, "max": 5}},
            {"type": "yes_no", "title": "Do you need parking?"},
            {"type": "rating", "title": "How excited are you?", "properties": {"steps": 10, "shape": "number"}},
        ],
    },
    {
        "title": "Job Application — Frontend Engineer",
        "status": "draft",
        "theme": "lavender",
        "welcome": {**DEFAULT_SETTINGS["welcome_screen"]},
        "thank_you": {
            "title": "Application received ✅",
            "description": "We'll get back to you within a week.",
        },
        "responses": 0,
        "questions": [
            {"type": "short_text", "title": "Let's start with your name", "required": True},
            {"type": "email", "title": "What's the best email to reach you?", "required": True},
            {"type": "dropdown", "title": "Which role are you applying for?", "choices": ["Frontend Engineer", "Fullstack Engineer", "Design Engineer"]},
            {"type": "number", "title": "Years of professional experience?", "properties": {"min": 0, "max": 50}},
            {"type": "yes_no", "title": "Are you open to working remotely?"},
            {"type": "long_text", "title": "Why do you want to join us?", "required": True},
        ],
    },
]

NAMES = ["Priya", "Arjun", "Meera", "Rohan", "Ananya", "Kabir", "Isha", "Vikram", "Sara", "Dev", "Nisha", "Aditya", "Tara", "Karan"]
FEEDBACK = [
    "The onboarding could be a little shorter.",
    "Love the product, keep it up!",
    "Dark mode please 🙏",
    "Pricing page was confusing at first.",
    "More templates would be great.",
    "Support team was super quick to respond.",
    "",
]


def _fake_answer(rng: random.Random, question: Question, name: str) -> Answer | None:
    props = question.properties or {}
    if not question.required and rng.random() < 0.15:
        return None
    answer = Answer(question_id=question.id)
    if question.type == "short_text":
        answer.value_text = name
    elif question.type == "email":
        answer.value_text = f"{name.lower()}@example.com"
    elif question.type == "long_text":
        text = rng.choice(FEEDBACK)
        if not text:
            return None
        answer.value_text = text
    elif question.type == "number":
        low, high = props.get("min", 0), min(props.get("max", 100), 40)
        answer.value_number = float(rng.randint(low, high))
    elif question.type == "rating":
        steps = props.get("steps", 5)
        answer.value_number = float(rng.choices(range(1, steps + 1), weights=range(1, steps + 1))[0])
    elif question.type == "yes_no":
        answer.value_boolean = rng.random() < 0.75
        answer.value_text = "Yes" if answer.value_boolean else "No"
    else:
        k = rng.randint(1, 2) if props.get("allow_multiple") else 1
        picked = rng.sample(question.choices, k)
        answer.choices = picked
        answer.value_text = ", ".join(c.label for c in picked)
    return answer


def seed(db: Session) -> None:
    rng = random.Random(42)
    user = User(name="Aryan Kochhar", email="creator@example.com")
    db.add(user)
    db.flush()

    now = utcnow()
    for index, spec in enumerate(FORMS):
        form = Form(
            owner=user,
            title=spec["title"],
            slug=generate_slug(db),
            status=spec["status"],
            theme=dict(THEMES[spec["theme"]]),
            settings={"welcome_screen": spec["welcome"], "thank_you_screen": spec["thank_you"]},
            created_at=now - timedelta(days=30 - index),
            updated_at=now - timedelta(days=index, hours=3),
            published_at=now - timedelta(days=28) if spec["status"] == "published" else None,
        )
        for position, q in enumerate(spec["questions"]):
            form.questions.append(
                Question(
                    position=position,
                    type=q["type"],
                    title=q["title"],
                    description=q.get("description"),
                    required=q.get("required", False),
                    properties=q.get("properties", {}),
                    choices=[Choice(position=i, label=label) for i, label in enumerate(q.get("choices", []))],
                )
            )
        db.add(form)
        db.flush()

        # Logic jumps are declared by question position in the spec; resolve them to ids.
        for position, q in enumerate(spec["questions"]):
            if "jumps" in q:
                question = form.questions[position]
                question.properties = {
                    **question.properties,
                    "jumps": {key: form.questions[target].id for key, target in q["jumps"].items()},
                }

        for i in range(spec["responses"]):
            submitted = now - timedelta(days=rng.randint(0, 25), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
            response = Response(
                form_id=form.id,
                submitted_at=submitted,
                started_at=submitted - timedelta(seconds=rng.randint(45, 320)),
                user_agent="seed",
            )
            name = NAMES[i % len(NAMES)]
            answers = [a for a in (_fake_answer(rng, q, name) for q in form.questions) if a]
            # Keep seeded data consistent with logic jumps: drop answers to skipped questions.
            raw = {a.question_id: a.value_boolean if a.value_boolean is not None else [c.id for c in a.choices] for a in answers}
            visited = visited_question_ids(form.questions, raw)
            response.answers = [a for a in answers if a.question_id in visited]
            db.add(response)
        form.start_count = spec["responses"] + rng.randint(2, 6) if spec["responses"] else 0
        form.view_count = form.start_count + rng.randint(5, 15) if spec["responses"] else 0
    db.commit()


def seed_if_empty() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.scalar(select(User.id).limit(1)) is None:
            seed(db)


if __name__ == "__main__":
    if "--reset" in sys.argv:
        Base.metadata.drop_all(bind=engine)
    seed_if_empty()
    print("Database seeded.")
