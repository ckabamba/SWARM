"""Rebuild backend/api/gt_catalog.json from public Georgia Tech pages. Operator command.

    python -m backend.api.gt_catalog_import

Sources, read once each per run:
- the official course catalog's subject pages (catalog.gatech.edu/coursesaz/<subject>/) for
  SUBJECTS, undergraduate numbers 1000-4999 only;
- the Vertically Integrated Projects team list (vip.gatech.edu/teams/), tile text only.

The output is a checked-in file that catalog_setup.py loads with the curated catalog, so the
API and `init-catalog` never fetch anything. Every row keeps its source URL and the date of
this import. Descriptions are the publishers' text: treat them as data, render them as text.

Not imported: the VIP page's hidden search text (it can name people), team images, meeting
times and application details, credit hours, prerequisites, and any course already curated in
curriculum.json. A catalog listing is not evidence that a course is offered this term, and
nothing here says an alum took it.
"""
from datetime import date
import html
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen

DIRECTORY = Path(__file__).parent
OUTPUT = DIRECTORY / 'gt_catalog.json'
SUBJECTS = {'CS': 1_010_000, 'ECE': 1_020_000}      # subject -> first resource ID of its block
VIP_BASE = 2_000_000                                 # plus the team's entry number on vip.gatech.edu
COURSE_PAGE = 'https://catalog.gatech.edu/coursesaz/{}/'
VIP_PAGE = 'https://vip.gatech.edu/teams/'
COURSE_ACCESS = ('Catalog coverage only. Check prerequisites, restrictions, and term availability '
                 'in the official catalog and registration system.')
VIP_ACCESS = ('Team openings, eligible majors and meeting times change each term. '
              'Confirm current details and apply through the VIP program.')
STOP_WORDS = set('''a an and are as at be by can course courses for from in into is it its of on or other that the their
    these this through to use used using via will with within students student team teams topics topic including include
    includes such may also more not one two three new introduction introductory special study studies credit hours hour'''.split())


def clean(markup):
    """Markup as one line of plain text."""
    text = re.sub(r'(?is)<(script|style)\b.*?</\1\s*>', ' ', markup or '')
    text = html.unescape(re.sub(r'<[^>]*>', ' ', text)).replace('\xa0', ' ')
    return re.sub(r'\s+', ' ', text).strip()


