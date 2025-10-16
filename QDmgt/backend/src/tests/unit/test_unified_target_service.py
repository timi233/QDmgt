"""Unit tests for :mod:`backend.src.services.unified_target_service`."""

from __future__ import annotations

import time
import uuid
from typing import Any

import pytest
from sqlalchemy.orm import Session

from backend.src.models.channel_target import PeriodType, TargetType
from backend.src.services.unified_target_service import UnifiedTargetService
from backend.src.utils.exceptions import ConflictError, NotFoundError, ValidationError


def _as_uuid(value: Any) -> uuid.UUID:
    """Normalize IDs returned from fixtures to ``uuid.UUID`` instances."""

    if isinstance(value, uuid.UUID):
        return value
    return uuid.UUID(str(value))


@pytest.mark.unit
class TestUnifiedTargetService:
    """Test suite covering ``UnifiedTargetService`` operations."""

    def test_create_quarter_target_success(self, db_session: Session, test_admin) -> None:
        admin_id = _as_uuid(test_admin.id)
        owner_id = uuid.uuid4()

        target = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.quarter,
            year=2024,
            quarter=1,
            month=None,
            new_signing_target=100,
            core_opportunity_target=200,
            core_performance_target=300,
            high_value_opportunity_target=400,
            high_value_performance_target=500,
            notes="Quarter goal",
            created_by=admin_id,
        )

        assert target.id is not None
        assert target.target_type is TargetType.person
        assert target.period_type is PeriodType.quarter
        assert target.month is None
        assert target.target_id == owner_id
        assert target.new_signing_target == 100
        assert target.core_opportunity_target == 200
        assert target.core_performance_target == 300
        assert target.high_value_opportunity_target == 400
        assert target.high_value_performance_target == 500
        assert target.notes == "Quarter goal"
        assert target.created_by == admin_id
        assert target.last_modified_by == admin_id

    def test_create_month_target_success(self, db_session: Session, test_admin) -> None:
        admin_id = _as_uuid(test_admin.id)
        owner_id = uuid.uuid4()

        target = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.channel,
            target_id=owner_id,
            period_type=PeriodType.month,
            year=2024,
            quarter=2,
            month=5,
            new_signing_target=10,
            core_opportunity_target=20,
            core_performance_target=30,
            high_value_opportunity_target=40,
            high_value_performance_target=50,
            notes="Monthly goal",
            created_by=admin_id,
        )

        assert target.period_type is PeriodType.month
        assert target.month == 5
        assert target.target_id == owner_id
        assert target.notes == "Monthly goal"

    def test_create_target_invalid_period(self, db_session: Session, test_admin) -> None:
        admin_id = _as_uuid(test_admin.id)
        owner_id = uuid.uuid4()

        with pytest.raises(ValidationError) as quarter_error:
            UnifiedTargetService.create_target(
                db=db_session,
                target_type=TargetType.person,
                target_id=owner_id,
                period_type=PeriodType.quarter,
                year=2024,
                quarter=1,
                month=2,
                new_signing_target=0,
                core_opportunity_target=0,
                core_performance_target=0,
                high_value_opportunity_target=0,
                high_value_performance_target=0,
                notes=None,
                created_by=admin_id,
            )
        assert "Quarterly targets cannot specify a month" in quarter_error.value.detail

        with pytest.raises(ValidationError) as month_error:
            UnifiedTargetService.create_target(
                db=db_session,
                target_type=TargetType.person,
                target_id=owner_id,
                period_type=PeriodType.month,
                year=2024,
                quarter=1,
                month=None,
                new_signing_target=0,
                core_opportunity_target=0,
                core_performance_target=0,
                high_value_opportunity_target=0,
                high_value_performance_target=0,
                notes=None,
                created_by=admin_id,
            )
        assert "Monthly targets must include a month value" in month_error.value.detail

    def test_create_target_duplicate(self, db_session: Session, test_admin) -> None:
        admin_id = _as_uuid(test_admin.id)
        owner_id = uuid.uuid4()

        UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.quarter,
            year=2024,
            quarter=1,
            month=None,
            new_signing_target=100,
            core_opportunity_target=100,
            core_performance_target=100,
            high_value_opportunity_target=100,
            high_value_performance_target=100,
            notes=None,
            created_by=admin_id,
        )

        with pytest.raises(ConflictError):
            UnifiedTargetService.create_target(
                db=db_session,
                target_type=TargetType.person,
                target_id=owner_id,
                period_type=PeriodType.quarter,
                year=2024,
                quarter=1,
                month=None,
                new_signing_target=0,
                core_opportunity_target=0,
                core_performance_target=0,
                high_value_opportunity_target=0,
                high_value_performance_target=0,
                notes=None,
                created_by=admin_id,
            )

    def test_get_target_by_id_success(self, db_session: Session, test_admin) -> None:
        admin_id = _as_uuid(test_admin.id)
        owner_id = uuid.uuid4()

        created = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.quarter,
            year=2023,
            quarter=4,
            month=None,
            new_signing_target=50,
            core_opportunity_target=60,
            core_performance_target=70,
            high_value_opportunity_target=80,
            high_value_performance_target=90,
            notes="Lookup",
            created_by=admin_id,
        )

        fetched = UnifiedTargetService.get_target_by_id(db_session, created.id)
        assert fetched.id == created.id
        assert fetched.notes == "Lookup"

    def test_get_target_by_id_not_found(self, db_session: Session) -> None:
        with pytest.raises(NotFoundError):
            UnifiedTargetService.get_target_by_id(db_session, uuid.uuid4())

    def test_get_targets_with_filters(self, db_session: Session, test_admin) -> None:
        admin_id = _as_uuid(test_admin.id)
        owner_id = uuid.uuid4()
        other_owner = uuid.uuid4()

        quarter_target = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.quarter,
            year=2024,
            quarter=1,
            month=None,
            new_signing_target=100,
            core_opportunity_target=100,
            core_performance_target=100,
            high_value_opportunity_target=100,
            high_value_performance_target=100,
            notes=None,
            created_by=admin_id,
        )
        month_1 = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.month,
            year=2024,
            quarter=1,
            month=2,
            new_signing_target=30,
            core_opportunity_target=40,
            core_performance_target=50,
            high_value_opportunity_target=60,
            high_value_performance_target=70,
            notes="Feb",
            created_by=admin_id,
        )
        month_2 = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.month,
            year=2024,
            quarter=1,
            month=1,
            new_signing_target=20,
            core_opportunity_target=30,
            core_performance_target=40,
            high_value_opportunity_target=50,
            high_value_performance_target=60,
            notes="Jan",
            created_by=admin_id,
        )
        UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.channel,
            target_id=other_owner,
            period_type=PeriodType.month,
            year=2024,
            quarter=2,
            month=4,
            new_signing_target=10,
            core_opportunity_target=10,
            core_performance_target=10,
            high_value_opportunity_target=10,
            high_value_performance_target=10,
            notes=None,
            created_by=admin_id,
        )

        persons, total = UnifiedTargetService.get_targets(
            db=db_session,
            target_type=TargetType.person,
        )
        assert total == 3
        assert all(item.target_type is TargetType.person for item in persons)

        owner_targets, total_owner = UnifiedTargetService.get_targets(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
        )
        assert total_owner == 3
        assert {item.id for item in owner_targets} == {quarter_target.id, month_1.id, month_2.id}

        monthly_only, total_month = UnifiedTargetService.get_targets(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.month,
        )
        assert total_month == 2
        assert set(item.month for item in monthly_only) == {1, 2}

        january, total_jan = UnifiedTargetService.get_targets(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.month,
            month=1,
        )
        assert total_jan == 1
        assert january[0].id == month_2.id

        paged, total_paged = UnifiedTargetService.get_targets(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            skip=1,
            limit=1,
        )
        assert total_paged == 3
        assert len(paged) == 1
        assert paged[0].id in {month_1.id, month_2.id}

    def test_update_target_success(self, db_session: Session, test_admin, test_manager) -> None:
        admin_id = _as_uuid(test_admin.id)
        manager_id = _as_uuid(test_manager.id)
        owner_id = uuid.uuid4()

        target = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.quarter,
            year=2024,
            quarter=1,
            month=None,
            new_signing_target=100,
            core_opportunity_target=100,
            core_performance_target=100,
            high_value_opportunity_target=100,
            high_value_performance_target=100,
            notes="Initial",
            created_by=admin_id,
        )

        original_updated_at = target.updated_at
        time.sleep(1)

        updated = UnifiedTargetService.update_target(
            db=db_session,
            target_id=target.id,
            core_opportunity_target=250,
            high_value_performance_target=350,
            notes="Revised",
            modified_by=manager_id,
        )

        assert updated.core_opportunity_target == 250
        assert updated.high_value_performance_target == 350
        assert updated.notes == "Revised"
        assert updated.last_modified_by == manager_id
        assert updated.updated_at is not None
        if original_updated_at is not None:
            assert updated.updated_at > original_updated_at

    def test_update_achievement_success(self, db_session: Session, test_admin, test_manager) -> None:
        admin_id = _as_uuid(test_admin.id)
        manager_id = _as_uuid(test_manager.id)
        owner_id = uuid.uuid4()

        target = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.month,
            year=2024,
            quarter=1,
            month=1,
            new_signing_target=10,
            core_opportunity_target=20,
            core_performance_target=30,
            high_value_opportunity_target=40,
            high_value_performance_target=50,
            notes=None,
            created_by=admin_id,
        )

        updated = UnifiedTargetService.update_achievement(
            db=db_session,
            target_id=target.id,
            new_signing_achieved=8,
            core_opportunity_achieved=15,
            high_value_performance_achieved=25,
            modified_by=manager_id,
        )

        assert updated.new_signing_achieved == 8
        assert updated.core_opportunity_achieved == 15
        assert updated.high_value_performance_achieved == 25
        assert updated.last_modified_by == manager_id

    def test_calculate_completion(self, db_session: Session, test_admin) -> None:
        admin_id = _as_uuid(test_admin.id)
        owner_id = uuid.uuid4()

        target = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.quarter,
            year=2024,
            quarter=1,
            month=None,
            new_signing_target=100,
            core_opportunity_target=50,
            core_performance_target=80,
            high_value_opportunity_target=40,
            high_value_performance_target=0,
            notes=None,
            created_by=admin_id,
        )

        target.new_signing_achieved = 80
        target.core_opportunity_achieved = 25
        target.core_performance_achieved = 80
        target.high_value_opportunity_achieved = 20
        target.high_value_performance_achieved = 10
        db_session.commit()

        completion = UnifiedTargetService.calculate_completion(target)

        assert completion["new_signing"] == 80.0
        assert completion["core_opportunity"] == 50.0
        assert completion["core_performance"] == 100.0
        assert completion["high_value_opportunity"] == 50.0
        assert completion["high_value_performance"] == 0.0
        assert completion["overall"] == pytest.approx(75.93, rel=1e-3)

    def test_delete_target_success(self, db_session: Session, test_admin) -> None:
        admin_id = _as_uuid(test_admin.id)
        owner_id = uuid.uuid4()

        target = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.month,
            year=2024,
            quarter=1,
            month=1,
            new_signing_target=10,
            core_opportunity_target=10,
            core_performance_target=10,
            high_value_opportunity_target=10,
            high_value_performance_target=10,
            notes=None,
            created_by=admin_id,
        )

        UnifiedTargetService.delete_target(db_session, target.id)

        with pytest.raises(NotFoundError):
            UnifiedTargetService.get_target_by_id(db_session, target.id)

    def test_get_quarter_targets(self, db_session: Session, test_admin) -> None:
        admin_id = _as_uuid(test_admin.id)
        owner_id = uuid.uuid4()

        quarter_target = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.quarter,
            year=2024,
            quarter=1,
            month=None,
            new_signing_target=120,
            core_opportunity_target=130,
            core_performance_target=140,
            high_value_opportunity_target=150,
            high_value_performance_target=160,
            notes="Quarter",
            created_by=admin_id,
        )
        month_1 = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.month,
            year=2024,
            quarter=1,
            month=1,
            new_signing_target=40,
            core_opportunity_target=45,
            core_performance_target=50,
            high_value_opportunity_target=55,
            high_value_performance_target=60,
            notes="Month 1",
            created_by=admin_id,
        )
        month_2 = UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.month,
            year=2024,
            quarter=1,
            month=2,
            new_signing_target=40,
            core_opportunity_target=45,
            core_performance_target=50,
            high_value_opportunity_target=55,
            high_value_performance_target=60,
            notes="Month 2",
            created_by=admin_id,
        )
        UnifiedTargetService.create_target(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            period_type=PeriodType.month,
            year=2024,
            quarter=2,
            month=4,
            new_signing_target=10,
            core_opportunity_target=10,
            core_performance_target=10,
            high_value_opportunity_target=10,
            high_value_performance_target=10,
            notes="Other quarter",
            created_by=admin_id,
        )

        result = UnifiedTargetService.get_quarter_targets(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            year=2024,
            quarter=1,
        )

        assert result["quarter"].id == quarter_target.id
        months = result["months"]
        assert [item.month for item in months] == [1, 2]
        assert {item.id for item in months} == {month_1.id, month_2.id}

    def test_aggregate_achievement(self, db_session: Session, test_admin, test_manager) -> None:
        admin_id = _as_uuid(test_admin.id)
        manager_id = _as_uuid(test_manager.id)
        owner_id = uuid.uuid4()

        month_ids = []
        achievements = [
            (1, dict(new_signing_achieved=10, core_opportunity_achieved=20, core_performance_achieved=30,
                     high_value_opportunity_achieved=40, high_value_performance_achieved=50)),
            (2, dict(new_signing_achieved=15, core_opportunity_achieved=25, core_performance_achieved=35,
                     high_value_opportunity_achieved=45, high_value_performance_achieved=55)),
            (3, dict(new_signing_achieved=5, core_opportunity_achieved=15, core_performance_achieved=25,
                     high_value_opportunity_achieved=35, high_value_performance_achieved=45)),
        ]

        for month, _ in achievements:
            target = UnifiedTargetService.create_target(
                db=db_session,
                target_type=TargetType.person,
                target_id=owner_id,
                period_type=PeriodType.month,
                year=2024,
                quarter=1,
                month=month,
                new_signing_target=10,
                core_opportunity_target=20,
                core_performance_target=30,
                high_value_opportunity_target=40,
                high_value_performance_target=50,
                notes=None,
                created_by=admin_id,
            )
            month_ids.append(target.id)

        for target_id, (_, values) in zip(month_ids, achievements):
            UnifiedTargetService.update_achievement(
                db=db_session,
                target_id=target_id,
                modified_by=manager_id,
                **values,
            )

        aggregated = UnifiedTargetService.aggregate_achievement(
            db=db_session,
            target_type=TargetType.person,
            target_id=owner_id,
            year=2024,
            quarter=1,
        )

        assert aggregated == {
            "new_signing_achieved": 30,
            "core_opportunity_achieved": 60,
            "core_performance_achieved": 90,
            "high_value_opportunity_achieved": 120,
            "high_value_performance_achieved": 150,
        }
