import React from 'react';
import { Card, ProgressBar, Row, Col } from 'react-bootstrap';
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface TargetData {
  performance: number;
  opportunity: number;
  project_count: number;
  average: number;
}

interface TargetVisualizationProps {
  targetData: TargetData;
  title?: string;
}

const TargetVisualization: React.FC<TargetVisualizationProps> = ({ 
  targetData, 
  title = "目标完成度可视化" 
}) => {
  // Data for pie chart
  const pieData = {
    labels: ['业绩完成度', '商机完成度', '项目数量完成度'],
    datasets: [
      {
        data: [targetData.performance, targetData.opportunity, targetData.project_count],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Data for bar chart
  const barData = {
    labels: ['业绩', '商机', '项目数量'],
    datasets: [
      {
        label: '目标完成度 (%)',
        data: [targetData.performance, targetData.opportunity, targetData.project_count],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '目标完成度分析',
      },
    },
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>{title}</h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={6}>
            <h6>目标完成度分布</h6>
            <Pie data={pieData} options={chartOptions} />
          </Col>
          <Col md={6}>
            <h6>完成度柱状图</h6>
            <Bar data={barData} options={chartOptions} />
          </Col>
        </Row>
        
        <Row className="mt-4">
          <Col>
            <h6>整体完成度进度</h6>
            <div className="mb-2">
              <div className="d-flex justify-content-between">
                <span>整体目标完成度: {targetData.average}%</span>
              </div>
              <ProgressBar 
                now={targetData.average} 
                label={`${targetData.average}%`} 
                variant={targetData.average >= 80 ? 'success' : targetData.average >= 50 ? 'warning' : 'danger'}
                style={{ height: '25px' }}
              />
            </div>
            
            <div className="mt-3">
              <h6>各项目标完成情况</h6>
              <div className="mb-2">
                <div className="d-flex justify-content-between">
                  <span>业绩完成度: {targetData.performance}%</span>
                </div>
                <ProgressBar 
                  now={targetData.performance} 
                  label={`${targetData.performance}%`} 
                  variant={targetData.performance >= 80 ? 'success' : targetData.performance >= 50 ? 'warning' : 'danger'}
                />
              </div>
              
              <div className="mb-2">
                <div className="d-flex justify-content-between">
                  <span>商机完成度: {targetData.opportunity}%</span>
                </div>
                <ProgressBar 
                  now={targetData.opportunity} 
                  label={`${targetData.opportunity}%`} 
                  variant={targetData.opportunity >= 80 ? 'success' : targetData.opportunity >= 50 ? 'warning' : 'danger'}
                />
              </div>
              
              <div className="mb-2">
                <div className="d-flex justify-content-between">
                  <span>项目数量完成度: {targetData.project_count}%</span>
                </div>
                <ProgressBar 
                  now={targetData.project_count} 
                  label={`${targetData.project_count}%`} 
                  variant={targetData.project_count >= 80 ? 'success' : targetData.project_count >= 50 ? 'warning' : 'danger'}
                />
              </div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default TargetVisualization;