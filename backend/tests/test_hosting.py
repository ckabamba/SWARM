"""Same-origin hosted access, using only the isolated PostgreSQL test database."""
from http.cookies import SimpleCookie
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from backend.api.profiles import COOKIE
from backend.api.settings import allowed_hosts, public_origin
from backend.tests.test_profiles import app


@pytest.mark.parametrize('value', [
    'http://app.example.test',
    'https://*.example.test',
    'https://user:password@app.example.test',
    'https://app.example.test/thermal',
    'https://app.example.test?backend=other',
    'https://app.example.test#fragment',
    'https://app.example.test:not-a-port',
    'https://app.example.test:99999',
    'https://app example.test',
    'app.example.test',
])
def test_rejects_invalid_public_origin(monkeypatch, value):
    monkeypatch.setenv('WARMPATH_PUBLIC_ORIGIN', value)
    with pytest.raises(ValueError, match='HTTPS origin'):
        public_origin()


def test_local_default_and_origin_normalization(monkeypatch):
    monkeypatch.delenv('WARMPATH_PUBLIC_ORIGIN', raising=False)
    assert public_origin() is None
    assert 'app.example.test' not in allowed_hosts(None)
    monkeypatch.setenv('WARMPATH_PUBLIC_ORIGIN', ' https://App.Example.Test:443/ ')
    assert public_origin() == 'https://app.example.test'
    assert 'app.example.test' in allowed_hosts(public_origin())
    assert '*' not in allowed_hosts(public_origin())


@pytest.fixture
def hosted_app(monkeypatch, request):
    # Request the database fixture only after configuring the application.
    monkeypatch.setenv('WARMPATH_PUBLIC_ORIGIN', 'https://app.example.test')
    return request.getfixturevalue('app')


def assert_private_cookie(response, name):
    cookie = SimpleCookie()
    cookie.load(response.headers['set-cookie'])
    assert cookie[name]['secure']
    assert cookie[name]['httponly']
    assert cookie[name]['samesite'].lower() == 'strict'


def test_hosted_origin_cookies_and_tls_termination(hosted_app):
    # A TLS-terminating proxy can forward HTTP internally. Browser Origin stays
    # HTTPS, and session cookies must still be Secure on the public connection.
    with TestClient(hosted_app, base_url='http://app.example.test') as client:
        assert client.get('/api/health').status_code == 200
        assert client.get('/api/health', headers={'Host': 'unrelated.example.test'}).status_code == 400
        session = client.get('/api/session')
        assert session.status_code == 200
        assert_private_cookie(session, 'warmpath_workspace')
        # Simulate the proxy forwarding the browser cookie from its HTTPS request.
        cookie_header = 'warmpath_workspace=' + session.cookies['warmpath_workspace']
        headers = {'Origin': 'https://app.example.test', 'Cookie': cookie_header}
        assert client.put('/api/saved/3', headers=headers).status_code == 200
        for origin in ('https://unrelated.example.test', 'http://app.example.test', 'null'):
            assert client.put('/api/saved/3', headers={**headers, 'Origin': origin}).status_code == 403
        assert client.delete('/api/saved/3', headers=headers).status_code == 200

        account = client.post('/api/auth/register', headers={'Origin': 'https://app.example.test'}, json={
            'email': str(uuid4()) + '@profiles.test',
            'password': 'test-only-password-123',
            'name': 'Hosted Test Student',
        })
        assert account.status_code == 201, account.text
        assert_private_cookie(account, COOKIE)
        # Browser-side HTTPS uses the Secure cookie normally across requests.
        assert client.get('https://app.example.test/api/me').status_code == 200
        assert client.delete('https://app.example.test/api/me', headers={'Origin': 'https://app.example.test'}).status_code == 200
