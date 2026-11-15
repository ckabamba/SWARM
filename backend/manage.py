"""Project-local PostgreSQL and API runner. No AWS or system service required."""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / '.local'
BIN = LOCAL / 'postgresql' / 'pgsql' / 'bin'
DATA = LOCAL / 'pgdata'
CONFIG = LOCAL / 'database.json'


def settings():
    if not CONFIG.exists():
        raise SystemExit('Run python -m backend.manage init first.')
    return json.loads(CONFIG.read_text())


def database_url(test=False):
    override = os.environ.get('TEST_DATABASE_URL' if test else 'DATABASE_URL')
    if override:
        return override
    cfg = settings()
    name = 'warmpath_test' if test else 'warmpath'
    return f"postgresql+psycopg://warmpath:{cfg['password']}@127.0.0.1:55432/{name}"


def pg(name, *args, check=True):
    return subprocess.run([str(BIN / f'{name}.exe'), *map(str, args)], check=check,
                          creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))


def start():
    # pg_ctl status may be unable to inspect a server started by a different
    # Windows token. An authenticated connection is the authoritative check.
    if CONFIG.exists():
        import psycopg
        try:
            with psycopg.connect(host='127.0.0.1', port=55432, user='warmpath',
                                 password=settings()['password'], dbname='postgres', connect_timeout=3):
                return
        except psycopg.OperationalError:
            pass
    if pg('pg_ctl', '-D', DATA, 'status', check=False).returncode:
        pg('pg_ctl', '-D', DATA, '-l', LOCAL / 'postgres.log',
           '-o', '-p 55432 -h 127.0.0.1', '-w', 'start')


def initialize():
    if not (BIN / 'postgres.exe').exists():
        raise SystemExit('Unpack official PostgreSQL Windows binaries under .local/postgresql first.')
    LOCAL.mkdir(exist_ok=True)
    if not CONFIG.exists():
        CONFIG.write_text(json.dumps({'password': secrets.token_urlsafe(32)}))
    if not (DATA / 'PG_VERSION').exists():
        password_file = LOCAL / 'init-password'
        password_file.write_text(settings()['password'], encoding='utf-8')
        try:
            pg('initdb', '-D', DATA, '-U', 'warmpath', '--auth=scram-sha-256',
               f'--pwfile={password_file}', '--encoding=UTF8', '--locale=C')
        finally:
            password_file.unlink(missing_ok=True)
    start()
    import psycopg
    from psycopg import sql
    with psycopg.connect(host='127.0.0.1', port=55432, user='warmpath',
                         password=settings()['password'], dbname='postgres', autocommit=True) as conn:
        for name in ('warmpath', 'warmpath_test'):
            if not conn.execute('SELECT 1 FROM pg_database WHERE datname=%s', (name,)).fetchone():
                conn.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
    print('Local PostgreSQL ready on 127.0.0.1:55432; databases created. Credentials stay in .local/.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['init', 'start', 'stop', 'run', 'migrate'])
    args = parser.parse_args()
    if args.command == 'init':
        initialize()
    elif args.command == 'start':
        start()
    elif args.command == 'stop':
        pg('pg_ctl', '-D', DATA, '-m', 'fast', '-w', 'stop')
    elif args.command == 'migrate':
        from backend.migrate import migrate
        migrate()
        print('Shared schema migrations applied. Existing resource data is preserved.')
    else:
        start()
        import uvicorn
        print('Open http://127.0.0.1:8000/thermal/ — Ctrl+C stops the API. PostgreSQL stays running.')
        uvicorn.run('backend.api.app:app', host='127.0.0.1', port=8000)


if __name__ == '__main__':
    main()
