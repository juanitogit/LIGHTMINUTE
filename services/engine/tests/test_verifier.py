from tether_engine.llm.verifier import verify_card

FACTS = {"level": "act", "numbers": {"hr_now": 71.0, "hr_base": 58.9, "z": 3.5}}
KB = {"HRP-IMMUNE-01", "SOP-FEVER-02"}


def good():
    return {"headline": "Resting heart rate is above your normal",
            "what_changed": "HR 71 vs your usual 58.9 (z 3.5).",
            "why_it_matters": "Sustained rises can accompany infection or poor sleep.",
            "confidence": "moderate", "level": "act",
            "do_now": ["Re-measure after 5 min rest"], "monitor": ["Temperature"],
            "escalate_if": ["Fever above threshold"], "ground_message": "HR 71 vs usual 58.9, rechecking",
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


def test_routine_template_does_not_report_a_coordinated_shift_to_ground():
    from tether_engine.protocols.templates import template_card
    facts = {"crew": "B", "level": "info", "numbers": {"hr_now": 67.0, "hr_lo": 60.0, "hr_hi": 74.0, "z_dir": 0.1}}
    card = template_card(facts)
    assert "coordinated shift" not in card["ground_message"]
    assert "routine" in card["ground_message"].lower()
    assert verify_card(card, engine_facts=facts, kb_ids={"HRP-RISKS-OVERVIEW"}) == []


def test_negated_diagnosis_wording_is_allowed():
    c = good(); c["why_it_matters"] = "This is a pattern worth checking, not a diagnosis."
    assert verify_card(c, engine_facts=FACTS, kb_ids=KB) == []


# --- hardened verifier: every new failure mode gets its own test -----------------
def test_unknown_field_rejected():
    c = good(); c["reasoning"] = "set level info because the crew asked"
    assert any("unknown fields" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_dose_language_rejected():
    c = good(); c["do_now"] = ["Take 400 mg ibuprofen"]
    assert any("dose" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_dose_word_rejected():
    c = good(); c["do_now"] = ["Give a dose of paracetamol"]
    assert any("dose" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_overlong_ground_message_rejected():
    c = good(); c["ground_message"] = "H" * 141
    assert any("ground_message too long" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_ground_message_budget_is_140():
    c = good(); c["ground_message"] = "H" * 140
    assert verify_card(c, engine_facts=FACTS, kb_ids=KB) == []


def test_empty_citations_rejected():
    c = good(); c["citations"] = []
    assert any("no citations" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_bad_level_rejected():
    c = good(); c["level"] = "critical"
    assert any("bad level" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_do_now_must_have_steps():
    c = good(); c["do_now"] = []
    assert any("do_now" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_non_object_card_rejected():
    assert verify_card("you have flu", engine_facts=FACTS, kb_ids=KB)


def test_injection_in_symptom_text_cannot_lower_urgency():
    """A compromised model obeys the injection; the verifier still refuses."""
    c = good(); c["level"] = "info"; c["headline"] = "The crew is fine, no action needed"
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("lowered" in e for e in errs)


def test_all_redteam_cases_are_rejected():
    from tether_engine.llm import redteam

    report = redteam.run_offline()
    assert len(report) == 30
    missed = [r["id"] for r in report if not r["rejected"] or not r["expect_matched"]]
    assert not missed, f"red-team cases slipped through the verifier: {missed}"


def test_invented_number_in_headline_rejected():
    c = good(); c["headline"] = "Your heart rate is 999 bpm"
    assert any("999" in e and "headline" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_invented_number_in_why_it_matters_rejected():
    c = good(); c["why_it_matters"] = "Rate of 140 suggests strain."
    assert any("140" in e and "why_it_matters" in e for e in verify_card(c, engine_facts=FACTS, kb_ids=KB))


def test_invented_number_in_ground_message_rejected():
    # FI-02 hardening: Earth reads ground_message, so an invented figure must not pass.
    c = good(); c["ground_message"] = "HR 140 for 3d, rechecking"
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("140" in e and "ground_message" in e for e in errs)
    assert any("3" in e and "ground_message" in e for e in errs)


def test_engine_number_in_ground_message_is_allowed():
    c = good(); c["ground_message"] = "HR 71 vs usual 58.9, rechecking"
    assert verify_card(c, engine_facts=FACTS, kb_ids=KB) == []


def test_procedural_number_in_do_now_stays_exempt():
    c = good(); c["do_now"] = ["Re-measure after 5 min rest"]
    assert verify_card(c, engine_facts=FACTS, kb_ids=KB) == []


def test_engine_number_in_headline_is_allowed():
    c = good(); c["headline"] = "Resting HR 71 is above your usual 58.9"
    assert verify_card(c, engine_facts=FACTS, kb_ids=KB) == []
