from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from ..database import get_db
from ..models.channel import Channel
from ..models.channel_target import TargetPlan
from ..services.target_service import TargetService
from ..utils.exceptions import ValidationError, NotFoundError
from pydantic import BaseModel
from enum import Enum


router = APIRouter(prefix="/api/visualization", tags=["visualization"])


# Pydantic models for request/response
class TimeDimension(str, Enum):
    year = "year"
    quarter = "quarter"
    month = "month"


class ChartDataPoint(BaseModel):
    period: str
    performance: float
    opportunity: float
    project_count: int
    target_performance: float
    target_opportunity: float
    target_project_count: int


class ChannelTargetData(BaseModel):
    channel_id: UUID
    channel_name: str
    time_period: dict
    target_achievement: dict
    period_completion: float


class VisualizationResponse(BaseModel):
    overall_completion: float
    target_breakdown: List[dict]
    time_series_data: List[ChartDataPoint]


@router.get("/channel/{channel_id}/targets", response_model=ChannelTargetData)
def get_channel_target_stats(
    channel_id: UUID,
    year: int = None,
    quarter: int = None,
    db: Session = Depends(get_db)
):
    """
    Get target achievement statistics for a specific channel to support visualization needs.
    This endpoint was defined in the contracts but not yet implemented.
    """
    # Get the channel to verify it exists and get its name
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Get the target plans for the channel
    target_plans = TargetService.get_target_plans_by_channel(
        db, channel_id, year=year, quarter=quarter
    )
    
    if not target_plans:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No target plans found for this channel"
        )
    
    # Get completion percentage for the first target plan (in a real implementation,
    # we'd aggregate across all relevant target plans)
    target_plan = target_plans[0]
    completion_data = TargetService.calculate_completion_percentage(target_plan)
    
    time_period = {
        "year": target_plan.year,
        "quarter": target_plan.quarter,
        "month": target_plan.month
    }
    
    target_achievement = {
        "performance": {
            "target": float(target_plan.performance_target) if target_plan.performance_target else 0,
            "achieved": float(target_plan.achieved_performance) if target_plan.achieved_performance else 0,
            "percentage": completion_data.get('performance', 0)
        },
        "opportunity": {
            "target": float(target_plan.opportunity_target) if target_plan.opportunity_target else 0,
            "achieved": float(target_plan.achieved_opportunity) if target_plan.achieved_opportunity else 0,
            "percentage": completion_data.get('opportunity', 0)
        },
        "project_count": {
            "target": target_plan.project_count_target or 0,
            "achieved": target_plan.achieved_project_count or 0,
            "percentage": completion_data.get('project_count', 0)
        }
    }
    
    return {
        "channel_id": channel_id,
        "channel_name": channel.name,
        "time_period": time_period,
        "target_achievement": target_achievement,
        "period_completion": completion_data.get('average', 0)
    }


@router.get("/channel/{channel_id}/time-series", response_model=List[ChartDataPoint])
def get_channel_time_series_data(
    channel_id: UUID,
    time_dimension: TimeDimension = TimeDimension.quarter,
    db: Session = Depends(get_db)
):
    """
    Get time series data for a channel's target achievement over time.
    """
    # Get the channel to verify it exists
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Get all target plans for the channel
    target_plans = db.query(TargetPlan).filter(
        TargetPlan.channel_id == channel_id
    ).order_by(TargetPlan.year, TargetPlan.quarter, TargetPlan.month).all()
    
    if not target_plans:
        return []
    
    # Convert target plans to time series data points
    data_points = []
    for plan in target_plans:
        completion_data = TargetService.calculate_completion_percentage(plan)
        
        # Format period string based on time dimension
        if time_dimension == TimeDimension.month and plan.month:
            period = f"{plan.year}-{plan.month:02d}"
        elif time_dimension == TimeDimension.quarter:
            period = f"{plan.year}-Q{plan.quarter}"
        else:  # TimeDimension.year
            period = f"{plan.year}"
        
        data_point = ChartDataPoint(
            period=period,
            performance=completion_data.get('performance', 0),
            opportunity=completion_data.get('opportunity', 0),
            project_count=completion_data.get('project_count', 0),
            target_performance=float(plan.performance_target) if plan.performance_target else 0.0,
            target_opportunity=float(plan.opportunity_target) if plan.opportunity_target else 0.0,
            target_project_count=plan.project_count_target or 0
        )
        
        data_points.append(data_point)
    
    return data_points


@router.get("/dashboard-summary", response_model=dict)
def get_dashboard_summary(
    db: Session = Depends(get_db)
):
    """
    Get overall dashboard summary for all channels.
    """
    # Get all channels
    channels = db.query(Channel).all()
    
    if not channels:
        return {
            "total_channels": 0,
            "overall_completion": 0.0,
            "channel_breakdown": []
        }
    
    total_completion = 0.0
    channel_breakdown = []
    
    for channel in channels:
        # Calculate completion for the channel
        completion_data = TargetService.calculate_channel_completion_percentage(db, channel.id)
        
        channel_info = {
            "channel_id": channel.id,
            "channel_name": channel.name,
            "overall_completion": completion_data["overall_completion"],
            "metric_completions": completion_data["metric_completions"]
        }
        
        channel_breakdown.append(channel_info)
        total_completion += completion_data["overall_completion"]
    
    overall_completion = total_completion / len(channels) if channels else 0.0
    
    return {
        "total_channels": len(channels),
        "overall_completion": round(overall_completion, 2),
        "channel_breakdown": channel_breakdown
    }