"""Persistent community post links, optimistic revisions and safe create retries."""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('post', sa.Column('version', sa.Integer, nullable=False, server_default='1'))
    op.add_column('post', sa.Column('link_kind', sa.Text, nullable=True))
    op.add_column('post', sa.Column('link_key', sa.Text, nullable=True))
    op.add_column('post', sa.Column('request_id', sa.Text, nullable=True))
    op.add_column('post', sa.Column('request_hash', sa.Text, nullable=True))
    op.create_unique_constraint('uq_post_author_request', 'post', ['author_id','request_id'])
    op.create_check_constraint('ck_post_link_pair', 'post',
        "(link_kind IS NULL AND link_key IS NULL) OR (link_kind IS NOT NULL AND link_kind IN ('resource','event') AND link_key IS NOT NULL)")


def downgrade():
    op.drop_constraint('ck_post_link_pair','post',type_='check')
    op.drop_constraint('uq_post_author_request','post',type_='unique')
    for name in ['request_hash','request_id','link_key','link_kind','version']:
        op.drop_column('post',name)
