"""The Georgia Tech catalog importer: parsing only, no network and no database."""
from datetime import date
import re

import pytest

from backend.api import gt_catalog_import as gt
from backend.api.catalog_setup import catalog_records
from backend.api.history import course_code

VOCABULARY = ['algorithms', 'c++', 'robotics']

COURSES = '''
<div class="sc_sccoursedescs">
<div class="courseblock">
<p class="courseblocktitle"><strong>CS&#160;1100.  Pathways in Computing.  1 Credit Hour.</strong></p>
<p class="courseblockdesc">
Small group discussions. <b>Bold</b> &amp; plain.<br/>
</p>
</div><div class="courseblock">
<p class="courseblocktitle"><strong>CS&#160;1332.  Data Struct &amp; Algorithms.  3 Credit Hours.</strong></p>
<p class="courseblockdesc">Curated elsewhere.</p>
</div><div class="courseblock">
<p class="courseblocktitle"><strong>CS&#160;1XXX.  Computer Sci Elective.  1-21 Credit Hours.</strong></p>
<p class="courseblockdesc"></p>
</div><div class="courseblock">
<p class="courseblocktitle"><strong>CS&#160;3251.  Intro. to Robotics in C++.  1-12 Credit Hours.</strong></p>
<p class="courseblockdesc">Covers algorithms for robotics, written in C++. Not roboticsish.</p>
</div><div class="courseblock">
<p class="courseblocktitle"><strong>CS&#160;4903.  Special Problems.  1-21 Credit Hours.</strong></p>
</div><div class="courseblock">
<p class="courseblocktitle"><strong>CS&#160;6210.  Advanced Operating Systems.  3 Credit Hours.</strong></p>
<p class="courseblockdesc">Graduate course.</p>
</div><div class="courseblock">
<p class="courseblocktitle"><strong>ECE&#160;2020.  Digital System Design.  3 Credit Hours.</strong></p>
<p class="courseblockdesc">Another subject on the same page.</p>
</div>
</div>
'''

TEAMS = '''
<div class="frm_grid_container vip-team-card"
     data-computing-majors="Computer Science"
     data-engineering-majors="Robotics, Mechanical Engineering"
     data-meeting-day="Monday" data-meeting-location="Room 130">
<a class="vip-team-link" href="https://vip.gatech.edu/teams/entry/27420">
<div class="vip-team-info"><h4><p>! NEW TEAM! SonarNav Robotics</p></h4>
<div class="vip-team-description"><p>Develop an autonomous surface vehicle with custom algorithms.</p></div>
<div class="vip-team-search-data" hidden aria-hidden="true"><p>Advisor Jane Example jane@example.test</p></div>
</div></a></div>
<div class="frm_grid_container vip-team-card" data-computing-majors="">
<a class="vip-team-link" href="https://vip.gatech.edu/teams/entry/1321">
<div class="vip-team-info"><h4><p>Graphic Medicine</p></h4>
<div class="vip-team-description"><p>Explore health, storytelling &amp; visual communication.</p></div></div></a></div>
<div class="frm_grid_container vip-team-card"><h4><p>No link or description</p></h4></div>
'''


def test_courses_keep_only_undergraduate_rows_of_the_subject():
    rows = gt.parse_courses(COURSES, 'CS', '2026-11-15', VOCABULARY, skip={'CS1332'})
    assert [row['name'] for row in rows] == ['CS 1100 · Pathways in Computing', 'CS 3251 · Intro. to Robotics in C++', 'CS 4903 · Special Problems']
    first, robotics, undescribed = rows
    assert first['id'] == gt.SUBJECTS['CS'] + 1100 and first['kind'] == 'Course'
    assert first['summary'] == 'Small group discussions. Bold & plain.'
    assert first['topics'] == []
    assert first['url'] == first['source_url'] == 'https://catalog.gatech.edu/coursesaz/cs/'
    assert first['verified_on'] == '2026-11-15' and first['access'].startswith('Catalog coverage only')
    # Whole phrases from the existing vocabulary only: "roboticsish" is not robotics.
    assert robotics['topics'] == ['algorithms', 'c++', 'robotics']
    assert robotics['tags'].startswith('cs 3251 course courses intro robotics c++')
    assert undescribed['summary'] == 'The catalog lists this course without a description.'


def test_vip_teams_use_tile_text_and_never_the_hidden_search_data():
    rows = gt.parse_vip_teams(TEAMS, '2026-11-15', VOCABULARY)
    assert [row['name'] for row in rows] == ['VIP · SonarNav Robotics', 'VIP · Graphic Medicine']
    team = rows[0]
    assert team['id'] == gt.VIP_BASE + 27420 and team['kind'] == 'VIP project'
    assert team['url'] == 'https://vip.gatech.edu/teams/entry/27420' and team['source_url'] == gt.VIP_PAGE
    assert team['summary'] == 'Develop an autonomous surface vehicle with custom algorithms.'
    assert team['topics'] == ['algorithms', 'robotics']
    assert 'mechanical' in team['tags'].split() and 'robotics' in team['tags'].split()
    # No advisor names, email addresses or meeting details.
    assert not any(word in str(team).lower() for word in ('jane', 'example.test', 'monday', 'room 130'))
    assert rows[1]['summary'] == 'Explore health, storytelling & visual communication.'


def test_build_refuses_a_page_that_no_longer_parses():
    with pytest.raises(ValueError, match='layout may have changed'):
        gt.build(fetch=lambda url: '<html>maintenance</html>', today=date(2026, 11, 15))


def test_shorten_prefers_a_sentence_end():
    assert gt.shorten('One. Two.', 50) == 'One. Two.'
    assert gt.shorten('First sentence here. Second sentence goes on and on.', 30) == 'First sentence here.'
    assert gt.shorten('no sentence end anywhere in this long line of words', 20).endswith('…')


def test_checked_in_gt_catalog_is_consistent_with_the_curated_catalog():
    catalog, _ = catalog_records()
    imported = [row for row in catalog if row['id'] >= min(gt.SUBJECTS.values())]
    assert len({row['id'] for row in catalog}) == len(catalog)
    assert {row['kind'] for row in imported} == {'Course', 'VIP project'}
    vocabulary = set(gt.topic_vocabulary())
    for row in imported:
        assert set(row) == {'id', 'name', 'kind', 'summary', 'topics', 'tags', 'url', 'source_url', 'access', 'verified_on'}
        assert row['name'] and row['summary'] and row['access'] and row['tags']
        assert not re.search(r'<[a-z/]|&[a-z]+;|@', row['name'] + row['summary'])
        assert set(row['topics']) <= vocabulary
        assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', row['verified_on'])
        assert row['url'].startswith(('https://catalog.gatech.edu/coursesaz/', 'https://vip.gatech.edu/teams/entry/'))
    # history.py links a course entry only when exactly one catalog course has its code.
    codes = [course_code(row['name']) for row in catalog if row['kind'] == 'Course']
    assert None not in codes and len(set(codes)) == len(codes)
    numbers = [int(code[-4:]) for code in codes]
    assert min(numbers) >= 1000 and max(numbers) <= 4999
