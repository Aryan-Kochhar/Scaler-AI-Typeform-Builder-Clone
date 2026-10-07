from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import User


def get_current_user(db: Session = Depends(get_db)) -> User:
    """Auth is simplified for this project: every creator request acts as the
    default seeded creator. Swap this for real session/JWT auth later."""
    user = db.scalar(select(User).order_by(User.id).limit(1))
    if not user:
        raise HTTPException(status_code=500, detail="Default creator missing; run the seed")
    return user
