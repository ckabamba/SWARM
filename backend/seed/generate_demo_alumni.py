"""Generate synthetic browser-demo alumni; never writes to a database."""
import json
import random
from pathlib import Path
from backend.seed.path_fixtures import _FIRST, _LAST, _MAJORS

COMPANIES = ['NVIDIA','Google','Microsoft','Apple','Amazon','Meta','Intel','AMD','Qualcomm','Cisco','IBM','Salesforce','Adobe','Oracle','Spotify','Uber','Airbnb','Stripe','Bloomberg','Capital One','JPMorgan Chase','Boeing','Lockheed Martin','SpaceX','Tesla']

def generate(seed=20261115):
    rng = random.Random(seed)
    goals = [dict(id=100+i,label='Software engineer at '+company,company=company) for i,company in enumerate(COMPANIES)]
    alumni=[]
    for i in range(1000):
        company_index=i % len(COMPANIES)
        goal=goals[company_index]
        # Deliberately planted demo associations; not factual company preferences.
        preferred=[3,4,7,5,9][company_index % 5]
        did={activity:rng.randint(1,3) for activity in [3,4,7,5,9]
             if rng.random() < (0.85 if activity==preferred else 0.12)}
        alumni.append(dict(id=10000+i,name=rng.choice(_FIRST)+' '+rng.choice(_LAST),
            major=rng.choice(_MAJORS),grad_year=rng.randint(2015,2025),company=goal['company'],
            role='Software engineer',goal_id=goal['id'],goal_year=5,did=did,is_fixture=True))
    rng.shuffle(alumni)
    return dict(is_fixture=True,description='Entirely synthetic demo people and histories. Company affiliations are invented.',seed=seed,goals=goals,alumni=alumni)

if __name__ == '__main__':
    target=Path(__file__).resolve().parents[2]/'frontend/src/shared/demo-alumni.json'
    data=generate()
    target.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print(f"Generated {len(data['alumni'])} synthetic alumni across {len(data['goals'])} companies: {target}")
