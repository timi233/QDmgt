from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from ..models.channel_target import TargetPlan
from ..models.channel import Channel
from ..utils.exceptions import ValidationError, NotFoundError, ConflictError
from ..utils.validators import validate_quarter, validate_month
import uuid
from decimal import Decimal


class TargetService:
    @staticmethod
    def create_target_plan(
        db: Session,
        channel_id: uuid.UUID,
        year: int,
        quarter: int,
        performance_target: Optional[Decimal],
        opportunity_target: Optional[Decimal],
        project_count_target: Optional[int],
        development_goal: Optional[str],
        created_by: uuid.UUID,
        month: Optional[int] = None
    ) -> TargetPlan:
        # Validate quarter
        validate_quarter(quarter)

        # Validate month if provided
        if month is not None:
            validate_month(month)

        # Convert UUID to string for SQLite compatibility
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id
        created_by_str = str(created_by) if isinstance(created_by, uuid.UUID) else created_by

        # Check if a target plan already exists for this channel and time period
        existing_plan = db.query(TargetPlan).filter(
            and_(
                TargetPlan.channel_id == channel_id_str,
                TargetPlan.year == year,
                TargetPlan.quarter == quarter,
                TargetPlan.month == (month if month is not None else None)
            )
        ).first()

        if existing_plan:
            raise ConflictError(
                f"Target plan already exists for channel {channel_id} in {year} Q{quarter}"
            )

        target_plan = TargetPlan(
            id=str(uuid.uuid4()),  # Explicitly set ID as string
            channel_id=channel_id_str,
            year=year,
            quarter=quarter,
            month=month,
            performance_target=performance_target,
            opportunity_target=opportunity_target,
            project_count_target=project_count_target,
            development_goal=development_goal,
            created_by=created_by_str
        )

        db.add(target_plan)
        db.commit()
        db.refresh(target_plan)

        return target_plan

    @staticmethod
    def get_target_plan_by_id(db: Session, target_plan_id: uuid.UUID) -> Optional[TargetPlan]:
        target_plan_id_str = str(target_plan_id) if isinstance(target_plan_id, uuid.UUID) else target_plan_id
        return db.query(TargetPlan).filter(TargetPlan.id == target_plan_id_str).first()

    @staticmethod
    def get_target_plans_by_channel(
        db: Session,
        channel_id: uuid.UUID,
        year: Optional[int] = None,
        quarter: Optional[int] = None
    ) -> List[TargetPlan]:
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id
        query = db.query(TargetPlan).filter(TargetPlan.channel_id == channel_id_str)

        if year is not None:
            query = query.filter(TargetPlan.year == year)

        if quarter is not None:
            query = query.filter(TargetPlan.quarter == quarter)

        return query.all()

    @staticmethod
    def update_target_plan(
        db: Session,
        target_plan_id: uuid.UUID,
        performance_target: Optional[Decimal] = None,
        opportunity_target: Optional[Decimal] = None,
        project_count_target: Optional[int] = None,
        development_goal: Optional[str] = None
    ) -> Optional[TargetPlan]:
        target_plan_id_str = str(target_plan_id) if isinstance(target_plan_id, uuid.UUID) else target_plan_id
        target_plan = db.query(TargetPlan).filter(TargetPlan.id == target_plan_id_str).first()
        if not target_plan:
            return None

        # Update fields if provided
        if performance_target is not None:
            target_plan.performance_target = performance_target
        if opportunity_target is not None:
            target_plan.opportunity_target = opportunity_target
        if project_count_target is not None:
            target_plan.project_count_target = project_count_target
        if development_goal is not None:
            target_plan.development_goal = development_goal

        db.commit()
        db.refresh(target_plan)

        return target_plan

    @staticmethod
    def update_target_achievement(
        db: Session,
        target_plan_id: uuid.UUID,
        achieved_performance: Optional[Decimal] = None,
        achieved_opportunity: Optional[Decimal] = None,
        achieved_project_count: Optional[int] = None
    ) -> Optional[TargetPlan]:
        target_plan_id_str = str(target_plan_id) if isinstance(target_plan_id, uuid.UUID) else target_plan_id
        target_plan = db.query(TargetPlan).filter(TargetPlan.id == target_plan_id_str).first()
        if not target_plan:
            return None

        # Update achievement fields if provided
        if achieved_performance is not None:
            target_plan.achieved_performance = achieved_performance
        if achieved_opportunity is not None:
            target_plan.achieved_opportunity = achieved_opportunity
        if achieved_project_count is not None:
            target_plan.achieved_project_count = achieved_project_count

        db.commit()
        db.refresh(target_plan)

        return target_plan

    @staticmethod
    def calculate_completion_percentage(target_plan: TargetPlan) -> dict:
        """Calculate completion percentage for all metrics"""
        result = {}
        
        # Performance completion
        if target_plan.performance_target and target_plan.performance_target > 0:
            performance_pct = float(
                (target_plan.achieved_performance or 0) / target_plan.performance_target * 100
            )
            result['performance'] = round(performance_pct, 2)
        else:
            result['performance'] = 0.0
        
        # Opportunity completion
        if target_plan.opportunity_target and target_plan.opportunity_target > 0:
            opportunity_pct = float(
                (target_plan.achieved_opportunity or 0) / target_plan.opportunity_target * 100
            )
            result['opportunity'] = round(opportunity_pct, 2)
        else:
            result['opportunity'] = 0.0
        
        # Project count completion
        if target_plan.project_count_target and target_plan.project_count_target > 0:
            project_count_pct = float(
                (target_plan.achieved_project_count or 0) / target_plan.project_count_target * 100
            )
            result['project_count'] = round(project_count_pct, 2)
        else:
            result['project_count'] = 0.0
        
        # Average completion
        if result:
            avg_completion = sum(result.values()) / len(result)
            result['average'] = round(avg_completion, 2)
        else:
            result['average'] = 0.0
        
        return result

    @staticmethod
    def calculate_channel_completion_percentage(db: Session, channel_id: uuid.UUID) -> dict:
        """Calculate overall completion percentage for a channel based on all its targets"""
        channel_id_str = str(channel_id) if isinstance(channel_id, uuid.UUID) else channel_id
        target_plans = db.query(TargetPlan).filter(TargetPlan.channel_id == channel_id_str).all()
        
        if not target_plans:
            return {
                "channel_id": channel_id,
                "overall_completion": 0.0,
                "target_breakdown": []
            }
        
        total_performance_target = 0
        total_performance_achieved = 0
        total_opportunity_target = 0
        total_opportunity_achieved = 0
        total_project_count_target = 0
        total_project_count_achieved = 0
        
        target_breakdown = []
        
        for target_plan in target_plans:
            # Add to totals for overall calculation
            if target_plan.performance_target:
                total_performance_target += float(target_plan.performance_target)
                total_performance_achieved += float(target_plan.achieved_performance or 0)
            
            if target_plan.opportunity_target:
                total_opportunity_target += float(target_plan.opportunity_target)
                total_opportunity_achieved += float(target_plan.achieved_opportunity or 0)
            
            if target_plan.project_count_target:
                total_project_count_target += target_plan.project_count_target
                total_project_count_achieved += target_plan.achieved_project_count or 0
            
            # Add individual target calculation to breakdown
            individual_completion = TargetService.calculate_completion_percentage(target_plan)
            target_info = {
                "target_id": target_plan.id,
                "period": f"{target_plan.year} Q{target_plan.quarter}" + 
                         (f"-{target_plan.month}" if target_plan.month else ""),
                "completion": individual_completion
            }
            target_breakdown.append(target_info)
        
        # Calculate overall completion percentages
        overall = {}
        if total_performance_target > 0:
            overall['performance'] = round((total_performance_achieved / total_performance_target) * 100, 2)
        else:
            overall['performance'] = 0.0
        
        if total_opportunity_target > 0:
            overall['opportunity'] = round((total_opportunity_achieved / total_opportunity_target) * 100, 2)
        else:
            overall['opportunity'] = 0.0
        
        if total_project_count_target > 0:
            overall['project_count'] = round((total_project_count_achieved / total_project_count_target) * 100, 2)
        else:
            overall['project_count'] = 0.0
        
        # Calculate average overall completion
        if overall:
            overall_avg = sum(overall.values()) / len(overall)
            overall_completion = round(overall_avg, 2)
        else:
            overall_completion = 0.0
        
        return {
            "channel_id": channel_id,
            "overall_completion": overall_completion,
            "metric_completions": overall,
            "target_breakdown": target_breakdown
        }