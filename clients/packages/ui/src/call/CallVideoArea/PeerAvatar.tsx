import { Avatar } from '../../common/Avatar'

interface PeerAvatarProps {
  name: string
  avatar?: string
  statusLabel: string
  speaking: boolean
}

export const PeerAvatar = ({ name, avatar, statusLabel, speaking }: PeerAvatarProps) => (
  <div className="relative z-10 flex flex-col items-center pointer-events-none">
    <div className="relative mb-4 sm:mb-6 scale-110 sm:scale-150">
      <div className="absolute inset-0 rounded-full bg-gradient-signature opacity-30 blur-2xl animate-pulse" />
      <div
        className={`relative rounded-full transition-all duration-200 ${
          speaking ? 'ring-4 ring-green-400 shadow-[0_0_30px_rgba(74,222,128,0.7)]' : ''
        }`}
      >
        <Avatar src={avatar} name={name} size="xl" />
      </div>
    </div>
    <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center px-4">
      {name}
    </h2>
    <p className="text-white/90 text-base sm:text-lg font-medium mt-2 sm:mt-3 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
      {statusLabel}
    </p>
  </div>
)
