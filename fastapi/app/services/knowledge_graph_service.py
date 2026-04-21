"""Ollama-based knowledge graph transformer service."""
from __future__ import annotations

import json
from typing import Any, Dict

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.llm import ResumeGraphData


class ResumeGraphExtractionError(ValueError):
    """Raised when resume graph extraction succeeds syntactically but is unusable."""


class KnowledgeGraphService:
    """Service for transforming resume data into knowledge graph structures using Ollama."""

    def __init__(self):
        self.ollama_url = settings.ollama_url
        self.model = settings.ollama_model

    async def transform_resume_to_graph(self, resume_text: str) -> Dict[str, Any]:
        """
        Transform resume text into a structured knowledge graph format.

        Args:
            resume_text: Raw resume text

        Returns:
            Dictionary containing nodes and relationships for Neo4j

        Raises:
            ValueError: If authentication is required (401)
        """
        prompt = f"""Extract information from this resume and return ONLY valid JSON.

Resume:
{resume_text}

Return JSON with this exact structure:
{{"person": {{"name": "...", "email": "...", "phone": "...", "location": "..."}}, "skills": [...], "experiences": [{{"title": "...", "company": "...", "duration": "...", "description": "..."}}], "education": [{{"degree": "...", "institution": "...", "year": "..."}}]}}"""

        async with httpx.AsyncClient(timeout=180.0) as client:
            try:
                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False
                    },
                )
                response.raise_for_status()
                result = response.json()
                llm_response = result.get("response", "")
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    # Get signin URL from error response
                    signin_url = None
                    try:
                        error_data = e.response.json()
                        signin_url = error_data.get("signin_url")
                    except:
                        pass

                    error_msg = "Ollama authentication required"
                    if signin_url:
                        error_msg = f"OLLAMA_AUTH_REQUIRED:{signin_url}"
                    raise ValueError(error_msg)
                raise

        # Parse the JSON response
        try:
            # Try to extract JSON from the response
            json_start = llm_response.find('{')
            json_end = llm_response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = llm_response[json_start:json_end]
                data = json.loads(json_str)
            else:
                data = json.loads(llm_response)
        except (json.JSONDecodeError, ValueError) as exc:
            raise ResumeGraphExtractionError(
                "Resume extraction returned invalid JSON. Please retry with a clearer resume or different file."
            ) from exc

        try:
            validated = ResumeGraphData.model_validate(data)
        except ValidationError as exc:
            raise ResumeGraphExtractionError(
                "Resume extraction returned incomplete data. Please verify the resume contains a readable name and sections."
            ) from exc

        if not validated.person.name.strip():
            raise ResumeGraphExtractionError(
                "Resume extraction did not find a valid person name."
            )

        return validated.model_dump()

    async def create_resume_subgraph(
        self,
        db,
        graph_data: Dict[str, Any],
        *,
        resume_id: str,
        user_id: str,
    ) -> int:
        """
        Create a subgraph in Neo4j from structured resume data.

        Skills, experiences, and education link DIRECTLY to the Resume
        (HAS_SKILL/HAS_EXPERIENCE/HAS_EDUCATION) so they're scoped per
        resume rather than per person. Person is also created and OWNED
        by the user so the same name across users doesn't collide.

        Idempotent: re-running for the same resume_id replaces edges
        without duplicating shared content nodes.
        """
        nodes_created = 0

        person = graph_data.get("person", {})
        person_name = person.get("name", "Unknown")

        # MERGE Person scoped under the user via :OWNS, then refresh Resume
        # contact info on the Person.
        person_query = """
        MATCH (u:User {id: $user_id})
        MERGE (u)-[:OWNS]->(p:Person {name: $name})
        SET p.email = $email,
            p.phone = $phone,
            p.location = $location,
            p.updated_at = datetime()
        WITH p
        MATCH (r:Resume {id: $resume_id})
        MERGE (r)-[:BELONGS_TO]->(p)
        RETURN p
        """
        result = await db.run(
            person_query,
            user_id=user_id,
            resume_id=resume_id,
            name=person_name,
            email=person.get("email"),
            phone=person.get("phone"),
            location=person.get("location"),
        )
        summary = await result.consume()
        nodes_created += summary.counters.nodes_created

        # Replace any existing per-resume edges so re-uploads stay clean.
        await db.run(
            """
            MATCH (r:Resume {id: $resume_id})-[rel:HAS_SKILL|HAS_EXPERIENCE|HAS_EDUCATION]->()
            DELETE rel
            """,
            resume_id=resume_id,
        )

        # Skills (Resume->Skill)
        for skill in graph_data.get("skills", []) or []:
            if isinstance(skill, str) and skill.strip():
                result = await db.run(
                    """
                    MERGE (s:Skill {name: $skill_name})
                    WITH s
                    MATCH (r:Resume {id: $resume_id})
                    MERGE (r)-[rel:HAS_SKILL]->(s)
                    SET rel.created_at = coalesce(rel.created_at, datetime())
                    RETURN s
                    """,
                    skill_name=skill.strip(),
                    resume_id=resume_id,
                )
                summary = await result.consume()
                nodes_created += summary.counters.nodes_created

        # Experiences (Resume->Experience)
        for exp in graph_data.get("experiences", []) or []:
            if isinstance(exp, dict):
                result = await db.run(
                    """
                    MERGE (e:Experience {
                        title: $title,
                        company: $company,
                        duration: $duration,
                        description: $description
                    })
                    ON CREATE SET e.created_at = datetime()
                    WITH e
                    MATCH (r:Resume {id: $resume_id})
                    MERGE (r)-[rel:HAS_EXPERIENCE]->(e)
                    ON CREATE SET rel.created_at = datetime()
                    RETURN e
                    """,
                    title=exp.get("title", ""),
                    company=exp.get("company", ""),
                    duration=exp.get("duration", ""),
                    description=exp.get("description", ""),
                    resume_id=resume_id,
                )
                summary = await result.consume()
                nodes_created += summary.counters.nodes_created

        # Education (Resume->Education)
        for edu in graph_data.get("education", []) or []:
            if isinstance(edu, dict):
                result = await db.run(
                    """
                    MERGE (e:Education {
                        degree: $degree,
                        institution: $institution,
                        year: $year
                    })
                    ON CREATE SET e.created_at = datetime()
                    WITH e
                    MATCH (r:Resume {id: $resume_id})
                    MERGE (r)-[rel:HAS_EDUCATION]->(e)
                    ON CREATE SET rel.created_at = datetime()
                    RETURN e
                    """,
                    degree=edu.get("degree", ""),
                    institution=edu.get("institution", ""),
                    year=edu.get("year", ""),
                    resume_id=resume_id,
                )
                summary = await result.consume()
                nodes_created += summary.counters.nodes_created

        return nodes_created


# Global service instance
knowledge_graph_service = KnowledgeGraphService()
