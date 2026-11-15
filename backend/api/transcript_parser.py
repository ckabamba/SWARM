"""Conservative transcript row extraction. Never return raw text or grade columns.

Supported baseline: subject/number rows with titles, term headings and trailing
grade/credit columns. Unknown layouts get warnings, not claims of completeness.
"""
import re
from uuid import uuid4

CODE = re.compile(r'^\s*([A-Z]{2,6})\s*[- ]?\s*(\d{3,5}[A-Z]?)\b\s*(.*)$')
TERM = re.compile(r'\b(Fall|Spring|Summer(?:\s+(?:I{1,2}|[12]))?|Winter)\s*(?:Semester|Term)?\s*((?:19|20)\d{2})\b', re.I)
TERM_REVERSED = re.compile(r'\b((?:19|20)\d{2})\s+(Fall|Spring|Summer|Winter)\b', re.I)
GRADE = r'(?:[ABCDF][+-]?|[PSUWIV]|WF|WP|IP|TR|CR|NC|AU|NR|NG|S/U|PASS|FAIL)'


def clean_title(tail):
    # Drop level codes; prefer explicit table columns where available.
    tail = re.sub(r'^\s*(?:UG|GR|US|GS)\s+', '', tail)
    if re.match(r'^\s*(?:' + GRADE + r'|\d+(?:\.\d+)?)\s+', tail, re.I):
        # A leading grade/credit column cannot be treated as part of the title.
        return ''
    title = re.split(r'\s*[|\t]\s*|\s{2,}', tail.strip(), maxsplit=1)[0]
    title = re.split(r'\b(?:grade|gpa|quality points|credit hours)\s*[:=]?', title, flags=re.I)[0]
    # Grade preceding credits, or numeric credit/points/grade suffixes.
    title = re.sub(r'\s+' + GRADE + r'\s+\d.*$', '', title, flags=re.I)
    title = re.sub(r'\s+\d+(?:\.\d+)?(?:\s|$).*$', '', title)
    title = re.sub(r'\s+' + GRADE + r'\s*$', '', title, flags=re.I)
    title = title.strip(' |-:')
    # Never persist uninterpreted tails masquerading as titles.
    if len(title) > 200 or not re.search('[A-Za-z]', title) or re.search(r'\b(?:GPA|GRADE)\b', title, re.I):
        return ''
    return title


def parse_transcript(text):
    if not 20 <= len(text.strip()) <= 50000:
        raise ValueError('Use 20–50,000 characters of transcript text.')
    candidates, warnings = [], []
    term, institution, home_institution = '', '', ''
    record_type, status = 'coursework', 'unspecified'
    title_before_grade = True
    page = 1
    for line_number, raw in enumerate(text.replace('\x00', '').split('\n'), 1):
        page += raw.count('\f')
        line = raw.replace('\f', '').strip()
        lower = line.lower()
        if re.search(r'\btitle\b', lower) and re.search(r'\bgrade\b', lower):
            title_before_grade = lower.index('title') < lower.index('grade')
        match = TERM.search(line)
        reversed_term = TERM_REVERSED.search(line)
        if match:
            term = match[1].title() + ' ' + match[2]
        elif reversed_term:
            term = reversed_term[2].title() + ' ' + reversed_term[1]
        if re.fullmatch(r'(?:georgia institute of technology|georgia tech)(?:\s*[-–].*)?', line, re.I):
            home_institution = 'Georgia Tech'
            if record_type == 'coursework':
                institution = home_institution
        elif re.match(r'^(?:institution|transfer institution)\s*:', line, re.I):
            name = line.split(':', 1)[1].strip()
            if len(name) <= 200 and not re.search(r'\b(?:grade|gpa)\b|[|\t]', name, re.I):
                institution = name
        if re.match(r'^(?:transfer credit|transfer courses|transfer work)', lower):
            record_type, status = 'transfer_credit', 'unspecified'
            institution = ''  # Do not attribute transfer courses to the receiving institution.
        elif re.match(r'^(?:test credit|exam credit|advanced placement)', lower):
            record_type, status = 'exam_credit', 'unspecified'
            institution = home_institution
        elif re.match(r'^(?:courses in progress|in.progress courses|current enrollment)', lower):
            record_type, status = 'coursework', 'in_progress'
            institution = home_institution
        elif re.match(r'^(?:institution credit|coursework|academic history)', lower):
            record_type, status = 'coursework', 'unspecified'
            institution = home_institution
        course = CODE.match(line)
        if not course:
            if re.search(r'\b[A-Z]{2,6}\s+\d{3,5}\b', line) and not match and not reversed_term:
                warnings.append(f'Page {page}, line {line_number}: possible course row could not be read; check the original.')
            continue
        code = course[1] + ' ' + course[2]
        title = clean_title(course[3]) if title_before_grade else ''
        notes = []
        if not title:
            notes.append('Title could not be safely separated from other columns; enter it from the original.')
        if not term:
            notes.append('No term found; check for another attempt before importing.')
        if not institution:
            notes.append('Institution needs confirmation.')
        candidates.append({'id': str(uuid4()), 'course': {'code': code, 'title': title,
            'institution': institution, 'term': term, 'record_type': record_type, 'status': status},
            'location': {'page': page, 'line': line_number}, 'warnings': notes})
        if len(candidates) > 500:
            raise ValueError('More than 500 course rows found. Split the transcript by term; no partial draft was saved.')
    return {'candidates': candidates, 'row_count': len(candidates), 'warnings': [
        'Compare this list with every page of your transcript. This layout has not been verified against an official GT sample.',
        'Grades, GPA and raw transcript text are discarded. Listed courses are not proof of passing or meeting prerequisites.',
        *warnings], 'parser': 'transcript-rows-v1'}
