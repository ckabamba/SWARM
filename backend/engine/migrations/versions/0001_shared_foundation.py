"""Shared foundation: alumni cities, campus places, people, posts.

DRAFT. Covers only the tables that the open resource decision in issue #14 does
not affect. Activity, PersonActivity, Event, Ask, clubs, and resources come in
later migrations. Login/identity (issue #16) is not modeled here; an account
table will reference person once the identity approach is chosen.

Revision ID: 0001
Revises:
Create Date: 2026-11-15
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # A city an alum can choose to share. City-level only, never a live position.
    op.create_table(
        "alumni_city",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        # State or province. Empty string when a country has none, so the
        # uniqueness rule below still applies.
        sa.Column("region", sa.Text, nullable=False, server_default=""),
        sa.Column("country_code", sa.CHAR(2), nullable=False),
        sa.Column("latitude", sa.Double, nullable=False),
        sa.Column("longitude", sa.Double, nullable=False),
        sa.UniqueConstraint(
            "name", "region", "country_code", name="uq_alumni_city_name_region_country"
        ),
        sa.CheckConstraint(
            "latitude BETWEEN -90 AND 90", name="ck_alumni_city_latitude"
        ),
        sa.CheckConstraint(
            "longitude BETWEEN -180 AND 180", name="ck_alumni_city_longitude"
        ),
    )

    # A building or outdoor place on campus. Room numbers belong to the event,
    # not the place.
    op.create_table(
        "campus_place",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("latitude", sa.Double, nullable=False),
        sa.Column("longitude", sa.Double, nullable=False),
        sa.UniqueConstraint("name", name="uq_campus_place_name"),
        sa.CheckConstraint(
            "latitude BETWEEN -90 AND 90", name="ck_campus_place_latitude"
        ),
        sa.CheckConstraint(
            "longitude BETWEEN -180 AND 180", name="ck_campus_place_longitude"
        ),
    )

    # A student or alum profile. Replaces the free-text Person.city in the
    # original draft with a reference to alumni_city.
    op.create_table(
        "person",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("kind", sa.Text, nullable=False),
        sa.Column("major", sa.Text, nullable=True),
        sa.Column("grad_year", sa.SmallInteger, nullable=True),
        sa.Column(
            "city_id",
            sa.Integer,
            sa.ForeignKey(
                "alumni_city.id", name="fk_person_city", ondelete="SET NULL"
            ),
            nullable=True,
        ),
        # The city appears on the map and in city lists only when this is true.
        sa.Column(
            "share_city", sa.Boolean, nullable=False, server_default=sa.false()
        ),
        # Hidden profiles are left out of people lists and counts.
        sa.Column(
            "profile_visible", sa.Boolean, nullable=False, server_default=sa.true()
        ),
        # True for generated development/demo people, false for real users.
        sa.Column(
            "is_fixture", sa.Boolean, nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("kind IN ('student', 'alum')", name="ck_person_kind"),
    )
    op.create_index("ix_person_city_id", "person", ["city_id"])

    # A community post written by a person. Links to clubs, events, and
    # resources are added once those tables exist.
    op.create_table(
        "post",
        sa.Column("id", sa.Integer, sa.Identity(), primary_key=True),
        sa.Column(
            "author_id",
            sa.Integer,
            sa.ForeignKey("person.id", name="fk_post_author", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("length(btrim(body)) > 0", name="ck_post_body_not_blank"),
    )
    op.create_index("ix_post_author_id", "post", ["author_id"])
    op.create_index("ix_post_created_at", "post", ["created_at"])


def downgrade() -> None:
    op.drop_table("post")
    op.drop_table("person")
    op.drop_table("campus_place")
    op.drop_table("alumni_city")
