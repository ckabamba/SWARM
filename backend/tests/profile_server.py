"""Dedicated test DB server for browser checks; synthetic records never enter dev DB."""
from sqlalchemy import create_engine, text
import uvicorn
from backend.manage import database_url
from backend.migrate import migrate
from backend.api.catalog_setup import initialize_catalog
from backend.api.app import create_app

if __name__ == '__main__':
    url = database_url(test=True)
    migrate(url)
    initialize_catalog(url)
    engine = create_engine(url)
    with engine.begin() as conn:
        assert conn.scalar(text('SELECT current_database()')) == 'warmpath_test'
        conn.execute(text('DELETE FROM account_rate_limit'))
    engine.dispose()
    uvicorn.run(create_app(url), host='127.0.0.1', port=8001)
