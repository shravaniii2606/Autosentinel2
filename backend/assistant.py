import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

llm_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)

ZONE_FIELD_LABELS = {
    "severity": "Severity",
    "risk_score": "Risk score",
    "violation_type": "Violation type",
    "area_sqm": "Area (sqm)",
    "microsoft_confirmed": "Microsoft building confirmation",
    "ml_confidence": "ML confidence",
    "is_likely_real": "Likely real construction",
    "construction_detected": "Construction detected",
    "objects_found": "Objects found",
    "vision_confidence": "Vision confidence",
    "crane_present": "Crane present",
    "building_present": "Building present",
    "container_present": "Container present",
    "pre_vision_risk_score": "Pre-vision risk score",
    "vision_risk_boost": "Vision risk boost",
    "legal_flags": "Legal flags",
    "risk_boost_total": "Total risk boost",
    "bhuvan_land_type": "Bhuvan land type",
    "bhuvan_overlap_percent": "Bhuvan overlap percent",
    "action": "Recommended action",
}


def _is_empty_zone_value(value) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _format_zone_value(value) -> str:
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (list, tuple, set)):
        formatted_items = [
            _format_zone_value(item)
            for item in value
            if not _is_empty_zone_value(item)
        ]
        return ", ".join(formatted_items)
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return str(value)


def format_zone_facts(zone: dict) -> str:
    facts = []
    for field, label in ZONE_FIELD_LABELS.items():
        value = zone.get(field)
        if _is_empty_zone_value(value):
            continue
        formatted_value = _format_zone_value(value)
        if formatted_value:
            facts.append(f"- {label}: {formatted_value}")
    return "\n".join(facts)


def answer_zone_query(zone: dict, query: str) -> str:
    zone_facts = format_zone_facts(zone)
    system_prompt = (
        "You are AutoSentinel's zone-specific AI assistant for field officers. "
        "Answer ONLY from the zone facts provided below. Do not invent numbers, "
        "sources, coordinates, imagery results, legal findings, or confidence "
        "values. If the facts do not contain the answer, say that the available "
        "zone facts do not include that information. Keep the answer concise and "
        "explain how the listed facts relate to the officer's question.\n\n"
        f"Zone facts:\n{zone_facts}"
    )

    response = llm_client.chat.completions.create(
        model="openai/gpt-4o-mini",
        max_tokens=300,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
    )
    return response.choices[0].message.content or ""

def answer_officer_query(query: str, officer_id: str) -> str:
    system_prompt = (
        "You are AutoSentinel's AI assistant for field officers investigating "
        "illegal construction. Give concise, practical answers. If you do not "
        "have enough information to answer from the user's message, say what "
        "specific zone details or report fields are needed."
    )

    response = llm_client.chat.completions.create(
        model="openai/gpt-4o-mini",
        max_tokens=300,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
    )
    return response.choices[0].message.content or ""
