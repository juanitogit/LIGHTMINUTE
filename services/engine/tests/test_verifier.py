from tether_engine.llm.verifier import verify_card

FACTS = {"level": "act", "numbers": {"hr_now": 71.0, "hr_base": 58.9, "z": 3.5}}
KB = {"HRP-IMMUNE-01", "SOP-FEVER-02"}


def good():
    return {"headline": "Resting heart rate is above your normal",
            "what_changed": "HR 71 vs your usual 58.9 (z 3.5).",
            "why_it_matters": "Sustained rises can accompany infection or poor sleep.",
            "confidence": "moderate", "level": "act",
            "do_now": ["Re-measure after 5 min rest"], "monitor": ["Temperature"],
            "escalate_if": ["Fever above threshold"], "ground_message": "HR +12 for 2d",
            "citations": ["HRP-IMMUNE-01"]}


def test_good_card_passes():
    assert verify_card(good(), engine_facts=FACTS, kb_ids=KB) == []


def test_invented_number_rejected():
    c = good(); c["what_changed"] = "HR 80 vs your usual 58.9."
    assert any("80" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_lowered_urgency_rejected():
    c = good(); c["level"] = "info"
    assert any("lowered" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_fake_citation_and_diagnosis_rejected():
    c = good(); c["citations"] = ["MADE-UP-9"]; c["headline"] = "You have an infection"
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("unknown citations" in e for e in errs) and any("diagnostic" in e for e in errs)


def test_template_card_passes_verifier():
    from tether_engine.protocols.templates import template_card
    facts = {"crew": "A", "level": "act", "numbers": {"hr_now": 72.6, "hr_lo": 56.3, "hr_hi": 65.9, "z_dir": 3.5}}
    assert verify_card(template_card(facts), engine_facts=facts, kb_ids={"HRP-RISKS-OVERVIEW"}) == []


def test_negated_diagnosis_wording_is_allowed():
    c = good(); c["why_it_matters"] = "This is a pattern worth checking, not a diagnosis."
    assert verify_card(c, engine_facts=FACTS, kb_ids=KB) == []
