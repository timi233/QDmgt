import React from 'react';
import { Card } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ProgressDataPoint {
  period: string; // e.g., "2025-Q1", "Jan", "Feb"
  performance: number;
  opportunity: number;
  projectCount: number;
  targetPerformance?: number;
  targetOpportunity?: number;
  targetProjectCount?: number;
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  title?: string;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ 
  data, 
  title = "目标完成进度趋势图" 
}) => {
  // Prepare chart data
  const chartData = {
    labels: data.map(d => d.period),
    datasets: [
      {
        label: '业绩完成度',
        data: data.map(d => d.performance),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y',
      },
      {
        label: '商机完成度',
        data: data.map(d => d.opportunity),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y',
      },
      {
        label: '项目数量完成度',
        data: data.map(d => d.projectCount),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y',
      },
      ...(data.some(d => d.targetPerformance !== undefined) 
        ? [{
            label: '业绩目标',
            data: data.map(d => d.targetPerformance || null),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderDash: [5, 5],
            yAxisID: 'y',
            pointRadius: 0,
          }] 
        : []),
      ...(data.some(d => d.targetOpportunity !== undefined) 
        ? [{
            label: '商机目标',
            data: data.map(d => d.targetOpportunity || null),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderDash: [5, 5],
            yAxisID: 'y',
            pointRadius: 0,
          }] 
        : []),
      ...(data.some(d => d.targetProjectCount !== undefined) 
        ? [{
            label: '项目数量目标',
            data: data.map(d => d.targetProjectCount || null),
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.2)',
            borderDash: [5, 5],
            yAxisID: 'y',
            pointRadius: 0,
          }] 
        : []),
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: true,
        text: title,
      },
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '完成度 (%)',
        },
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>{title}</h5>
      </Card.Header>
      <Card.Body>
        <Line data={chartData} options={chartOptions} />
      </Card.Body>
    </Card>
  );
};

export default ProgressChart;