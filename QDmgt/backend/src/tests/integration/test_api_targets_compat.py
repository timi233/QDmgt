"""Compatibility tests ensuring legacy ``/targets`` API maps to unified targets."""

from __future__ import annotations

import uuid
from typing import Dict, Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.src.models.channel_target import PeriodType, TargetType, UnifiedTarget


def _legacy_payload(channel_id: uuid.UUID, *, month: int | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "channel_id": str(channel_id),
        "year": 2024,
        "quarter": 1,
        "performance_target": "100000.00",
        "opportunity_target": "50000.00",
        "project_count_target": 10,
        "development_goal": "Legacy goal",
    }
    if month is not None:
        payload["month"] = month
    return payload


def _fetch_unified(db: Session, target_id: str) -> UnifiedTarget:
    return db.query(UnifiedTarget).filter(UnifiedTarget.id == uuid.UUID(target_id)).one()


@pytest.mark.integration
class TestTargetsCompatibility:
    """Legacy API behaviour mapped onto unified targets."""

    def test_legacy_create_maps_to_unified(
        self,
        client: TestClient,
        db_session: Session,
        test_channel,
        auth_headers_admin: dict,
    ) -> None:
        response = client.post("/api/v1/targets/", json=_legacy_payload(test_channel.id), headers=auth_headers_admin)
        assert response.status_code == 200
        data = response.json()

        stored = _fetch_unified(db_session, data["id"])
        assert stored.target_type is TargetType.channel
        assert stored.target_id == uuid.UUID(str(test_channel.id))
        assert stored.period_type is PeriodType.quarter
        assert stored.month is None
        assert stored.new_signing_target == 10
        assert stored.core_opportunity_target == 50000
        assert stored.core_performance_target == 100000
        assert stored.notes == "Legacy goal"

    def test_legacy_get_returns_mapped_data(
        self,
        client: TestClient,
        db_session: Session,
        test_channel,
        auth_headers_admin: dict,
    ) -> None:
        create_resp = client.post(
            "/api/v1/targets/",
            json=_legacy_payload(test_channel.id, month=5),
            headers=auth_headers_admin,
        )
        assert create_resp.status_code == 200
        created = create_resp.json()

        response = client.get(f"/api/v1/targets/{created['id']}", headers=auth_headers_admin)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created["id"]
        assert data["channel_id"] == str(test_channel.id)
        assert data["month"] == 5
        assert data["performance_target"] == "100000.00"
        assert data["opportunity_target"] == "50000.00"
        assert data["project_count_target"] == 10
        assert data["development_goal"] == "Legacy goal"

    def test_legacy_update_maps_fields(
        self,
        client: TestClient,
        db_session: Session,
        test_channel,
        auth_headers_admin: dict,
    ) -> None:
        create_resp = client.post("/api/v1/targets/", json=_legacy_payload(test_channel.id), headers=auth_headers_admin)
        assert create_resp.status_code == 200
        created = create_resp.json()

        update_resp = client.put(
            f"/api/v1/targets/{created['id']}",
            json={
                "performance_target": "200000.00",
                "opportunity_target": "75000.00",
                "project_count_target": 25,
                "development_goal": "Updated goal",
            },
            headers=auth_headers_admin,
        )
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["performance_target"] == "200000.00"
        assert updated["opportunity_target"] == "75000.00"
        assert updated["project_count_target"] == 25
        assert updated["development_goal"] == "Updated goal"

        stored = _fetch_unified(db_session, created["id"])
        assert stored.core_performance_target == 200000
        assert stored.core_opportunity_target == 75000
        assert stored.new_signing_target == 25
        assert stored.notes == "Updated goal"

    def test_legacy_achievement_update(
        self,
        client: TestClient,
        db_session: Session,
        test_channel,
        auth_headers_admin: dict,
    ) -> None:
        create_resp = client.post("/api/v1/targets/", json=_legacy_payload(test_channel.id), headers=auth_headers_admin)
        assert create_resp.status_code == 200
        created = create_resp.json()

        patch_resp = client.patch(
            f"/api/v1/targets/{created['id']}/achievement",
            json={
                "achieved_performance": "12345.00",
                "achieved_opportunity": "6789.00",
                "achieved_project_count": 4,
            },
            headers=auth_headers_admin,
        )
        assert patch_resp.status_code == 200
        data = patch_resp.json()
        assert data["achieved_performance"] == "12345.00"
        assert data["achieved_opportunity"] == "6789.00"
        assert data["achieved_project_count"] == 4

        stored = _fetch_unified(db_session, created["id"])
        assert stored.core_performance_achieved == 12345
        assert stored.core_opportunity_achieved == 6789
        assert stored.new_signing_achieved == 4

    def test_legacy_completion_calculation(
        self,
        client: TestClient,
        test_channel,
        auth_headers_admin: dict,
    ) -> None:
        create_resp = client.post("/api/v1/targets/", json=_legacy_payload(test_channel.id), headers=auth_headers_admin)
        assert create_resp.status_code == 200
        created = create_resp.json()

        client.patch(
            f"/api/v1/targets/{created['id']}/achievement",
            json={
                "achieved_performance": "50000.00",
                "achieved_opportunity": "25000.00",
                "achieved_project_count": 5,
            },
            headers=auth_headers_admin,
        )

        response = client.get(f"/api/v1/targets/{created['id']}/completion", headers=auth_headers_admin)
        assert response.status_code == 200
        completion = response.json()
        assert completion["target_plan_id"] == created["id"]
        metrics = completion["completion_percentages"]
        assert metrics["core_performance"] == 50.0
        assert metrics["core_opportunity"] == 50.0
        assert metrics["new_signing"] == 50.0
        assert metrics["overall"] == pytest.approx(50.0, rel=1e-3)
