"""Explicit, idempotent public catalog import; never imports people or history."""
import json
from pathlib import Path

from sqlalchemy import create_engine, func, select, text
from sqlalchemy.dialects.postgresql import insert

from backend.api.resource_tables import resources, jobs, verify_schema
from backend.manage import database_url


def catalog_records():
    directory = Path(__file__).parent
    catalog = json.loads((directory / 'catalog.json').read_text(encoding='utf-8'))
    for row in json.loads((directory / 'curriculum.json').read_text(encoding='utf-8')):
        if row['kind'] == 'Course':
            row.update(url='https://catalog.gatech.edu/coursesaz/cs/',
                source_url='https://catalog.gatech.edu/coursesaz/cs/',
                access='Catalog coverage only. Check prerequisites, restrictions, and term availability in the official catalog and registration system.')
        row['verified_on'] = '2026-11-14'
        catalog.append(row)
    # Courses and VIP teams parsed from official pages by gt_catalog_import.py. The rows are
    # complete (source URL, access note, import date) and never repeat a curated course code.
    catalog.extend(json.loads((directory / 'gt_catalog.json').read_text(encoding='utf-8')))
    examples = json.loads((directory / 'job_examples.json').read_text(encoding='utf-8'))
    for label, records in (('resources', catalog), ('job examples', examples)):
        if len({row['id'] for row in records}) != len(records):
            raise ValueError(f'Duplicate IDs in checked-in {label}; catalog import aborted.')
    return catalog, examples


def load_catalog(conn):
    """Import only versioned public resources/jobs in the caller's transaction."""
    verify_schema(conn)
    conn.execute(text('SELECT pg_advisory_xact_lock(78142026)'))
    catalog, examples = catalog_records()
    for table, records in ((resources, catalog), (jobs, examples)):
        for row in records:
            stmt = insert(table).values(**row)
            conn.execute(stmt.on_conflict_do_update(index_elements=['id'], set_=row))
    return {'resources': len(catalog), 'job_examples': len(examples)}


def initialize_catalog(url=None):
    engine = create_engine(url or database_url(), pool_pre_ping=True)
    try:
        with engine.begin() as conn:
            return load_catalog(conn)
    finally:
        engine.dispose()


def verify_catalog(engine):
    """Fail clearly on first setup instead of silently serving an empty catalog."""
    with engine.connect() as conn:
        if not conn.scalar(select(func.count()).select_from(resources)) or not conn.scalar(select(func.count()).select_from(jobs)):
            raise RuntimeError('Public catalog is not initialized. Run python -m backend.manage init-catalog before starting the API.')


if __name__ == '__main__':
    result = initialize_catalog()
    print(f"Loaded {result['resources']} public resources and {result['job_examples']} job examples. No personal records were imported.")
