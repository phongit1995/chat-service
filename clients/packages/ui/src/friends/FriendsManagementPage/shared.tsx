export const Spinner = () => (
  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
)

interface EmptyStateProps {
  text: string
  subtitle?: string
}

export const EmptyState = ({ text, subtitle }: EmptyStateProps) => (
  <div className="text-center py-12 text-ink-tertiary">
    <p className="font-medium text-ink-primary">{text}</p>
    {subtitle && <p className="text-[13px] mt-1">{subtitle}</p>}
  </div>
)
