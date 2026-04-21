"""Resume schemas."""

from typing import Any, List, Optional

from pydantic import BaseModel


class ResumeCreate(BaseModel):
    """Schema for creating a new resume."""
    person_name: str
    resume_name: str  # e.g., "Software Engineer Resume", "Data Scientist Resume"
    resume_text: str


class ResumeInfo(BaseModel):
    """Basic resume information."""
    resume_id: str
    person_name: str
    resume_name: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ResumeList(BaseModel):
    """List of resumes."""
    resumes: List[ResumeInfo]


class JobSnapshot(BaseModel):
    """Snapshot of a job posting; sufficient to MERGE the JobPosting node
    server-side without a separate add-to-graph step."""
    apply_url: str
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    salary_text: Optional[str] = None
    employment_type: Optional[str] = None
    remote: Optional[bool] = None
    posted_at: Optional[str] = None
    source_url: Optional[str] = None


class SavedJobCreate(BaseModel):
    """Schema for saving a job to a resume. Accepts either the full snapshot
    (preferred — atomic create-and-link) or just an apply URL (legacy)."""
    resume_id: str
    job: Optional[JobSnapshot] = None
    # Legacy field: kept so older clients that send just a URL still work.
    job_apply_url: Optional[str] = None
    notes: Optional[str] = None


class SavedJobInfo(BaseModel):
    """Information about a saved job."""
    job_title: str
    company: Optional[str] = None
    location: Optional[str] = None
    apply_url: str
    source: Optional[str] = None
    saved_at: str
    notes: Optional[str] = None
    ats_score: Optional[float] = None
    ats_details: Optional[dict[str, Any]] = None


class SavedJobsList(BaseModel):
    """List of saved jobs for a resume."""
    resume_id: str
    resume_name: str
    jobs: List[SavedJobInfo]


class SkillGapItem(BaseModel):
    """Information about a specific skill gap."""
    skill: str
    frequency: int  # How many jobs require this skill
    importance: str  # "critical" (in most jobs), "high", "medium", "low"


class SkillAnalysis(BaseModel):
    """Skill analysis for gap analysis."""
    matched_skills: List[str]
    missing_required_skills: List[SkillGapItem]
    missing_preferred_skills: List[SkillGapItem]
    all_job_skills: List[str]
    average_ats_score: float
    job_count: int


class SkillGapAnalysis(BaseModel):
    """Comprehensive skill gap analysis based on saved jobs."""
    resume_id: str
    resume_name: str
    skill_analysis: SkillAnalysis
    recommendations: List[str]
    summary: dict[str, Any]
