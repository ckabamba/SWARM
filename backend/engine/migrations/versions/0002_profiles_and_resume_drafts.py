"""Owned profiles, local accounts and private expiring resume drafts.

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    # New accounts explicitly create hidden people. Change the default for future
    # inserts without modifying the visibility of existing team data.
    op.alter_column('person', 'profile_visible', server_default=sa.false())
    op.create_table('account',
        sa.Column('id', sa.Text, primary_key=True),
        sa.Column('person_id', sa.Integer, sa.ForeignKey('person.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('email', sa.Text, nullable=False, unique=True),
        sa.Column('password_hash', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table('account_session',
        sa.Column('token_hash', sa.Text, primary_key=True),
        sa.Column('account_id', sa.Text, sa.ForeignKey('account.id', ondelete='CASCADE'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False))
    op.create_index('ix_account_session_account', 'account_session', ['account_id'])
    op.create_table('person_profile',
        sa.Column('person_id', sa.Integer, sa.ForeignKey('person.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('data', JSONB, nullable=False),
        sa.Column('version', sa.Integer, nullable=False, server_default='1'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table('resume_draft',
        sa.Column('id', sa.Text, primary_key=True),
        sa.Column('account_id', sa.Text, sa.ForeignKey('account.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data', JSONB, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False))
    op.create_index('ix_resume_draft_owner', 'resume_draft', ['account_id'])
    op.create_index('ix_resume_draft_expiry', 'resume_draft', ['expires_at'])
    op.create_table('account_rate_limit',
        sa.Column('key', sa.Text, primary_key=True),
        sa.Column('attempts', sa.Integer, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False))


def downgrade():
    for name in ['account_rate_limit', 'resume_draft', 'person_profile', 'account_session', 'account']:
        op.drop_table(name)
    op.alter_column('person', 'profile_visible', server_default=sa.true())
