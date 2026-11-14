from tether_engine.llm.verifier import verify_card
from tether_engine.protocols.templates import template_card

FACTS = {"level": "act", "numbers": {"hr_now": 71.0, "hr_base": 58.9, "z": 3.5}}
KB = {"HRP-IMMUNE-01", "SOP-FEVER-02"}


def good():
    tmpl_facts = {"crew": "A", "level": "act", "numbers": FACTS["numbers"],
                  "confidence": "moderate", "learning": False, "attribution": {}}
    tmpl = template_card(tmpl_facts)
    return {"headline": "Resting heart rate is above your normal",
            "what_changed": tmpl["what_changed"],
            "why_it_matters": "Sustained rises can accompany infection or poor sleep.",
            "confidence": "moderate", "level": "act",
            "do_now": list(tmpl["do_now"]), "monitor": list(tmpl["monitor"]),
            "escalate_if": list(tmpl["escalate_if"]), "ground_message": tmpl["ground_message"],
            "citations": ["HRP-IMMUNE-01"]}


def test_good_card_passes():
    assert verify_card(good(), engine_facts=FACTS, kb_ids=KB) == []


def test_invented_number_rejected():
    c = good(); c["what_changed"] = "HR 80 vs your usual 58.9."
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert errs and any("what_changed must equal" in e for e in errs)


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
    c = good()
    assert len(c["ground_message"]) <= 140
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
    assert len(report) == 39
    missed = [r["id"] for r in report if not r["rejected"] or not r["expect_matched"]]
    assert not missed, f"red-team cases slipped through the verifier: {missed}"


# --- all-visible-text and malformed-input hardening ---------------------------
def test_headline_number_rejected():
    c = good(); c["headline"] = "HR 999, heart rate is critical"
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("numeric content not allowed" in e for e in errs)


def test_do_now_diagnosis_rejected():
    c = good(); c["do_now"] = ["You have confirmed infection"]
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("diagnostic" in e for e in errs)


def test_ground_message_number_rejected():
    c = good(); c["ground_message"] = "HR 999; immediate evacuation required now"
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("numeric content not allowed" in e for e in errs)


def test_monitor_number_rejected():
    c = good(); c["monitor"] = ["Temperature 39.4"]
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("numeric content not allowed" in e for e in errs)


def test_escalate_if_diagnosis_rejected():
    c = good(); c["escalate_if"] = ["You have an infection"]
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("diagnostic" in e for e in errs)


def test_unhashable_citation_does_not_crash():
    c = good(); c["citations"] = [{}]
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert errs  # rejected
    assert all(isinstance(e, str) for e in errs)


def test_malformed_card_never_crashes():
    cases = [None, 42, "text", [], {"level": "act"}, good()]
    # corrupt the good one
    bad = good()
    bad["citations"] = [object()]
    cases.append(bad)
    for case in cases:
        try:
            res = verify_card(case, engine_facts=FACTS, kb_ids=KB)
        except Exception as exc:  # noqa: BLE001
            raise AssertionError(f"verifier crashed: {exc}") from exc
        assert isinstance(res, list)


def test_citations_exempt_from_numeric_scan():
    # A citation id containing digits must not be treated as an invented number.
    c = good()
    c["citations"] = ["HRP-IMMUNE-01"]
    kb = set(KB) | {"HRP-IMMUNE-01"}
    assert verify_card(c, engine_facts=FACTS, kb_ids=kb) == []


# --- review round 2: exact level, sign, identifiers, scientific notation ------
def test_raised_urgency_rejected():
    c = good(); c["level"] = "escalate"
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("raised" in e for e in errs)


def test_sign_inversion_rejected():
    c = good(); c["what_changed"] = "HR -3.5 vs your usual band."
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("what_changed must equal" in e for e in errs)


def test_scientific_notation_rejected():
    c = good(); c["what_changed"] = "HR 1e3 vs your usual band."
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("what_changed must equal" in e for e in errs)


def test_embedded_identifier_digits_are_not_numbers():
    c = good(); c["headline"] = "CO2 exposure noted"
    assert verify_card(c, engine_facts=FACTS, kb_ids=KB) == []


def test_hr999_with_space_rejected():
    c = good(); c["headline"] = "HR 999, heart rate is critical"
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("999" in e for e in errs)


# --- round 4 regression: deterministic actions -------------------------------
def test_take_two_tablets_action_rejected():
    c = good(); c["do_now"] = ["Take two tablets"]
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert errs  # do_now must equal deterministic template


def test_suffering_from_influenza_action_rejected():
    c = good(); c["do_now"] = ["You are suffering from influenza"]
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert errs and any("diagnostic" in e or "do_now must equal" in e for e in errs)


def test_suffering_from_in_headline_rejected():
    c = good(); c["headline"] = "You are suffering from influenza"
    errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
    assert any("diagnostic" in e for e in errs)


def test_confidence_must_equal_engine_confidence():
    facts = {**FACTS, "confidence": "low"}
    c = good()
    for confidence in ("moderate", "high"):
        c["confidence"] = confidence
        assert any("confidence" in e for e in verify_card(c, engine_facts=facts, kb_ids=KB))


def test_missing_or_invalid_engine_facts_are_rejected():
    invalid = [None, [], {}, {"level": "bogus", "numbers": {}},
               {"level": "act"}, {"level": "act", "numbers": []},
               {"level": "act", "numbers": {"x": "71"}},
               {"level": "act", "numbers": {"x": True}},
               {"level": "act", "numbers": {"x": float("nan")}},
               {"level": "act", "numbers": {"x": float("inf")}},
               {"level": "act", "numbers": {}, "confidence": "certain"}]
    for facts in invalid:
        errs = verify_card(good(), engine_facts=facts, kb_ids=KB)
        assert any("engine facts" in e for e in errs), (facts, errs)


def test_spelled_medication_amounts_are_rejected_in_free_text():
    for field in ("headline", "why_it_matters"):
        for instruction in ("Take two tablets", "Take a capsule", "Use five mg", "Take two drops"):
            c = good(); c[field] = instruction
            errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
            assert any("dose" in e for e in errs), (field, instruction, errs)


def test_assertive_diagnosis_is_rejected_in_free_text():
    for field in ("headline", "why_it_matters"):
        for assertion in ("This is influenza", "It is an infection", "This is sepsis"):
            c = good(); c[field] = assertion
            errs = verify_card(c, engine_facts=FACTS, kb_ids=KB)
            assert any("diagnostic" in e for e in errs), (field, assertion, errs)


def test_template_is_constructed_once_per_verification():
    from tether_engine.llm import verifier
    old = verifier._template_card
    calls = []
    def counted(facts):
        calls.append(1)
        return old(facts)
    verifier._template_card = counted
    try:
        assert verify_card(good(), engine_facts=FACTS, kb_ids=KB) == []
        assert len(calls) == 1
    finally:
        verifier._template_card = old
