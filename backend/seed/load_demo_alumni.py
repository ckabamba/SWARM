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
    enrich_courses(conn)
    return people

def enrich_courses(conn):
    """Idempotently add catalog-linked courses to this dataset, preserving people IDs."""
    data=generate()
    rows=conn.execute(text("""SELECT p.id,p.name,p.major,p.grad_year,a.company
        FROM person p JOIN person_activity pa ON pa.person_id=p.id
        JOIN activity a ON a.id=pa.activity_id
        WHERE p.is_fixture AND a.is_fixture AND a.type='job' AND a.canonical_key LIKE :prefix
        ORDER BY p.id"""),{'prefix':PREFIX+'%'}).mappings().all()
    if len(rows)!=len(data['alumni']):
        raise ValueError('Expected the complete synthetic1000 dataset before adding courses.')
    for stored, generated in zip(rows,data['alumni']):
        if any(stored[k]!=generated[k] for k in ('name','major','grad_year','company')):
            raise ValueError('Synthetic identities differ; refusing to relabel existing people.')
    courses={}
    for rid in range(101,109):
        resource=conn.execute(text("SELECT id,name FROM api_resources WHERE id=:id AND kind='Course'"),{'id':rid}).mappings().one()
        key=PREFIX+('7' if rid==104 else 'course:'+str(rid))
        aid=conn.scalar(text('SELECT id FROM activity WHERE canonical_key=:key AND is_fixture'),{'key':key})
        if aid is None:
            aid=conn.scalar(text("INSERT INTO activity(name,type,is_fixture,canonical_key,resource_id) VALUES(:name,'course',true,:key,:rid) RETURNING id"),{'name':resource['name']+' (demo history)','key':key,'rid':rid})
        else:
            conn.execute(text('UPDATE activity SET name=:name,resource_id=:rid WHERE id=:id AND is_fixture'),{'name':resource['name']+' (demo history)','rid':rid,'id':aid})
        courses[rid]=aid
    count=0
    for stored, generated in zip(rows,data['alumni']):
        records=[{'person':stored['id'],'activity':courses[c['resource_id']],'year':c['school_year']} for c in generated['courses']]
        conn.execute(text('INSERT INTO person_activity(person_id,activity_id,school_year) VALUES(:person,:activity,:year) ON CONFLICT(person_id,activity_id) DO UPDATE SET school_year=excluded.school_year'),records)
        count+=len(records)
    return count


if __name__=='__main__':
    url=database_url()
    if make_url(url).host not in ('localhost','127.0.0.1','::1'):
        raise SystemExit('This synthetic loader is local-only.')
    engine=create_engine(url)
    with engine.begin() as conn:
        import sys
        if '--courses-only' in sys.argv:
            print('Synthetic course memberships:',enrich_courses(conn))
        else:
            people=load(conn)
            print(f'Loaded {len(people)} synthetic alumni; existing accounts and records retained.')
    engine.dispose()
