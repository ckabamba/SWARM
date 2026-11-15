"""Store a text embedding for each imported public event.

backend/events/embeddings.py fills this table. The vector is a plain REAL[]
because pgvector is not available in every local setup; similarity is computed
in Python, which is fast enough at the size of the event snapshot. text_hash
records what was embedded, so only new or changed events are embedded again.

Revision ID: 0009
Revises: 0008
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "event_embedding",
        sa.Column(
            "event_url",
            sa.Text,
            sa.ForeignKey("api_public_events.url", name="fk_event_embedding_event", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("model", sa.Text, nullable=False),
        sa.Column("text_hash", sa.CHAR(64), nullable=False),
        sa.Column("vector", postgresql.ARRAY(sa.REAL), nullable=False),
        sa.Column("embedded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("event_embedding")
