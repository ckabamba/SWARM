"""Explicitly load the 1,000 synthetic demo histories into a local database."""
from sqlalchemy import create_engine,text
from sqlalchemy.engine import make_url
from backend.manage import database_url
from backend.seed.generate_demo_alumni import generate

STOP_ROWS = {3:('VIP: Embedded Vision','vip'),4:('VIP: GPU Systems','vip'),7:('CS 3210 Operating Systems','course'),5:('RoboJackets','club'),9:('Computer Architecture Lab','lab')}
PREFIX='synthetic1000:'

def load(conn):
    if conn.scalar(text('SELECT count(*) FROM activity WHERE canonical_key LIKE :prefix'),{'prefix':PREFIX+'%'}):
        raise ValueError('Synthetic1000 dataset already exists; refusing to duplicate it.')
    data=generate(); activities={}; people=[]
    for key,(name,kind) in STOP_ROWS.items():
        activities[key]=conn.scalar(text("INSERT INTO activity(name,type,is_fixture,canonical_key) VALUES(:name,:kind,true,:key) RETURNING id"),{'name':name,'kind':kind,'key':PREFIX+str(key)})
    for goal in data['goals']:
        activities[goal['id']]=conn.scalar(text("INSERT INTO activity(name,type,company,role,is_fixture,canonical_key) VALUES(:name,'job',:company,'Software engineer',true,:key) RETURNING id"),{'name':goal['label'],'company':goal['company'],'key':PREFIX+str(goal['id'])})
    for alum in data['alumni']:
        person=conn.scalar(text("INSERT INTO person(name,kind,major,grad_year,profile_visible,is_fixture) VALUES(:name,'alum',:major,:grad_year,true,true) RETURNING id"),alum)
        people.append(person)
        history={**alum['did'],alum['goal_id']:alum['goal_year']}
        conn.execute(text('INSERT INTO person_activity(person_id,activity_id,school_year) VALUES(:person,:activity,:year)'),[{'person':person,'activity':activities[a],'year':y} for a,y in history.items()])
    return people

if __name__=='__main__':
    url=database_url()
    if make_url(url).host not in ('localhost','127.0.0.1','::1'):
        raise SystemExit('This synthetic loader is local-only.')
    engine=create_engine(url)
    with engine.begin() as conn:
        people=load(conn)
    print(f'Loaded {len(people)} synthetic alumni; existing accounts and records retained.')
    engine.dispose()
