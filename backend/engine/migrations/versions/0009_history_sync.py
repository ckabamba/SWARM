"""Reviewed source entries and private/public first-occurrence path projections."""
from alembic import op
import sqlalchemy as sa

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('activity', sa.Column('canonical_key', sa.Text, nullable=True))
    op.create_unique_constraint('uq_activity_canonical_key', 'activity', ['canonical_key'])
    op.add_column('activity', sa.Column('resource_id', sa.Integer, sa.ForeignKey('api_resources.id'), nullable=True))
    op.add_column('person_activity', sa.Column('history_managed', sa.Boolean, nullable=False, server_default=sa.false()))
    op.add_column('person_activity', sa.Column('public_school_year', sa.SmallInteger, nullable=True))
    op.create_check_constraint('ck_person_activity_public_year', 'person_activity', 'public_school_year IS NULL OR public_school_year >= 1')
    op.create_table('activity_contribution',
        sa.Column('person_id', sa.Integer, sa.ForeignKey('person.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('source_kind', sa.Text, primary_key=True),
        sa.Column('source_entry_id', sa.Text, primary_key=True),
        sa.Column('activity_id', sa.Integer, sa.ForeignKey('activity.id'), nullable=False),
        sa.Column('school_year', sa.SmallInteger, nullable=False),
        sa.Column('shared', sa.Boolean, nullable=False),
        sa.Column('source', sa.Text, nullable=False),
        sa.CheckConstraint("source_kind IN ('course','experience')", name='ck_contribution_kind'),
        sa.CheckConstraint('school_year BETWEEN 1 AND 80', name='ck_contribution_year'))
    op.create_index('ix_contribution_activity', 'activity_contribution', ['activity_id'])


def downgrade():
    op.drop_table('activity_contribution')
    op.drop_constraint('ck_person_activity_public_year', 'person_activity', type_='check')
    op.drop_column('person_activity', 'public_school_year')
    op.drop_column('person_activity', 'history_managed')
    op.drop_column('activity', 'resource_id')
    op.drop_constraint('uq_activity_canonical_key', 'activity', type_='unique')
    op.drop_column('activity', 'canonical_key')
