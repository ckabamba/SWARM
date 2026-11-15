"""Runner/configuration checks without starting a server or connecting to a DB."""
import os
import sys
from unittest.mock import Mock, patch

import pytest
import uvicorn

from backend import manage


@pytest.fixture(autouse=True)
def isolated_environment():
    # Restore even variables written directly by dotenv, not only monkeypatch.
    with patch.dict(os.environ):
        for name in ('DATABASE_URL', 'TEST_DATABASE_URL', 'WARMPATH_HOST', 'PORT'):
            os.environ.pop(name, None)
        yield


def test_root_dotenv_loaded_without_overriding_environment(tmp_path, monkeypatch):
    monkeypatch.setattr(manage, 'ROOT', tmp_path)
    (tmp_path / '.env').write_text(
        'DATABASE_URL=postgresql://local-user:local-only@localhost/local_db\n'
        'TEST_DATABASE_URL=postgres://test-user:test-only@localhost/warmpath_test\n'
        'PORT=8000\n', encoding='utf-8')
    monkeypatch.setenv('DATABASE_URL', 'postgresql://env-user:env-only@db/app_db')
    monkeypatch.setenv('PORT', '9000')
    manage.load_environment()
    assert manage.database_url() == 'postgresql+psycopg://env-user:env-only@db/app_db'
    assert manage.database_url(test=True) == 'postgresql+psycopg://test-user:test-only@localhost/warmpath_test'
    assert manage.server_address() == ('127.0.0.1', 9000)


@pytest.mark.parametrize('prefix', ['postgres://', 'postgresql://', 'postgresql+psycopg://'])
def test_database_url_uses_psycopg3_without_reencoding_credentials(prefix, monkeypatch):
    suffix = 'user:encoded%23password@db.example/app?sslmode=require'
    monkeypatch.setenv('DATABASE_URL', prefix + suffix)
    assert manage.database_url() == 'postgresql+psycopg://' + suffix


def test_test_database_never_falls_back_to_application_database(monkeypatch):
    monkeypatch.setenv('DATABASE_URL', 'postgresql://app:example@shared-db/production')
    monkeypatch.setattr(manage, 'settings', lambda: {'password': 'local-test-only'})
    assert manage.database_url(test=True) == 'postgresql+psycopg://warmpath:local-test-only@127.0.0.1:55432/warmpath_test'
    monkeypatch.setenv('TEST_DATABASE_URL', 'postgres://tester:example@test-db/warmpath_test')
    assert manage.database_url(test=True) == 'postgresql+psycopg://tester:example@test-db/warmpath_test'


def test_local_database_remains_default(monkeypatch):
    monkeypatch.setattr(manage, 'settings', lambda: {'password': 'local-only'})
    assert manage.database_url() == 'postgresql+psycopg://warmpath:local-only@127.0.0.1:55432/warmpath'
    assert manage.server_address() == ('127.0.0.1', 8000)


@pytest.mark.parametrize('host', ['0.0.0.0', '::', '127.0.0.1', 'localhost', 'api.internal'])
def test_configured_bind_address(host, monkeypatch):
    monkeypatch.setenv('WARMPATH_HOST', host)
    monkeypatch.setenv('PORT', '8080')
    assert manage.server_address() == (host, 8080)


@pytest.mark.parametrize('host', ['', 'https://example.com', 'localhost:8000', 'bad host', '-bad', 'x/../y'])
def test_invalid_bind_host_fails_clearly(host, monkeypatch):
    monkeypatch.setenv('WARMPATH_HOST', host)
    with pytest.raises(SystemExit, match='WARMPATH_HOST'):
        manage.server_address()


@pytest.mark.parametrize('port', ['', 'abc', '0', '-1', '65536'])
def test_invalid_port_fails_clearly(port, monkeypatch):
    monkeypatch.setenv('PORT', port)
    with pytest.raises(SystemExit, match='PORT'):
        manage.server_address()


@pytest.mark.parametrize('configured', [False, True])
def test_run_starts_portable_database_only_when_needed(configured, monkeypatch):
    monkeypatch.setattr(sys, 'argv', ['backend.manage', 'run'])
    start = Mock()
    serve = Mock()
    monkeypatch.setattr(manage, 'start', start)
    monkeypatch.setattr(uvicorn, 'run', serve)
    if configured:
        monkeypatch.setenv('DATABASE_URL', 'postgresql://user:example@db/app')
        monkeypatch.setenv('WARMPATH_HOST', '0.0.0.0')
        monkeypatch.setenv('PORT', '8080')
    manage.main()
    assert start.call_count == (0 if configured else 1)
    serve.assert_called_once_with('backend.api.app:app',
        host='0.0.0.0' if configured else '127.0.0.1', port=8080 if configured else 8000)


def test_invalid_server_settings_do_not_start_database(monkeypatch):
    monkeypatch.setattr(sys, 'argv', ['backend.manage', 'run'])
    monkeypatch.setenv('PORT', 'invalid')
    start = Mock()
    monkeypatch.setattr(manage, 'start', start)
    with pytest.raises(SystemExit, match='PORT'):
        manage.main()
    start.assert_not_called()
