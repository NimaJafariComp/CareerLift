"""Resume processing API endpoints. Every endpoint is scoped to the
currently-authenticated user via :User-[:OWNS]->(:Resume) etc."""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.resume_processor import resume_processor
from app.services.knowledge_graph_service import (
    ResumeGraphExtractionError,
    knowledge_graph_service,
)
from app.services.ats_service import ats_service
from app.schemas.resume import (
    ResumeInfo,
    ResumeList,
    SavedJobCreate,
    SavedJobInfo,
    SavedJobsList,
    SkillGapAnalysis,
)
from typing import Optional
import uuid


router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    person_name: str = Form(""),
    resume_name: str = Form(""),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload and process a resume file with multiple resume support.

    Supports: .txt, .md, .pdf, .doc, .docx
    The Resume becomes :OWNS-owned by the current user; the resulting
    skill/experience/education subgraph is linked to this Resume only.
    """
    user_id = current_user["id"]

    if not resume_name or not resume_name.strip():
        raise HTTPException(
            status_code=400,
            detail="A resume name is required (e.g. 'Spring 2026 SWE').",
        )

    allowed_extensions = {'.txt', '.md', '.pdf', '.doc', '.docx'}
    file_ext = '.' + file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )

    file_content = await file.read()

    try:
        text = await resume_processor.extract_text_from_file(file_content, file.filename)

        if not text or len(text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Could not extract meaningful text from the file"
            )

        resume_id = str(uuid.uuid4())
        graph_data = await knowledge_graph_service.transform_resume_to_graph(text)

        extracted_person_name = (
            graph_data.get("person", {}).get("name") if graph_data.get("person") else None
        )
        final_person_name = (
            person_name.strip()
            if person_name and person_name.strip()
            else (extracted_person_name or "Unknown")
        )
        if not graph_data.get("person"):
            graph_data["person"] = {"name": final_person_name}
        else:
            graph_data["person"]["name"] = final_person_name

        final_resume_name = resume_name.strip()

        # Create the Resume node and link it to the owning user.
        resume_query = """
        MATCH (u:User {id: $user_id})
        CREATE (r:Resume {
            id: $resume_id,
            name: $resume_name,
            person_name: $person_name,
            text: $text,
            filename: $filename,
            created_at: datetime(),
            updated_at: datetime()
        })
        MERGE (u)-[:OWNS]->(r)
        RETURN r
        """
        result = await db.run(
            resume_query,
            user_id=user_id,
            resume_id=resume_id,
            resume_name=final_resume_name,
            person_name=final_person_name,
            text=text,
            filename=file.filename,
        )
        await result.consume()

        # Build per-resume subgraph (Skills/Experiences/Education hang off
        # this Resume; Person is created/MERGEd under the user).
        nodes_created = await knowledge_graph_service.create_resume_subgraph(
            db, graph_data, resume_id=resume_id, user_id=user_id
        )

        return {
            "message": "Resume processed successfully",
            "resume_id": resume_id,
            "resume_name": final_resume_name,
            "person_name": final_person_name,
            "filename": file.filename,
            "text_length": len(text),
            "nodes_created": nodes_created,
            "graph_data": graph_data,
        }

    except ResumeGraphExtractionError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        error_msg = str(e)
        if error_msg.startswith("OLLAMA_AUTH_REQUIRED:"):
            signin_url = error_msg.split(":", 1)[1] if ":" in error_msg else None
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "Ollama authentication required",
                    "signin_url": signin_url,
                    "message": "Please sign in to Ollama to process resumes",
                },
            )
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")


@router.get("/graph/{person_name}")
async def get_resume_graph(
    person_name: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return the user's most-recent Resume subgraph for the given person.
    Skills/Experiences/Education are now per-Resume."""
    query = """
    MATCH (u:User {id: $user_id})-[:OWNS]->(p:Person {name: $person_name})
    OPTIONAL MATCH (u)-[:OWNS]->(r:Resume)-[:BELONGS_TO]->(p)
    WITH p, r ORDER BY r.created_at DESC
    WITH p, head(collect(r)) AS r
    OPTIONAL MATCH (r)-[:HAS_SKILL]->(s:Skill)
    OPTIONAL MATCH (r)-[:HAS_EXPERIENCE]->(e:Experience)
    OPTIONAL MATCH (r)-[:HAS_EDUCATION]->(ed:Education)
    OPTIONAL MATCH (r)-[:SAVED_JOB]->(j:JobPosting)
    OPTIONAL MATCH (u)-[:OWNS]->(allr:Resume)-[:BELONGS_TO]->(p)
    RETURN p,
           collect(DISTINCT s) AS skills,
           collect(DISTINCT e) AS experiences,
           collect(DISTINCT ed) AS education,
           collect(DISTINCT j) AS saved_jobs,
           collect(DISTINCT allr) AS resumes
    """

    result = await db.run(query, user_id=current_user["id"], person_name=person_name)
    record = await result.single()

    if not record or not record.get("p"):
        raise HTTPException(status_code=404, detail=f"Person '{person_name}' not found")

    return {
        "person": dict(record["p"]),
        "skills": [dict(s) for s in record.get("skills", []) if s is not None],
        "experiences": [dict(e) for e in record.get("experiences", []) if e is not None],
        "education": [dict(ed) for ed in record.get("education", []) if ed is not None],
        "saved_jobs": [dict(j) for j in record.get("saved_jobs", []) if j is not None],
        "resumes": [dict(r) for r in record.get("resumes", []) if r is not None],
    }


