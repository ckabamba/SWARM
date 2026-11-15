"""Attach a local demo login to one existing, explicitly synthetic alumnus."""
import json
import os
import secrets
from uuid import uuid4

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from backend.api.profile_models import Profile
from backend.api.profiles import password_hash
from backend.manage import ROOT, database_url


def main():
    url = database_url()
    if make_url(url).host not in ('localhost','127.0.0.1','::1') or os.getenv('WARMPATH_PUBLIC_ORIGIN'):
        raise SystemExit('Demo accounts are local-only.')
    credentials = ROOT / '.local' / 'alumni-demo-login.json'
    email = 'alumni.demo@example.test'
    engine = create_engine(url)
    with engine.begin() as conn:
        if conn.scalar(text('SELECT count(*) FROM account WHERE email=:email'), {'email':email}):
            raise SystemExit('Demo login already exists; credentials are in .local/alumni-demo-login.json. No changes made.')
        person = conn.execute(text("""SELECT p.id,p.name,p.major,p.grad_year FROM person p
            JOIN person_activity pa ON pa.person_id=p.id JOIN activity a ON a.id=pa.activity_id
            WHERE p.is_fixture AND p.kind='alum' AND p.profile_visible AND a.is_fixture
              AND a.canonical_key LIKE 'synthetic1000:%' AND a.company='NVIDIA'
              AND NOT EXISTS(SELECT 1 FROM account acc WHERE acc.person_id=p.id)
            ORDER BY p.id LIMIT 1""")).mappings().first()
        if person is None:
            raise SystemExit('Load the synthetic1000 demo dataset first.')
        password = secrets.token_urlsafe(18)
        profile = Profile(name=person['name'],major=person['major'],grad_year=person['grad_year'],
                          kind='alum',profile_visible=True).model_dump()
        conn.execute(text('INSERT INTO account(id,person_id,email,password_hash) VALUES(:id,:person,:email,:hash)'),
                     {'id':str(uuid4()),'person':person['id'],'email':email,'hash':password_hash(password)})
        conn.execute(text('INSERT INTO person_profile(person_id,data) VALUES(:person,CAST(:data AS jsonb))'),
                     {'person':person['id'],'data':json.dumps(profile)})
        credentials.parent.mkdir(exist_ok=True)
        credentials.write_text(json.dumps({'email':email,'password':password,'name':person['name']},indent=2)+'\n',encoding='utf-8')
    engine.dispose()
    print('Local synthetic alumni login created. Credentials: .local/alumni-demo-login.json')


if __name__ == '__main__':
    main()
