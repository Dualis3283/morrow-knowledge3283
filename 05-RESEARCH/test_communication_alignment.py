import unittest
from communication_alignment import Proposal, ContextCheck, decide, decide_with_resolution

class AlignmentTests(unittest.TestCase):
    def p(self,intent="information",**kw):
        return Proposal(intent,kw.pop("understood_scope","review issue"),kw.pop("ambiguity","none"),**kw)
    def c(self,**kw):
        return ContextCheck(kw.pop("recovered",True),**kw)
    def check(self,expected,p,c=None):
        result=decide(p,c or self.c())
        self.assertEqual(result["disposition"],expected)
        self.assertFalse(result["execution_verified"])
        self.assertFalse(result["action_authorized"])
        self.assertEqual(result["execution_candidate"],expected=="execution_candidate")
        return result
    def test_clear_query(self): self.check("direct_response",self.p())
    def test_conversation_not_execution(self):
        self.check("direct_response",self.p("conversation"))
    def test_recommendation_not_execution(self):
        self.check("direct_response",self.p("recommendation"))
    def test_substantial_review(self):
        self.check("acknowledge_and_proceed",self.p("assessment",substantial=True))
    def test_recover_before_asking(self):
        self.check("recover_context",self.p(ambiguity="material"),self.c(recovered=False))
    def test_material_ambiguity(self):
        result=self.check("clarify",self.p(ambiguity="material",clarification_question="Presence or login?"))
        self.assertEqual(result["question"],"Presence or login?")
    def test_minor_reversible(self):
        self.check("state_assumption",self.p(ambiguity="minor",assumption="Use current version"))
    def test_minor_expensive(self):
        self.check("clarify",self.p(ambiguity="minor",expensive=True,assumption="Use current version"))
    def test_missing_assumption(self):
        self.check("clarify",self.p(ambiguity="minor"))
    def test_minor_irreversible(self):
        self.check("clarify",self.p(ambiguity="minor",reversible=False,assumption="Current version"))
    def test_correction(self):
        self.check("reconcile_correction",self.p("correction"),self.c(current_correction_conflict=True))
    def test_missing_referent(self):
        self.check("clarify",self.p("execution"),self.c())
    def test_execution_without_authority(self):
        self.check("verify_authority",self.p("execution"),self.c(target_resolved=True))
    def test_execution_without_target_verification(self):
        self.check("verify_authority",self.p("execution"),self.c(target_resolved=True,explicit_scope=True,authority_verified=True))
    def test_execution_ready(self):
        self.check("execution_candidate",self.p("execution"),self.c(target_resolved=True,explicit_scope=True,authority_verified=True,target_verified=True))
    def test_checkpoint_write_requires_authority(self):
        self.check("verify_authority",self.p("checkpoint"),self.c(target_resolved=True))
    def test_minor_action_not_authorized(self):
        self.check("clarify",self.p("execution",ambiguity="minor"),self.c(target_resolved=True,explicit_scope=True,authority_verified=True,target_verified=True))
    def test_scope_empty(self):
        self.check("clarify",self.p(understood_scope=""))
    def test_invalid_intent(self):
        with self.assertRaises(ValueError): decide(self.p("guess"),self.c())
    def test_invalid_policy_boolean(self):
        with self.assertRaises(ValueError): decide(self.p(),self.c(recovered="yes"))
    def test_explicit_information_not_action(self):
        self.check("direct_response",self.p("information"),self.c(target_resolved=True,explicit_scope=True,authority_verified=True,target_verified=True))

    def test_bound_resolver_scope(self):
        p=self.p("execution")
        c=self.c(target_resolved=True,explicit_scope=True,authority_verified=True,target_verified=True)
        result=decide_with_resolution(p,c,{"outcome":"accepted","scope":"website","entity_id":"morrow"},
                                      scope="morrow",expected_entity_id="morrow")
        self.assertEqual(result["disposition"],"clarify")
        self.assertFalse(result["action_authorized"])
    def test_bound_resolver_correct_target(self):
        p=self.p("execution")
        c=self.c(target_resolved=True,explicit_scope=True,authority_verified=True,target_verified=True)
        result=decide_with_resolution(p,c,{"outcome":"accepted","scope":"morrow","entity_id":"morrow"},
                                      scope="morrow",expected_entity_id="morrow")
        self.assertTrue(result["execution_candidate"])
        self.assertFalse(result["action_authorized"])
