export interface Friend {
  id: string
  username: string
  email: string
  avatar?: string
  fullName?: string
  friendAt: string
  isOnline: boolean
  lastActiveAt?: string
}

export interface FriendListData {
  friends: Friend[]
  total: number
  limit: number
  offset: number
}
