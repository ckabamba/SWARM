"""Bring the API's resource, job, workspace and public-event tables under migrations.

Until now backend/api/app.py created these six tables itself at startup, so a
database that the API had never run against did not have them. The definitions
here mirror that file. Databases where the API already created the tables keep
them and their rows: every statement only adds what is missing.

Revision ID: 0006
Revises: 0005
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "api_resources",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("kind", sa.Text, nullable=False),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("source_url", sa.Text, nullable=False),
        sa.Column("access", sa.Text, nullable=False),
        sa.Column("tags", sa.Text, nullable=False),
        sa.Column("verified_on", sa.String(10), nullable=False),
        sa.Column("topics", ARRAY(sa.Text), nullable=False, server_default="{}"),
        if_not_exists=True,
    )
    op.create_table(
        "api_job_examples",
        sa.Column("id", sa.Text, primary_key=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("employer", sa.Text, nullable=False),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("topics", ARRAY(sa.Text), nullable=False),
        sa.Column("context", sa.Text, nullable=False),
        sa.Column("location", sa.Text, nullable=False),
        sa.Column("verified_on", sa.String(10), nullable=False),
        if_not_exists=True,
    )
    op.create_table(
        "api_workspaces",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("goal", sa.Text, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        if_not_exists=True,
    )
    op.create_table(
        "api_saved_resources",
        sa.Column(
            "workspace_id",
            sa.String(64),
            sa.ForeignKey("api_workspaces.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "resource_id",
            sa.Integer,
            sa.ForeignKey("api_resources.id"),
            primary_key=True,
        ),
        if_not_exists=True,
    )
    op.create_table(
        "api_public_events",
        sa.Column("url", sa.Text, primary_key=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.Text, nullable=False, server_default="gt-calendar"),
        sa.Column("location", sa.Text, nullable=True),
        sa.Column("organizer", sa.Text, nullable=True),
        if_not_exists=True,
    )
    op.create_table(
        "api_feeds",
        sa.Column("name", sa.Text, primary_key=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        if_not_exists=True,
    )

    # Tables created by an early version of the API may lack these columns. The
    # API adds them at startup; do the same here so a migrated database does
    # not depend on the API having run.
    op.execute(
        "ALTER TABLE api_public_events "
        "ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'gt-calendar'"
    )
    op.execute("ALTER TABLE api_public_events ADD COLUMN IF NOT EXISTS location TEXT")
    op.execute("ALTER TABLE api_public_events ADD COLUMN IF NOT EXISTS organizer TEXT")
    op.execute(
        "ALTER TABLE api_resources "
        "ADD COLUMN IF NOT EXISTS topics TEXT[] NOT NULL DEFAULT '{}'"
    )


def downgrade() -> None:
    # Dropping these removes the catalog, saved resources and event snapshots.
    # The catalog and job examples reload from the repo when the API starts.
    for name in (
        "api_feeds",
        "api_public_events",
        "api_saved_resources",
        "api_workspaces",
        "api_job_examples",
        "api_resources",
    ):
        op.drop_table(name)