@router.get("/score/{person_name}")
async def score_resume_against_jobs(
    person_name: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    person_query = """
    MATCH (u:User {id: $user_id})-[:OWNS]->(p:Person {name: $person_name})
    OPTIONAL MATCH (u)-[:OWNS]->(r:Resume)-[:BELONGS_TO]->(p)
    WITH p, r ORDER BY r.created_at DESC
    WITH p, head(collect(r)) AS r
    OPTIONAL MATCH (r)-[:HAS_SKILL]->(s:Skill)
    OPTIONAL MATCH (r)-[:HAS_EXPERIENCE]->(e:Experience)
    OPTIONAL MATCH (r)-[:HAS_EDUCATION]->(ed:Education)
    RETURN p,
           collect(DISTINCT s.name) AS skills,
           collect(DISTINCT e.description) AS experiences,
           collect(DISTINCT e.title) AS experience_titles,
           collect(DISTINCT ed.degree) AS education,
           collect(DISTINCT r.text) AS resume_texts
    """

    record = await (await db.run(
        person_query, user_id=current_user["id"], person_name=person_name
    )).single()
    if not record or not record.get("p"):
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_profile = ats_service.build_resume_profile(
        skills=record["skills"] or [],
        experiences=record["experiences"] or [],
        experience_titles=record["experience_titles"] or [],
        education=record["education"] or [],
        resume_text=" ".join(record["resume_texts"] or []),
    )

    job_query = "MATCH (j:JobPosting) RETURN j"
    result = await db.run(job_query)

    jobs = []
    async for row in result:
        j = dict(row["j"])
        j.update(ats_service.score_resume_to_job(resume_profile, j))
        jobs.append(j)

    return {"jobs": jobs}


@router.get("/list", response_model=ResumeList)
async def list_resumes(
    person_name: Optional[str] = None,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List the current user's resumes (optionally filtered by person name)."""
    if person_name:
        query = """
        MATCH (u:User {id: $user_id})-[:OWNS]->(r:Resume {person_name: $person_name})
        RETURN r.id AS resume_id,
               r.name AS resume_name,
               r.person_name AS person_name,
               toString(r.created_at) AS created_at,
               toString(r.updated_at) AS updated_at
        ORDER BY r.created_at DESC
        """
        result = await db.run(query, user_id=current_user["id"], person_name=person_name)
    else:
        query = """
        MATCH (u:User {id: $user_id})-[:OWNS]->(r:Resume)
        RETURN r.id AS resume_id,
               r.name AS resume_name,
               r.person_name AS person_name,
               toString(r.created_at) AS created_at,
               toString(r.updated_at) AS updated_at
        ORDER BY r.created_at DESC
        """
        result = await db.run(query, user_id=current_user["id"])

    resumes = []
    async for record in result:
        resumes.append(ResumeInfo(
            resume_id=record["resume_id"],
            person_name=record["person_name"],
            resume_name=record["resume_name"],
            created_at=record.get("created_at"),
            updated_at=record.get("updated_at"),
        ))

    return ResumeList(resumes=resumes)


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete one of the current user's resumes."""
    check = await db.run(
        """
        MATCH (u:User {id: $user_id})-[:OWNS]->(r:Resume {id: $resume_id})
        RETURN r
        """,
        user_id=current_user["id"],
        resume_id=resume_id,
    )
    if not await check.single():
        raise HTTPException(status_code=404, detail="Resume not found")

    await db.run(
        """
        MATCH (u:User {id: $user_id})-[:OWNS]->(r:Resume {id: $resume_id})
        DETACH DELETE r
        """,
        user_id=current_user["id"],
        resume_id=resume_id,
    )

    return {"message": "Resume deleted successfully", "resume_id": resume_id}


@router.post("/save-job")
async def save_job_to_resume(
    data: SavedJobCreate,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atomic save: MERGE the JobPosting from the request payload, link it to
    the user (OWNS) and to the resume (SAVED_JOB) in a single transaction.
    Eliminates the previous race where the JobPosting hadn't yet been
    committed when the SAVED_JOB rel was attempted."""
    snapshot = data.job
    apply_url = snapshot.apply_url if snapshot else data.job_apply_url
    if not apply_url:
        raise HTTPException(status_code=400, detail="apply_url is required")

    # Confirm the resume belongs to this user.
    own = await db.run(
        """
        MATCH (u:User {id: $user_id})-[:OWNS]->(r:Resume {id: $resume_id})
        RETURN r
        """,
        user_id=current_user["id"],
        resume_id=data.resume_id,
    )
    if not await own.single():
        raise HTTPException(status_code=404, detail="Resume not found")

    title = snapshot.title if snapshot else None
    company = snapshot.company if snapshot else None
    location = snapshot.location if snapshot else None
    source = snapshot.source if snapshot else None
    description = snapshot.description if snapshot else None
    salary_text = snapshot.salary_text if snapshot else None
    employment_type = snapshot.employment_type if snapshot else None
    remote = snapshot.remote if snapshot else None
    posted_at = snapshot.posted_at if snapshot else None
    source_url = snapshot.source_url if snapshot else None

    save_query = """
    MERGE (j:JobPosting {apply_url: $apply_url})
      ON CREATE SET j.created_at = datetime()
    SET j.title         = coalesce($title, j.title),
        j.company       = coalesce($company, j.company),
        j.location      = coalesce($location, j.location),
        j.source        = coalesce($source, j.source),
        j.description   = coalesce($description, j.description),
        j.salary_text   = coalesce($salary_text, j.salary_text),
        j.employment_type = coalesce($employment_type, j.employment_type),
        j.remote        = coalesce($remote, j.remote),
        j.posted_at     = coalesce($posted_at, j.posted_at),
        j.source_url    = coalesce($source_url, j.source_url),
        j.updated_at    = datetime()
    WITH j
    MATCH (u:User {id: $user_id})-[:OWNS]->(r:Resume {id: $resume_id})
    MERGE (u)-[:OWNS]->(j)
    MERGE (r)-[s:SAVED_JOB]->(j)
      ON CREATE SET s.saved_at = datetime()
    SET s.notes = coalesce($notes, s.notes)
    RETURN j.apply_url AS apply_url
    """
    result = await db.run(
        save_query,
        user_id=current_user["id"],
        resume_id=data.resume_id,
        apply_url=apply_url,
        title=title,
        company=company,
        location=location,
        source=source,
        description=description,
        salary_text=salary_text,
        employment_type=employment_type,
        remote=remote,
        posted_at=posted_at,
        source_url=source_url,
        notes=data.notes,
    )
    record = await result.single()
    if not record:
        raise HTTPException(status_code=500, detail="Failed to save job")

    return {
        "message": "Job saved successfully",
        "resume_id": data.resume_id,
        "job_url": record["apply_url"],
    }


@router.get("/saved-jobs/{resume_id}", response_model=SavedJobsList)
async def get_saved_jobs(
    resume_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List saved jobs for a resume the current user owns, with ATS scores."""
    resume_query = """
    MATCH (u:User {id: $user_id})-[:OWNS]->(r:Resume {id: $resume_id})
    RETURN r.name AS resume_name, r.person_name AS person_name
    """
    resume_record = await (await db.run(
        resume_query, user_id=current_user["id"], resume_id=resume_id
    )).single()
    if not resume_record:
        raise HTTPException(status_code=404, detail="Resume not found")

    profile_query = """
    MATCH (r:Resume {id: $resume_id})
    OPTIONAL MATCH (r)-[:HAS_SKILL]->(s:Skill)
    OPTIONAL MATCH (r)-[:HAS_EXPERIENCE]->(e:Experience)
    OPTIONAL MATCH (r)-[:HAS_EDUCATION]->(ed:Education)
    RETURN collect(DISTINCT s.name) AS skills,
           collect(DISTINCT e.description) AS experiences,
           collect(DISTINCT e.title) AS experience_titles,
           collect(DISTINCT ed.degree) AS education,
           collect(DISTINCT r.text) AS resume_texts
    """
    person_data = await (await db.run(profile_query, resume_id=resume_id)).single()

    resume_profile = ats_service.build_resume_profile(
        skills=person_data["skills"] or [],
        experiences=person_data["experiences"] or [],
        experience_titles=person_data["experience_titles"] or [],
        education=person_data["education"] or [],
        resume_text=" ".join(person_data["resume_texts"] or []),
    )

    jobs_query = """
    MATCH (r:Resume {id: $resume_id})-[s:SAVED_JOB]->(j:JobPosting)
    RETURN j.title AS title,
           j.company AS company,
           j.location AS location,
           j.apply_url AS apply_url,
           j.source AS source,
           j.description AS description,
           toString(s.saved_at) AS saved_at,
           s.notes AS notes
    ORDER BY s.saved_at DESC
    """
    result = await db.run(jobs_query, resume_id=resume_id)

    jobs = []
    async for record in result:
        scoring = ats_service.score_resume_to_job(resume_profile, {
            "description": record.get("description", ""),
            "title": record.get("title", ""),
            "company": record.get("company", ""),
            "location": record.get("location", ""),
        })
        jobs.append(SavedJobInfo(
            job_title=record["title"],
            company=record.get("company"),
            location=record.get("location"),
            apply_url=record["apply_url"],
            source=record.get("source"),
            saved_at=record["saved_at"],
            notes=record.get("notes"),
            ats_score=scoring["ats_score"],
            ats_details=scoring["ats_details"],
        ))

    return SavedJobsList(
        resume_id=resume_id,
        resume_name=resume_record["resume_name"],
        jobs=jobs,
    )


@router.delete("/saved-job/{resume_id}/{job_apply_url:path}")
async def remove_saved_job(
    resume_id: str,
    job_apply_url: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove a saved job from one of the current user's resumes."""
    query = """
    MATCH (u:User {id: $user_id})-[:OWNS]->(r:Resume {id: $resume_id})-[s:SAVED_JOB]->(j:JobPosting {apply_url: $apply_url})
    DELETE s
    RETURN count(s) AS deleted
    """
    result = await db.run(
        query,
        user_id=current_user["id"],
        resume_id=resume_id,
        apply_url=job_apply_url,
    )
    record = await result.single()
    if not record or record["deleted"] == 0:
        raise HTTPException(status_code=404, detail="Saved job not found")
    return {"message": "Job removed from saved list"}


@router.get("/skill-gap-analysis/{resume_id}", response_model=SkillGapAnalysis)
async def analyze_skill_gaps(
    resume_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cross-resume skill gap analysis (saved jobs vs resume skills)."""
    resume_query = """
    MATCH (u:User {id: $user_id})-[:OWNS]->(r:Resume {id: $resume_id})
    RETURN r.name AS resume_name, r.person_name AS person_name
    """
    resume_record = await (await db.run(
        resume_query, user_id=current_user["id"], resume_id=resume_id
    )).single()
    if not resume_record:
        raise HTTPException(status_code=404, detail="Resume not found")

    profile_query = """
    MATCH (r:Resume {id: $resume_id})
    OPTIONAL MATCH (r)-[:HAS_SKILL]->(s:Skill)
    OPTIONAL MATCH (r)-[:HAS_EXPERIENCE]->(e:Experience)
    OPTIONAL MATCH (r)-[:HAS_EDUCATION]->(ed:Education)
    RETURN collect(DISTINCT s.name) AS skills,
           collect(DISTINCT e.description) AS experiences,
           collect(DISTINCT e.title) AS experience_titles,
           collect(DISTINCT ed.degree) AS education,
           collect(DISTINCT r.text) AS resume_texts
    """
    person_data = await (await db.run(profile_query, resume_id=resume_id)).single()

    resume_profile = ats_service.build_resume_profile(
        skills=person_data["skills"] or [],
        experiences=person_data["experiences"] or [],
        experience_titles=person_data["experience_titles"] or [],
        education=person_data["education"] or [],
        resume_text=" ".join(person_data["resume_texts"] or []),
    )

    jobs_query = """
    MATCH (r:Resume {id: $resume_id})-[s:SAVED_JOB]->(j:JobPosting)
    RETURN j.title AS title,
           j.company AS company,
           j.location AS location,
           j.apply_url AS apply_url,
           j.source AS source,
           j.description AS description
    ORDER BY s.saved_at DESC
    """
    result = await db.run(jobs_query, resume_id=resume_id)

    jobs_data = []
    async for record in result:
        jobs_data.append({
            "description": record.get("description", ""),
            "title": record.get("title", ""),
            "company": record.get("company", ""),
            "location": record.get("location", ""),
        })

    if not jobs_data:
        raise HTTPException(status_code=400, detail="No saved jobs found for analysis")

    all_required_skills = {}
    all_preferred_skills = {}
    all_job_skills = set()
    matched_skills = set()
    total_ats_scores = 0

    for job_data in jobs_data:
        scoring = ats_service.score_resume_to_job(resume_profile, job_data)
        total_ats_scores += scoring["ats_score"]
        ats_details = scoring.get("ats_details", {})

        if "matched" in ats_details and "required_skills" in ats_details["matched"]:
            matched_skills.update(ats_details["matched"]["required_skills"])
        if "missing" in ats_details and "required_skills" in ats_details["missing"]:
            for skill in ats_details["missing"]["required_skills"]:
                all_required_skills[skill] = all_required_skills.get(skill, 0) + 1
        if "missing" in ats_details and "preferred_skills" in ats_details["missing"]:
            for skill in ats_details["missing"]["preferred_skills"]:
                all_preferred_skills[skill] = all_preferred_skills.get(skill, 0) + 1
        if "job_requirements" in ats_details and "all_skills" in ats_details["job_requirements"]:
            all_job_skills.update(ats_details["job_requirements"]["all_skills"])

    job_count = len(jobs_data)
    avg_ats_score = total_ats_scores / job_count if job_count > 0 else 0

    def get_importance(frequency: int) -> str:
        ratio = frequency / job_count
        if ratio >= 0.7:
            return "critical"
        if ratio >= 0.4:
            return "high"
        if ratio >= 0.2:
            return "medium"
        return "low"

    missing_required = [
        {"skill": s, "frequency": c, "importance": get_importance(c)}
        for s, c in sorted(all_required_skills.items(), key=lambda x: x[1], reverse=True)
    ]
    missing_preferred = [
        {"skill": s, "frequency": c, "importance": get_importance(c)}
        for s, c in sorted(all_preferred_skills.items(), key=lambda x: x[1], reverse=True)
    ]

    recommendations = []
    if missing_required:
        critical = [s["skill"] for s in missing_required if s["importance"] == "critical"]
        if critical:
            recommendations.append(
                f"Priority: Learn {', '.join(critical[:3])} - these are required by most opportunities"
            )

    high_value = [s["skill"] for s in missing_required[:5] if s["importance"] in ("high", "critical")]
    if high_value:
        recommendations.append(
            f"Focus on building expertise in {', '.join(high_value)} to improve competitiveness"
        )
    if missing_preferred:
        top_preferred = [s["skill"] for s in missing_preferred[:3]]
        recommendations.append(
            f"Consider learning {', '.join(top_preferred)} as bonus skills to stand out"
        )

    matched_count = len(matched_skills)
    total_unique_jobs_skills = len(all_job_skills)
    if matched_count > 0 and total_unique_jobs_skills > 0:
        coverage = (matched_count / total_unique_jobs_skills) * 100
        recommendations.append(
            f"You have {coverage:.0f}% coverage of skills across saved opportunities"
        )

    if avg_ats_score < 70:
        recommendations.append(
            "Consider tailoring your resume with more relevant keywords and achievements"
        )

    return SkillGapAnalysis(
        resume_id=resume_id,
        resume_name=resume_record["resume_name"],
        skill_analysis={
            "matched_skills": sorted(list(matched_skills)),
            "missing_required_skills": missing_required,
            "missing_preferred_skills": missing_preferred,
            "all_job_skills": sorted(list(all_job_skills)),
            "average_ats_score": round(avg_ats_score, 2),
            "job_count": job_count,
        },
        recommendations=recommendations,
        summary={
            "total_saved_jobs": job_count,
            "average_ats_score": round(avg_ats_score, 2),
            "matched_skills_count": matched_count,
            "missing_required_skills_count": len(all_required_skills),
            "missing_preferred_skills_count": len(all_preferred_skills),
            "critical_skills_to_learn": [s["skill"] for s in missing_required if s["importance"] == "critical"],
        },
    )
