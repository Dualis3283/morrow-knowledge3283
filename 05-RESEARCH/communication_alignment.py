"""Candidate communication alignment gate. Model proposals are not authority."""
from dataclasses import dataclass
from typing import Literal

INTENTS = frozenset(("conversation","information","exploration","assessment","recommendation",
                    "execution","correction","checkpoint"))
MUTATING = frozenset(("execution","checkpoint"))

@dataclass(frozen=True)
class Proposal:
    intent: str
    understood_scope: str
    ambiguity: Literal["none","minor","material"]
    clarification_question: str = ""
    assumption: str = ""
    substantial: bool = False
    expensive: bool = False
    consequential: bool = False
    reversible: bool = True

@dataclass(frozen=True)
class ContextCheck:
    # Populated by trusted orchestration, not model-generated candidate text.
    recovered: bool
    target_required: bool = False
    target_resolved: bool = False
    explicit_scope: bool = False
    authority_verified: bool = False
    target_verified: bool = False
    current_correction_conflict: bool = False

def decide(p: Proposal, c: ContextCheck):
    if p.intent not in INTENTS or p.ambiguity not in {"none","minor","material"}:
        raise ValueError("unknown intent or ambiguity")
    if not isinstance(p.understood_scope,str) or not isinstance(p.clarification_question,str) or not isinstance(p.assumption,str):
        raise ValueError("scope, clarification and assumption must be text")
    for obj in (p,c):
        for name, field in obj.__dataclass_fields__.items():
            if field.type is bool and type(getattr(obj,name)) is not bool:
                raise ValueError("boolean policy inputs required")
    def response(disposition, reason, question=None):
        return {"disposition":disposition,"reason":reason,
                "intent":p.intent,"understood_scope":p.understood_scope,
                "question":question,"assumption":p.assumption if disposition=="state_assumption" else None,
                "execution_candidate":disposition=="execution_candidate",
                "action_authorized":False,
                "execution_verified":False}
    if not c.recovered:
        return response("recover_context","recover existing context before clarification")
    if c.current_correction_conflict:
        return response("reconcile_correction","current correction overrides prior assumption")
    needs_target=c.target_required or p.intent in MUTATING
    if p.ambiguity=="material" or (needs_target and not c.target_resolved) or not p.understood_scope.strip():
        return response("clarify","material uncertainty or unresolved target",
                        p.clarification_question.strip() or "Which specific subject or outcome do you mean?")
    if p.intent in MUTATING:
        if p.ambiguity!="none":
            return response("clarify","resolve uncertainty before persistent action",
                            p.clarification_question.strip() or "Can you confirm the intended action and scope?")
        if not (c.explicit_scope and c.authority_verified and c.target_verified):
            return response("verify_authority","scope, permission or target not verified")
        return response("execution_candidate","verified scope and authority; still requires executor checks")
    if p.ambiguity=="minor":
        if p.expensive or p.consequential or not p.reversible or not p.assumption.strip():
            return response("clarify","uncertainty could cause material rework",
                            p.clarification_question.strip() or "Which interpretation should I use?")
        return response("state_assumption","minor reversible uncertainty")
    if p.substantial or p.expensive or p.consequential:
        return response("acknowledge_and_proceed","clear substantive scope")
    return response("direct_response","clear low-cost intent")

def decide_with_resolution(p, c, resolution, *, scope, expected_entity_id):
    """Bind candidate to resolver output, not a model's self-declared match.

    Caller still independently verifies permission, exact action target and version.
    """
    from dataclasses import replace
    matched = (isinstance(resolution,dict) and resolution.get("outcome")=="accepted"
               and isinstance(expected_entity_id,str) and bool(expected_entity_id.strip())
               and resolution.get("entity_id")==expected_entity_id and resolution.get("scope")==scope)
    return decide(p,replace(c,target_required=True,target_resolved=matched,
                            target_verified=c.target_verified and matched))
