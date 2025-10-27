"""Integration tests for unified target FastAPI endpoints."""

from __future__ import annotations

import uuid
from typing import Dict

import pytest
from fastapi.testclient import TestClient

from backend.src.auth.auth_service import AuthManager
from backend.src.models.user import User


def _make_auth_headers(user: User, auth_manager: AuthManager) -> Dict[str, str]:
    token = auth_manager.create_access_token(
        {
            "sub": str(user.id),
            "username": user.username,
            "id": str(user.id),
            "role": user.role.value,
        }
    )
    return {"Authorization": f"Bearer {token}"}


def _create_target_payload(target_id: uuid.UUID, *, month: int | None = None) -> Dict[str, object]:
    payload = {
        "target_type": "person",
        "target_id": str(target_id),
        "period_type": "quarter" if month is None else "month",
        "year": 2024,
        "quarter": 1,
        "month": month,
        "new_signing_target": 100,
        "core_opportunity_target": 200,
        "core_performance_target": 300,
        "high_value_opportunity_target": 400,
        "high_value_performance_target": 500,
        "notes": "auto",
    }
    return payload


@pytest.fixture
def admin_headers(test_admin: User, auth_manager: AuthManager) -> Dict[str, str]:
    return _make_auth_headers(test_admin, auth_manager)


@pytest.fixture
def manager_headers(test_manager: User, auth_manager: AuthManager) -> Dict[str, str]:
    return _make_auth_headers(test_manager, auth_manager)


