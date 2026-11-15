"""Activities and who did them, for the alumni-path engine.

Follows the path-feature draft in docs/mvp.md. Issue #14 may still add
activity types or source fields in a later migration.

Revision ID: 0005
Revises: 0004
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Something a person did: a club, VIP team, course, lab, internship or job.
    # A path goal is one activity row.
    op.create_table(
        "activity",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("type", sa.Text, nullable=False),
        sa.Column("company", sa.Text, nullable=True),
        sa.Column("role", sa.Text, nullable=True),
        # True for invented development/demo activities.
        sa.Column(
            "is_fixture", sa.Boolean, nullable=False, server_default=sa.false()
        ),
        sa.UniqueConstraint("name", "type", name="uq_activity_name_type"),
        sa.CheckConstraint(
            "type IN ('vip', 'club', 'course', 'lab', 'internship', 'job')",
            name="ck_activity_type",
        ),
    )

    # One row per person and activity. school_year is the year the person first
    # did it: 1 to 4 while enrolled, 5 or more after graduation.
    op.create_table(
        "person_activity",
        sa.Column(
            "person_id",
            sa.Integer,
            sa.ForeignKey(
                "person.id", name="fk_person_activity_person", ondelete="CASCADE"
            ),
            primary_key=True,
        ),
        sa.Column(
            "activity_id",
            sa.Integer,
            sa.ForeignKey(
                "activity.id", name="fk_person_activity_activity", ondelete="CASCADE"
            ),
            primary_key=True,
        ),
        sa.Column("school_year", sa.SmallInteger, nullable=False),
        sa.CheckConstraint(
            "school_year >= 1", name="ck_person_activity_school_year"
        ),
    )
    op.create_index(
        "ix_person_activity_activity_id", "person_activity", ["activity_id"]
    )


def downgrade() -> None:
    op.drop_table("person_activity")
    op.drop_table("activity")
