import { Button, Result } from 'antd'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <Result
      status="error"
      title="页面出错了"
      subTitle={error.message}
      extra={
        <Button type="primary" onClick={resetErrorBoundary}>
          重新加载
        </Button>
      }
    />
  )
}
