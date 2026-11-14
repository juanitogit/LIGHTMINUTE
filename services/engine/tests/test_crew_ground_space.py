from tether_engine.audit import AuditLog
from tether_engine.crew.attribution import attribute
from tether_engine.ground.delay import PROFILES, triage_routing
from tether_engine.hazards.space_weather import dose_budget, latest_flux, noaa_s_scale


def test_shared_vs_individual_attribution():
    assert attribute({"A": 2.8, "B": 2.5, "C": 0.1, "D": 0.2})["mode"] == "shared"
    assert attribute({"A": 2.4, "B": 0.1, "C": 0.2, "D": 0.0})["mode"] == "individual"
    assert attribute({"A": 0.1, "B": 0.1})["mode"] == "none"


def test_delay_routing_changes_with_distance():
    iss = triage_routing("act", PROFILES["iss"][0])
    mars = triage_routing("act", PROFILES["mars"][1])
    assert not iss["act_onboard_first"] and mars["act_onboard_first"]
    assert mars["message_budget_chars"] == 140
    assert not triage_routing("info", 1320)["send_now"]


def test_s_scale_and_dose_budget():
    assert [noaa_s_scale(x) for x in (1, 10, 150, 5e3, 2e5)] == [0, 1, 2, 3, 5]
    b = dose_budget(100.0, 600.0, 50, 500)
    assert abs(b["fraction_used"] - 1 / 6) < 1e-9 and abs(b["projected_msv"] - 1000) < 1e-6


def test_latest_flux_picks_newest_of_channel():
    rows = [{"time_tag": "t1", "energy": ">=10 MeV", "flux": 5},
            {"time_tag": "t2", "energy": ">=10 MeV", "flux": 120},
            {"time_tag": "t3", "energy": ">=100 MeV", "flux": 1}]
    assert latest_flux(rows) == 120


def test_audit_chain_detects_tampering():
    log = AuditLog()
    for i in range(4): log.append("viewed_card", {"card": i}, ts=1000 + i)
    assert log.verify() is None
    log.entries[2]["payload"]["card"] = 99
    assert log.verify() == 2


def test_one_noisy_healthy_member_is_not_shared():
    # a lone mild wobble (1.7) next to one real shift must stay "individual"
    assert attribute({"A": 3.4, "B": 1.7, "C": 0.2, "D": 0.1})["mode"] == "individual"
