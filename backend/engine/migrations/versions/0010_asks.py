"""Participant-owned outreach and idempotent delivery requests."""
from alembic import op
import sqlalchemy as sa

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('ask',
        sa.Column('id', sa.Integer, sa.Identity(), primary_key=True),
        sa.Column('sender_id', sa.Integer, sa.ForeignKey('person.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recipient_id', sa.Integer, sa.ForeignKey('person.id', ondelete='CASCADE'), nullable=False),
        sa.Column('goal_id', sa.Integer, sa.ForeignKey('activity.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('goal_label', sa.Text, nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('status', sa.Text, nullable=False, server_default='sent'),
        sa.Column('request_id', sa.Text, nullable=False),
        sa.Column('request_hash', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('sent','accepted')", name='ck_ask_status'),
        sa.CheckConstraint('sender_id <> recipient_id', name='ck_ask_distinct_participants'),
        sa.CheckConstraint('length(message) BETWEEN 1 AND 2000', name='ck_ask_message_size'),
        sa.UniqueConstraint('sender_id', 'request_id', name='uq_ask_sender_request'))
    op.create_index('ix_ask_recipient_id', 'ask', ['recipient_id', 'id'])
    op.create_index('ix_ask_sender_id', 'ask', ['sender_id', 'id'])


def downgrade():
    op.drop_table('ask')
