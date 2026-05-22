export interface FriendsManagementPageProps {
  onBack: () => void
  onStartChat: (userId: string) => void
  onOpenProfile: (userId: string) => void
}
