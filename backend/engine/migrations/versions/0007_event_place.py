"""Link imported events to campus places.

One row per event says whether its location is a known campus place, online,
or unknown, and holds the room when one was given. The event tables themselves
are unchanged.

Revision ID: 0007
Revises: 0006
"""

from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "event_place",
        sa.Column(
            "event_url",
            sa.Text,
            sa.ForeignKey(
                "api_public_events.url", name="fk_event_place_event", ondelete="CASCADE"
            ),
            primary_key=True,
        ),
        sa.Column("kind", sa.Text, nullable=False),
        sa.Column(
            "place_id",
            sa.Integer,
            sa.ForeignKey(
                "campus_place.id", name="fk_event_place_place", ondelete="CASCADE"
            ),
            nullable=True,
        ),
        # The room or area inside the place, as the listing wrote it.
        sa.Column("room", sa.Text, nullable=True),
        sa.CheckConstraint(
            "kind IN ('campus', 'online', 'unknown')", name="ck_event_place_kind"
        ),
        # A campus event has a place; an online or unknown one has neither a
        # place nor a room.
        sa.CheckConstraint(
            "(kind = 'campus') = (place_id IS NOT NULL)", name="ck_event_place_has_place"
        ),
        sa.CheckConstraint(
            "kind = 'campus' OR room IS NULL", name="ck_event_place_room"
        ),
    )
    op.create_index("ix_event_place_place_id", "event_place", ["place_id"])


def downgrade() -> None:
    op.drop_table("event_place")
