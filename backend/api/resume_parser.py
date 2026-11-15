"""Bounded local document extraction and conservative, reviewable suggestions.

Worker protocol uses stdin/stdout, never saves raw resumes, and has no network
tools or LLM calls. Unknown details remain in source text for manual entry.
"""
import io
import json
import re
import sys
import zipfile
from uuid import uuid4

MAX_BYTES = 5 * 1024 * 1024
MAX_TEXT = 50000


def limit_worker_memory():
    """Bound decompression/parser memory, including Windows local development."""
    limit = 384 * 1024 * 1024
    if sys.platform == 'win32':
        import ctypes as c
        from ctypes import wintypes as w
        class Basic(c.Structure):
            _fields_ = [('process_time', c.c_int64), ('job_time', c.c_int64),
                ('flags', w.DWORD), ('min_ws', c.c_size_t), ('max_ws', c.c_size_t),
                ('active', w.DWORD), ('affinity', c.c_size_t), ('priority', w.DWORD), ('scheduling', w.DWORD)]
        class IO(c.Structure):
            _fields_ = [(name, c.c_uint64) for name in ('read_ops','write_ops','other_ops','read_bytes','write_bytes','other_bytes')]
        class Extended(c.Structure):
            _fields_ = [('basic', Basic), ('io', IO), ('process_memory', c.c_size_t),
                ('job_memory', c.c_size_t), ('peak_process', c.c_size_t), ('peak_job', c.c_size_t)]
        kernel = c.WinDLL('kernel32', use_last_error=True)
        kernel.CreateJobObjectW.argtypes = [c.c_void_p, w.LPCWSTR]
        kernel.CreateJobObjectW.restype = w.HANDLE
        kernel.SetInformationJobObject.argtypes = [w.HANDLE, c.c_int, c.c_void_p, w.DWORD]
        kernel.AssignProcessToJobObject.argtypes = [w.HANDLE, w.HANDLE]
        kernel.GetCurrentProcess.restype = w.HANDLE
        job = kernel.CreateJobObjectW(None, None)
        limits = Extended()
        limits.basic.flags = 0x100  # JOB_OBJECT_LIMIT_PROCESS_MEMORY
        limits.process_memory = limit
        if not job or not kernel.SetInformationJobObject(job, 9, c.byref(limits), c.sizeof(limits)) or not kernel.AssignProcessToJobObject(job, kernel.GetCurrentProcess()):
            raise ValueError('Document isolation is unavailable. Paste text instead.')
        # Keep the job handle open for the worker lifetime; Windows releases it on exit.
    else:
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (limit, limit))


def extract(data, kind):
    if not data or len(data) > MAX_BYTES:
        raise ValueError('Upload a nonempty file up to 5 MB.')
    if kind == 'pdf':
        from pypdf import PdfReader
        if not data.startswith(b'%PDF-'):
            raise ValueError('The file is not a PDF.')
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ValueError('Use an unlocked PDF or paste the resume text.')
        if len(reader.pages) > 20:
            raise ValueError('Use a resume with at most 20 pages.')
        parts = []
        for page in reader.pages:
            content = page.get_contents()
            if content and len(content.get_data()) > 10 * 1024 * 1024:
                raise ValueError('PDF page is too complex. Paste text instead.')
            parts.append(page.extract_text() or '')
        value = '\n\f\n'.join(parts)
    elif kind == 'docx':
        from docx import Document
        from docx.table import Table
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            items = archive.infolist()
            if len(items) > 1000 or sum(x.file_size for x in items) > 20 * 1024 * 1024:
                raise ValueError('Word document expands beyond the processing limit.')
            if '[Content_Types].xml' not in archive.namelist() or 'word/document.xml' not in archive.namelist():
                raise ValueError('Use a DOCX document.')
            if any('vbaproject' in x.filename.lower() for x in items):
                raise ValueError('Macro-enabled documents are not supported.')
            for item in items:
                if item.filename.endswith(('.xml', '.rels')):
                    xml = archive.read(item).upper()
                    if b'<!DOCTYPE' in xml or b'<!ENTITY' in xml:
                        raise ValueError('XML declarations in this document are not supported.')
        doc = Document(io.BytesIO(data))
        def blocks(container, depth=0):
            if depth > 8:
                raise ValueError('Document nesting is too complex.')
            for block in container.iter_inner_content():
                if isinstance(block, Table):
                    for row in block.rows:
                        yield ' | '.join(' '.join(blocks(cell, depth + 1)) for cell in row.cells)
                else:
                    yield block.text
        value = '\n'.join(blocks(doc))
    else:
        raise ValueError('Choose a PDF or DOCX file.')
    if len(value.strip()) < 20:
        raise ValueError('No readable text found. Scanned PDFs need OCR; paste text or enter details manually.')
    if len(value) > MAX_TEXT:
        raise ValueError('Resume text exceeds 50,000 characters.')
    return value


