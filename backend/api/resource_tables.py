"""API table definitions; schema changes are applied only by Alembic migrations."""
from sqlalchemy import (Column, DateTime, ForeignKey, Integer, MetaData, String, Table, Text, inspect)
from sqlalchemy.dialects.postgresql import ARRAY

metadata = MetaData()
resources = Table('api_resources', metadata,
    Column('id', Integer, primary_key=True), Column('name', Text, nullable=False),
    Column('kind', Text, nullable=False), Column('summary', Text, nullable=False),
    Column('url', Text, nullable=False), Column('source_url', Text, nullable=False),
    Column('access', Text, nullable=False), Column('tags', Text, nullable=False),
    Column('verified_on', String(10), nullable=False),
    Column('topics', ARRAY(Text), nullable=False, server_default='{}'))
jobs = Table('api_job_examples', metadata,
    Column('id', Text, primary_key=True), Column('title', Text, nullable=False),
    Column('employer', Text, nullable=False), Column('summary', Text, nullable=False),
    Column('url', Text, nullable=False), Column('topics', ARRAY(Text), nullable=False),
    Column('context', Text, nullable=False), Column('location', Text, nullable=False),
    Column('verified_on', String(10), nullable=False))
workspaces = Table('api_workspaces', metadata,
    Column('id', String(64), primary_key=True), Column('goal', Text, nullable=False, default=''),
    Column('expires_at', DateTime(timezone=True), nullable=False))
saved = Table('api_saved_resources', metadata,
    Column('workspace_id', ForeignKey('api_workspaces.id', ondelete='CASCADE'), primary_key=True),
    Column('resource_id', ForeignKey('api_resources.id'), primary_key=True))
events = Table('api_public_events', metadata,
    Column('url', Text, primary_key=True), Column('title', Text, nullable=False),
    Column('starts_at', DateTime(timezone=True), nullable=False),
    Column('ends_at', DateTime(timezone=True), nullable=False),
    Column('fetched_at', DateTime(timezone=True), nullable=False),
    Column('source', Text, nullable=False, server_default='gt-calendar'),
    Column('location', Text, nullable=True), Column('organizer', Text, nullable=True))
feeds = Table('api_feeds', metadata, Column('name', Text, primary_key=True),
    Column('fetched_at', DateTime(timezone=True), nullable=False))


def verify_schema(bind):
    """Read-only check with actionable errors; never creates or changes tables."""
    found = inspect(bind)
    for table in metadata.sorted_tables:
        if not found.has_table(table.name):
            raise RuntimeError('Database schema is missing. Run python -m backend.manage migrate before starting the API or importing data.')
        columns = {column['name'] for column in found.get_columns(table.name)}
        if not set(table.columns.keys()) <= columns:
            raise RuntimeError('Database schema is outdated. Run python -m backend.manage migrate before starting the API or importing data.')
