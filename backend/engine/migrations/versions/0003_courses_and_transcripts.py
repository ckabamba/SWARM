"""Separate owned course rows and transcript drafts; preserve legacy course data."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('person_profile', sa.Column('courses_version', sa.Integer, nullable=False, server_default='1'))
    op.create_table('person_course',
        sa.Column('person_id', sa.Integer, sa.ForeignKey('person.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('id', sa.Text, primary_key=True),
        sa.Column('data', JSONB, nullable=False))
    op.execute("""INSERT INTO person_course(person_id,id,data)
        SELECT person_id, course->>'id', course
        FROM person_profile CROSS JOIN LATERAL jsonb_array_elements(COALESCE(data->'courses','[]'::jsonb)) course""")
    op.execute("UPDATE person_profile SET data=data-'courses'")
    op.create_table('transcript_draft',
        sa.Column('id', sa.Text, primary_key=True),
        sa.Column('account_id', sa.Text, sa.ForeignKey('account.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data', JSONB, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False))
    op.create_index('ix_transcript_draft_owner', 'transcript_draft', ['account_id'])
    op.create_index('ix_transcript_draft_expiry', 'transcript_draft', ['expires_at'])


def downgrade():
    op.execute("""UPDATE person_profile p SET data=jsonb_set(p.data,'{courses}',
        COALESCE((SELECT jsonb_agg(c.data ORDER BY c.id) FROM person_course c WHERE c.person_id=p.person_id),'[]'::jsonb))""")
    op.drop_table('transcript_draft')
    op.drop_table('person_course')
    op.drop_column('person_profile', 'courses_version')