def shorten(text, limit):
    """Cut at a sentence end when one falls in the second half, otherwise at a word."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    stop = max(cut.rfind('. '), cut.rfind('? '), cut.rfind('! '))
    if stop >= limit // 2:
        return cut[:stop + 1]
    return cut[:cut.rfind(' ')].rstrip(',;:') + '…'


def keywords(*texts, limit=40):
    """Lower-case search words in first-seen order, without filler words."""
    seen = []
    for word in re.findall(r'[a-z][a-z0-9+#-]*', ' '.join(texts).lower()):
        word = word.strip('-')
        if len(word) > 2 and word not in STOP_WORDS and word not in seen:
            seen.append(word)
    return seen[:limit]


def topic_vocabulary():
    """Topics the curated courses and job examples already use; the importer invents none."""
    words = set()
    for name in ('curriculum.json', 'job_examples.json'):
        for row in json.loads((DIRECTORY / name).read_text(encoding='utf-8')):
            words.update(row.get('topics', []))
    return sorted(words)


def topics_in(text, vocabulary):
    """Vocabulary topics that appear as whole phrases in a published description."""
    lowered = text.lower()
    return [topic for topic in vocabulary
            if re.search(r'(?<![a-z0-9+#])' + re.escape(topic) + r'(?![a-z0-9+#])', lowered)]


def curated_course_codes():
    rows = json.loads((DIRECTORY / 'curriculum.json').read_text(encoding='utf-8'))
    return {''.join(match.groups()) for row in rows if row['kind'] == 'Course'
            for match in [re.match(r'([A-Z]{2,5})\s*(\d{4})\b', row['name'])] if match}


def parse_courses(page, subject, verified_on, vocabulary, skip=()):
    """Catalog rows for one subject page. Placeholders (CS 1XXX), other subjects,
    numbers outside 1000-4999 and codes in `skip` are left out."""
    url = COURSE_PAGE.format(subject.lower())
    rows = {}
    for block in re.findall(r'(?is)<div class="courseblock">(.*?)</div>', page):
        title = re.search(r'(?is)<p class="courseblocktitle[^"]*">(.*?)</p>', block)
        match = title and re.match(r'([A-Z]{2,5}) (\d{4})\. (.+?)\. [\d.,\- ]+ Credit Hours?\.$', clean(title.group(1)))
        if not match or match.group(1) != subject:
            continue
        number, name = int(match.group(2)), match.group(3).strip()
        if not 1000 <= number <= 4999 or f'{subject}{number}' in skip:
            continue
        body = re.search(r'(?is)<p class="courseblockdesc[^"]*">(.*?)</p>', block)
        description = clean(body.group(1)) if body else ''
        rows[SUBJECTS[subject] + number] = {
            'id': SUBJECTS[subject] + number,
            'name': f'{subject} {number} · {name}',
            'kind': 'Course',
            'summary': shorten(description, 400) or 'The catalog lists this course without a description.',
            'topics': topics_in(f'{name}. {description}', vocabulary),
            'tags': ' '.join([subject.lower(), str(number), 'course', 'courses', *keywords(name, description)]),
            'url': url, 'source_url': url, 'access': COURSE_ACCESS, 'verified_on': verified_on,
        }
    return list(rows.values())


def parse_vip_teams(page, verified_on, vocabulary):
    """One row per team tile: title, tile description, entry link and listed majors."""
    rows = {}
    for card in re.split(r'(?=<div class="[^"]*\bvip-team-card\b)', page)[1:]:
        link = re.search(r'href="(https://vip\.gatech\.edu/teams/entry/(\d+))/?"', card)
        title = re.search(r'(?is)<h4>(.*?)</h4>', card)
        body = re.search(r'(?is)<div class="vip-team-description">(.*?)</div>', card)
        if not (link and title and body):
            continue
        name = re.sub(r'^(?:!\s*)?NEW TEAM\s*!\s*', '', clean(title.group(1)), flags=re.I).strip()
        description = clean(body.group(1))
        if not name or not description:
            continue
        majors = ' '.join(html.unescape(value) for value in re.findall(r'data-[a-z-]+-majors="([^"]*)"', card))
        rows[VIP_BASE + int(link.group(2))] = {
            'id': VIP_BASE + int(link.group(2)),
            'name': f'VIP · {name}',
            'kind': 'VIP project',
            'summary': shorten(description, 500),
            'topics': topics_in(f'{name}. {description}', vocabulary),
            'tags': ' '.join(['vip', 'project', 'team', 'teams', 'research', *keywords(name, description, majors, limit=60)]),
            'url': link.group(1), 'source_url': VIP_PAGE, 'access': VIP_ACCESS, 'verified_on': verified_on,
        }
    return list(rows.values())


def download(url):
    request = Request(url, headers={'User-Agent': 'WarmPath-catalog-import/0.1 (public course and VIP team metadata)'})
    with urlopen(request, timeout=40) as response:
        payload = response.read(5_000_001)
    if len(payload) > 5_000_000:
        raise ValueError(f'{url} is larger than expected; import aborted.')
    return payload.decode('utf-8', 'replace')


def build(fetch=download, today=None):
    """All rows, sorted by ID. Raises instead of writing a partial catalog."""
    verified_on = (today or date.today()).isoformat()
    vocabulary, skip = topic_vocabulary(), curated_course_codes()
    rows = []
    for subject in SUBJECTS:
        found = parse_courses(fetch(COURSE_PAGE.format(subject.lower())), subject, verified_on, vocabulary, skip)
        if len(found) < 20:
            raise ValueError(f'Only {len(found)} {subject} courses parsed; the catalog page layout may have changed.')
        rows += found
    teams = parse_vip_teams(fetch(VIP_PAGE), verified_on, vocabulary)
    if len(teams) < 20:
        raise ValueError(f'Only {len(teams)} VIP teams parsed; the team page layout may have changed.')
    rows += teams
    if len({row['id'] for row in rows}) != len(rows):
        raise ValueError('Duplicate resource IDs; import aborted.')
    return sorted(rows, key=lambda row: row['id'])


if __name__ == '__main__':
    rows = build()
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    courses = sum(row['kind'] == 'Course' for row in rows)
    print(f'Wrote {courses} courses and {len(rows) - courses} VIP teams to {OUTPUT.name}. '
          'Review the diff, then run python -m backend.manage init-catalog.')
