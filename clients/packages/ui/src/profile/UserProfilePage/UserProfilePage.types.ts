export interface UserProfilePageProps {
  userId: string
  onBack: () => void
  onStartChat: (userId: string) => void
  variant?: 'page' | 'modal'
}
