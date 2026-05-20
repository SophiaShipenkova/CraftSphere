from datetime import datetime

from typing import Literal

from pydantic import BaseModel, Field


class ReviewSummary(BaseModel):
    avg_rating: float | None = None
    count: int = 0


class ReviewOut(BaseModel):
    id: int
    author_name: str
    rating: int
    text: str
    created_at: datetime
    upvotes: int = 0
    downvotes: int = 0
    my_vote: int | None = None
    is_mine: bool = False


class ReviewsListResponse(BaseModel):
    summary: ReviewSummary
    items: list[ReviewOut]


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = ""


class ReviewUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    text: str | None = None


class ReviewVoteIn(BaseModel):
    value: Literal[1, -1]
