import { REACTION_EMOJIS, REACTION_ORDER } from '@chat/shared'

interface ReactionPickerProps {
  onSelect: (type: string) => void
  myReactedTypes?: string[]
}

export const ReactionPicker = ({ onSelect, myReactedTypes = [] }: ReactionPickerProps) => {
  return (
    <div
      className="z-20 flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-surface shadow-soft-md border border-line-subtle animate-fadeIn"
    >
      {REACTION_ORDER.map((type) => {
        const mine = myReactedTypes.includes(type)
        return (
          <button
            key={type}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(type)
            }}
            title={mine ? `${type} (click to remove)` : type}
            className={[
              'w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-surface-overlay hover:scale-125 active:scale-95 transition-transform',
              mine ? 'bg-primary-100 ring-2 ring-primary-400' : '',
            ].join(' ')}
          >
            {REACTION_EMOJIS[type]}
          </button>
        )
      })}
    </div>
  )
}
