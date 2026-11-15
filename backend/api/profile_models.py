"""Validated editable profile contract. All participation is self-reported."""
import re
from typing import Literal
from uuid import uuid4
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Model(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Credentials(Model):
    email: str = Field(max_length=254)
    password: str = Field(min_length=12, max_length=128)

    @field_validator('email')
    @classmethod
    def email_format(cls, v):
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', v):
            raise ValueError('Enter a valid email address.')
        return v.lower()

    # Password whitespace is significant.
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)


class Register(Credentials):
    name: str = Field(min_length=1, max_length=150)

    @field_validator('name')
    @classmethod
    def name_text(cls, v):
        if not v.strip():
            raise ValueError('Enter your name.')
        return v.strip()


class Entry(Model):
    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1, max_length=64)
    source: Literal['manual', 'resume'] = 'manual'
    source_id: str | None = Field(default=None, max_length=64)
    visible: bool = False


class Contact(Entry):
    kind: Literal['email', 'phone', 'portfolio', 'github', 'linkedin'] = 'email'
    value: str = Field(min_length=1, max_length=500)

    @model_validator(mode='after')
    def safe_value(self):
        if self.kind in ('portfolio', 'github', 'linkedin'):
            from urllib.parse import urlsplit
            u = urlsplit(self.value)
            if u.scheme not in ('https', 'http') or not u.netloc or u.username:
                raise ValueError('Links must use http or https and have a hostname.')
        if self.kind == 'email' and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', self.value):
            raise ValueError('Enter a valid contact email.')
        return self


class Experience(Entry):
    kind: Literal['job', 'internship', 'research', 'vip', 'club', 'project', 'volunteering'] = 'job'
    title: str = Field(min_length=1, max_length=200)
    organization: str = Field(default='', max_length=200)
    start: str = Field(default='', max_length=7, pattern=r'^$|^\d{4}(-(?:0[1-9]|1[0-2]))?$')
    end: str = Field(default='', max_length=7, pattern=r'^$|^\d{4}(-(?:0[1-9]|1[0-2]))?$')
    ongoing: bool = False
    description: str = Field(default='', max_length=4000)
    resource_id: int | None = None

    @model_validator(mode='after')
    def dates(self):
        if self.ongoing and self.end:
            raise ValueError('An ongoing experience cannot have an end date.')
        if self.start and self.end and self.start > self.end:
            raise ValueError('End date must follow start date.')
        return self


class Course(Entry):
    source: Literal['manual', 'resume', 'transcript'] = 'manual'
    code: str = Field(default='', max_length=30)
    title: str = Field(default='', max_length=200)
    institution: str = Field(default='', max_length=200)
    term: str = Field(default='', max_length=50)
    status: Literal['unspecified', 'planned', 'in_progress', 'taken', 'completed'] = 'unspecified'
    record_type: Literal['coursework', 'transfer_credit', 'exam_credit'] = 'coursework'
    resource_id: int | None = None

    @model_validator(mode='after')
    def named(self):
        if not self.code and not self.title:
            raise ValueError('Enter a course code or title.')
        return self


class Profile(Model):
    name: str = Field(min_length=1, max_length=150)
    kind: Literal['student', 'alum'] = 'student'
    major: str = Field(default='', max_length=200)
    grad_year: int | None = Field(default=None, ge=1900, le=2100)
    introduction: str = Field(default='', max_length=2000)
    city_id: int | None = None
    share_city: bool = False
    profile_visible: bool = False
    contacts: list[Contact] = Field(default_factory=list, max_length=20)
    experiences: list[Experience] = Field(default_factory=list, max_length=100)

    @model_validator(mode='after')
    def unique_entries(self):
        ids = [e.id for items in (self.contacts, self.experiences) for e in items]
        if len(ids) != len(set(ids)):
            raise ValueError('Profile entries must have unique IDs.')
        if self.share_city and self.city_id is None:
            raise ValueError('Choose a city before sharing it.')
        return self


class ProfileUpdate(Model):
    version: int = Field(ge=1)
    profile: Profile


class Selection(Model):
    id: str = Field(max_length=64)
    value: dict | str | int


class ImportDraft(Model):
    version: int = Field(ge=1)
    courses_version: int | None = Field(default=None, ge=1)
    selections: list[Selection] = Field(max_length=200)


class PastedResume(Model):
    text: str = Field(min_length=20, max_length=50000)


class CourseWrite(Model):
    version: int = Field(ge=1)
    course: Course


class TranscriptSelection(Model):
    id: str = Field(max_length=64)
    course: Course
    confirm_separate: bool = False


class TranscriptImport(Model):
    version: int = Field(ge=1)
    selections: list[TranscriptSelection] = Field(min_length=1, max_length=500)
