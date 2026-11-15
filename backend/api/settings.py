"""Server-side address configuration; browser clients keep using same-origin /api."""
import os
from urllib.parse import urlsplit


def public_origin():
    value = os.environ.get('WARMPATH_PUBLIC_ORIGIN', '').strip().rstrip('/')
    if not value:
        return None
    try:
        parsed = urlsplit(value)
        valid = (parsed.scheme == 'https' and parsed.hostname and not parsed.username
                 and not parsed.password and not parsed.path and not parsed.query
                 and not parsed.fragment and '*' not in parsed.netloc
                 and not any(char.isspace() for char in value))
        # Accessing port validates invalid/non-numeric/out-of-range values.
        port = parsed.port
    except ValueError:
        valid = False
    if not valid:
        raise ValueError('WARMPATH_PUBLIC_ORIGIN must be an HTTPS origin, for example https://app.example.edu (no path or credentials).')
    host = parsed.hostname.lower()
    if ':' in host:
        host = '[' + host + ']'
    return 'https://' + host + (':' + str(port) if port and port != 443 else '')


def allowed_hosts(origin):
    hosts = ['127.0.0.1', 'localhost', 'testserver']
    if origin:
        hosts.append(urlsplit(origin).hostname)
    return hosts