def parse_text(value):
    value = value.replace('\x00', '')
    lines = [line.strip() for line in value.splitlines() if line.strip()]
    candidates = []
    def add(section, candidate, evidence):
        if len(candidates) < 200:
            candidates.append({'id': str(uuid4()), 'section': section, 'value': candidate, 'evidence': evidence[:4000]})
    if lines and re.fullmatch(r"[^\d@:/|]{2,150}", lines[0]) and 2 <= len(lines[0].split()) <= 6:
        if not re.search(r'resume|curriculum|experience|education', lines[0], re.I):
            add('name', lines[0], lines[0])
    for line in lines:
        major = re.search(r'(?:major\s*:\s*|(?:B\.?S\.?|M\.?S\.?|Bachelor of Science|Master of Science)\s+in\s+)([A-Za-z &-]{3,150})', line, re.I)
        if major:
            add('major', major[1].strip(), line)
            break
    for line in lines:
        graduation = re.search(r'(?:expected\s+graduation|graduation(?:\s+date)?)\s*:?\s*(?:[A-Za-z]+\s+)?((?:19|20)\d{2})\b', line, re.I)
        if graduation:
            add('grad_year', int(graduation[1]), line)
            break
    for email in dict.fromkeys(re.findall(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', value)):
        add('contacts', {'kind': 'email', 'value': email}, email)
    for phone in dict.fromkeys(re.findall(r'(?<!\d)(?:\+1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}(?!\d)', value)):
        add('contacts', {'kind': 'phone', 'value': phone}, phone)
    for link in dict.fromkeys(re.findall(r'(?:https?://|(?:www\.)?(?:linkedin\.com/in/|github\.com/))[^\s<>]+', value)):
        link = link.rstrip('.,;)')
        url = link if link.startswith(('http://', 'https://')) else 'https://' + link
        kind = 'linkedin' if 'linkedin.com/' in link else 'github' if 'github.com/' in link else 'portfolio'
        add('contacts', {'kind': kind, 'value': url}, link)
    section = None
    groups = []
    course_lines = []
    current = []
    headings = {'experience': 'job', 'work experience': 'job', 'professional experience': 'job',
                'employment': 'job', 'internships': 'internship', 'research': 'research',
                'research experience': 'research', 'projects': 'project', 'vip': 'vip',
                'vip projects': 'vip', 'clubs': 'club', 'volunteering': 'volunteering'}
    stops = {'education', 'skills', 'technical skills', 'awards', 'certifications', 'interests', 'summary', 'objective'}
    course_heads = {'courses', 'coursework', 'relevant coursework', 'relevant courses'}
    def flush():
        if current and section in set(headings.values()):
            groups.append((section, list(current)))
        if current and section == 'courses':
            course_lines.extend(current)
        current.clear()
    for line in lines:
        head = line.lower().strip(': ')
        prefix = line.split(':', 1)[0].lower().strip()
        if head in headings or head in stops or prefix in course_heads:
            flush()
            section = headings.get(head, 'courses' if prefix in course_heads else None)
            if section == 'courses' and ':' in line:
                current.append(line.split(':', 1)[1])
            continue
        if section == 'courses':
            current.append(line)
        elif section:
            # Explicit role/company separators are conservative entry boundaries.
            if current and re.search(r'\s[|–—]\s|\s+at\s+', line) and not line.startswith(('•', '-', '*')):
                flush()
            current.append(line)
    flush()
    # Course codes only; a code anywhere is a suggestion, never proof of attendance.
    seen = set()
    for line in lines:
        for match in re.finditer(r'\b([A-Z]{2,5})\s?-?\s?(\d{4}[A-Z]?)\b', line):
            code = match[1] + ' ' + match[2]
            if code not in seen:
                seen.add(code)
                add('courses', {'code': code, 'title': '', 'institution': '', 'status': 'unspecified'}, line)
    for line in course_lines:
        if re.search(r'\b[A-Z]{2,5}\s?-?\s?\d{4}', line):
            continue
        for title in re.split(r'[,;|•]', line):
            title = title.strip(' -')
            if (2 <= len(title) <= 200 and not re.search(r'\b[A-Z]{2,5}\s?-?\s?\d{4}', title)
                    and title.lower() not in seen):
                seen.add(title.lower())
                add('courses', {'code': '', 'title': title, 'institution': '', 'status': 'unspecified'}, line)
    for kind, group in groups[:60]:
        header = group[0]
        split = re.split(r'\s[|–—]\s|\s+at\s+', header, maxsplit=1)
        dates = re.findall(r'\b(?:19|20)\d{2}(?:-(?:0[1-9]|1[0-2]))?\b', ' '.join(group[:3]))
        ongoing = bool(re.search(r'\b(present|current)\b', ' '.join(group[:3]), re.I))
        start = dates[0] if dates else ''
        end = dates[1] if len(dates) > 1 and not ongoing and dates[1] >= start else ''
        add('experiences', {'kind': kind, 'title': split[0][:200],
            'organization': split[1][:200] if len(split) > 1 else '',
            'start': start, 'end': end, 'ongoing': ongoing,
            'description': '\n'.join(group[1:])[:4000]}, '\n'.join(group))
    return {'text': value, 'candidates': candidates,
            'warnings': ['Review every suggestion. Dates and multi-column layouts may be incomplete.',
                         'Courses have unspecified status until you confirm it. No employment or attendance is verified.']}


if __name__ == '__main__':
    try:
        limit_worker_memory()
        data = sys.stdin.buffer.read(MAX_BYTES + 1)
        extracted = extract(data, sys.argv[1])
        if len(sys.argv) > 2 and sys.argv[2] == 'transcript':
            from backend.api.transcript_parser import parse_transcript
            result = parse_transcript(extracted)
        else:
            result = parse_text(extracted)
        print(json.dumps(result))
    except Exception as error:
        # Parser internals and document contents never enter server logs.
        message = str(error) if isinstance(error, ValueError) else 'Could not read this document. Paste text or use another PDF/DOCX.'
        print(json.dumps({'error': message}))
        sys.exit(1)
