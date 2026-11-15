"""Add the listing description to imported public events.

Plain text taken from the public listing, kept for search and for grounding
model answers. backend/api/app.py adds the same column at startup, so the
statement only adds it when it is missing.

Revision ID: 0008
Revises: 0007
"""

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE api_public_events ADD COLUMN IF NOT EXISTS description TEXT")


def downgrade() -> None:
    op.drop_column("api_public_events", "description")