@pytest.mark.integration
class TestUnifiedTargetsAPI:
    """Validate ``/api/v1/unified-targets`` endpoints."""

    def test_create_target_success(self, client: TestClient, admin_headers: Dict[str, str]) -> None:
        owner_id = uuid.uuid4()
        response = client.post(
            "/api/v1/unified-targets/",
            json=_create_target_payload(owner_id),
            headers=admin_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["target_type"] == "person"
        assert data["period_type"] == "quarter"
        assert data["month"] is None
        assert data["target_id"] == str(owner_id)
        assert data["new_signing_target"] == 100
        assert "id" in data

    def test_create_target_validation_error(self, client: TestClient, admin_headers: Dict[str, str]) -> None:
        owner_id = uuid.uuid4()

        invalid_period = client.post(
            "/api/v1/unified-targets/",
            json={**_create_target_payload(owner_id), "period_type": "weekly"},
            headers=admin_headers,
        )
        assert invalid_period.status_code == 422

        mismatch = client.post(
            "/api/v1/unified-targets/",
            json={**_create_target_payload(owner_id), "month": 4},
            headers=admin_headers,
        )
        assert mismatch.status_code == 422
        assert "Quarterly targets cannot specify a month" in mismatch.json()["detail"]

    def test_get_targets_list(self, client: TestClient, admin_headers: Dict[str, str]) -> None:
        owner_id = uuid.uuid4()
        other_owner = uuid.uuid4()

        # Create a quarter target and two monthly targets for the same owner
        first_resp = client.post(
            "/api/v1/unified-targets/",
            json=_create_target_payload(owner_id),
            headers=admin_headers,
        )
        assert first_resp.status_code == 201
        first = first_resp.json()

        for payload in (
            _create_target_payload(owner_id, month=1),
            _create_target_payload(owner_id, month=2),
            _create_target_payload(other_owner, month=4),
        ):
            created = client.post(
                "/api/v1/unified-targets/",
                json=payload,
                headers=admin_headers,
            )
            assert created.status_code == 201

        response = client.get("/api/v1/unified-targets/", headers=admin_headers)
        assert response.status_code == 200
        payload = response.json()
        assert payload["total"] == 4
        assert len(payload["targets"]) == 4

        filtered = client.get(
            "/api/v1/unified-targets/",
            params={
                "target_type": "person",
                "target_id": str(owner_id),
                "period_type": "month",
            },
            headers=admin_headers,
        )
        assert filtered.status_code == 200
        filtered_payload = filtered.json()
        assert filtered_payload["total"] == 2
        assert all(item["period_type"] == "month" for item in filtered_payload["targets"])

        paged = client.get(
            "/api/v1/unified-targets/",
            params={"target_type": "person", "target_id": str(owner_id), "skip": 1, "limit": 1},
            headers=admin_headers,
        )
        assert paged.status_code == 200
        paged_payload = paged.json()
        assert paged_payload["total"] == 3
        assert len(paged_payload["targets"]) == 1

        quarter_only = client.get(
            "/api/v1/unified-targets/",
            params={"period_type": "quarter", "target_id": str(owner_id)},
            headers=admin_headers,
        )
        assert quarter_only.status_code == 200
        assert quarter_only.json()["targets"][0]["id"] == first["id"]

    def test_get_target_by_id(self, client: TestClient, admin_headers: Dict[str, str]) -> None:
        owner_id = uuid.uuid4()
        create_resp = client.post(
            "/api/v1/unified-targets/",
            json=_create_target_payload(owner_id),
            headers=admin_headers,
        )
        assert create_resp.status_code == 201
        created = create_resp.json()

        response = client.get(f"/api/v1/unified-targets/{created['id']}", headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["id"] == created["id"]

        missing = client.get(f"/api/v1/unified-targets/{uuid.uuid4()}", headers=admin_headers)
        assert missing.status_code == 404

    def test_update_target(self, client: TestClient, admin_headers: Dict[str, str]) -> None:
        owner_id = uuid.uuid4()
        create_resp = client.post(
            "/api/v1/unified-targets/",
            json=_create_target_payload(owner_id),
            headers=admin_headers,
        )
        assert create_resp.status_code == 201
        created = create_resp.json()

        update_response = client.put(
            f"/api/v1/unified-targets/{created['id']}",
            json={"core_performance_target": 999, "notes": "changed"},
            headers=admin_headers,
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["core_performance_target"] == 999
        assert updated["notes"] == "changed"

        missing = client.put(
            f"/api/v1/unified-targets/{uuid.uuid4()}",
            json={"new_signing_target": 1},
            headers=admin_headers,
        )
        assert missing.status_code == 404

    def test_update_achievement(self, client: TestClient, admin_headers: Dict[str, str], manager_headers: Dict[str, str]) -> None:
        owner_id = uuid.uuid4()
        create_resp = client.post(
            "/api/v1/unified-targets/",
            json=_create_target_payload(owner_id, month=1),
            headers=admin_headers,
        )
        assert create_resp.status_code == 201
        created = create_resp.json()

        response = client.patch(
            f"/api/v1/unified-targets/{created['id']}/achievement",
            json={"new_signing_achieved": 50, "high_value_performance_achieved": 25},
            headers=manager_headers,
        )
        assert response.status_code == 200
        achievement = response.json()
        assert achievement["new_signing_achieved"] == 50
        assert achievement["high_value_performance_achieved"] == 25

    def test_get_completion(self, client: TestClient, admin_headers: Dict[str, str]) -> None:
        owner_id = uuid.uuid4()
        payload = _create_target_payload(owner_id)
        payload.update(
            {
                "new_signing_target": 100,
                "core_opportunity_target": 50,
                "core_performance_target": 0,
                "high_value_opportunity_target": 0,
                "high_value_performance_target": 0,
            }
        )
        create_resp = client.post(
            "/api/v1/unified-targets/",
            json=payload,
            headers=admin_headers,
        )
        assert create_resp.status_code == 201
        created = create_resp.json()

        client.patch(
            f"/api/v1/unified-targets/{created['id']}/achievement",
            json={"new_signing_achieved": 60, "core_opportunity_achieved": 25},
            headers=admin_headers,
        )

        response = client.get(f"/api/v1/unified-targets/{created['id']}/completion", headers=admin_headers)
        assert response.status_code == 200
        completion = response.json()["completion"]
        assert completion["new_signing"] == 60.0
        assert completion["core_opportunity"] == 50.0
        expected_overall = round((60 + 25) / (100 + 50) * 100, 2)
        assert completion["overall"] == pytest.approx(expected_overall, rel=1e-3)

    def test_delete_target(self, client: TestClient, admin_headers: Dict[str, str]) -> None:
        owner_id = uuid.uuid4()
        create_resp = client.post(
            "/api/v1/unified-targets/",
            json=_create_target_payload(owner_id),
            headers=admin_headers,
        )
        assert create_resp.status_code == 201
        created = create_resp.json()

        delete_response = client.delete(f"/api/v1/unified-targets/{created['id']}", headers=admin_headers)
        assert delete_response.status_code == 204

        second = client.delete(f"/api/v1/unified-targets/{created['id']}", headers=admin_headers)
        assert second.status_code == 404

    def test_quarter_view(self, client: TestClient, admin_headers: Dict[str, str]) -> None:
        owner_id = uuid.uuid4()
        quarter_resp = client.post(
            "/api/v1/unified-targets/",
            json=_create_target_payload(owner_id),
            headers=admin_headers,
        )
        assert quarter_resp.status_code == 201
        quarter = quarter_resp.json()
        month1_resp = client.post(
            "/api/v1/unified-targets/",
            json=_create_target_payload(owner_id, month=1),
            headers=admin_headers,
        )
        assert month1_resp.status_code == 201
        month_1 = month1_resp.json()
        month2_resp = client.post(
            "/api/v1/unified-targets/",
            json=_create_target_payload(owner_id, month=2),
            headers=admin_headers,
        )
        assert month2_resp.status_code == 201
        month_2 = month2_resp.json()

        response = client.get(
            "/api/v1/unified-targets/quarter-view",
            params={
                "target_type": "person",
                "target_id": str(owner_id),
                "year": 2024,
                "quarter": 1,
            },
            headers=admin_headers,
        )

        assert response.status_code == 200, response.json()
        data = response.json()
        assert data["quarter"]["id"] == quarter["id"]
        assert {item["id"] for item in data["months"]} == {month_1["id"], month_2["id"]}
