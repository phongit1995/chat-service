package constants

const (
	KafkaTopicMessageCreated      = "CHAT.MESSAGE.CREATED"
	KafkaTopicMessageDeleted      = "CHAT.MESSAGE.DELETED"
	KafkaTopicMessageUpdated      = "CHAT.MESSAGE.UPDATED"
	KafkaTopicConversationCreated = "CHAT.CONVERSATION.CREATED"
	KafkaTopicConversationUpdated = "CHAT.CONVERSATION.UPDATED"
	KafkaTopicConversationDeleted = "CHAT.CONVERSATION.DELETED"
	KafkaTopicUserOnline          = "CHAT.USER.ONLINE"
	KafkaTopicUserOffline         = "CHAT.USER.OFFLINE"
	KafkaTopicUserTyping          = "CHAT.USER.TYPING"
)

const (
	KafkaConsumerGroup = "CHAT-SERVICE-CONSUMERS"
)

const (
	CacheKeyUserProfile         = "USER:%s:PROFILE"
	CacheKeyUserOnlineStatus    = "USER:%s:ONLINE"
	CacheKeyUserSession         = "USER:%s:SESSION"
	CacheKeyUserRefreshToken    = "USER:%s:REFRESH_TOKEN"
	CacheKeyConversation        = "CONVERSATION:%s:DETAIL"
	CacheKeyConversationList    = "USER:%s:CONVERSATIONS"
	CacheKeyConversationMembers = "CONVERSATION:%s:MEMBERS"
	CacheKeyMessage             = "MESSAGE:%s:DETAIL"
	CacheKeyMessageList         = "CONVERSATION:%s:MESSAGES"
	CacheKeyRelationship        = "RELATIONSHIP:%s:DETAIL"
	CacheKeyRelationshipList    = "USER:%s:RELATIONSHIPS"
	CacheKeyUnreadCount         = "USER:%s:UNREAD:%s"
	CacheKeyTypingUsers         = "CONVERSATION:%s:TYPING"
	CacheKeyRateLimitLogin      = "RATE_LIMIT:%s:LOGIN"
	CacheKeyRateLimitRegister   = "RATE_LIMIT:%s:REGISTER"
	CacheKeyRateLimitAPI        = "RATE_LIMIT:%s:API"
	CacheKeyOTPVerification     = "OTP:%s:VERIFICATION"
	CacheKeyPasswordResetToken  = "PASSWORD:%s:RESET_TOKEN"
)

const (
	WebSocketEventConnect             = "CONNECT"
	WebSocketEventDisconnect          = "DISCONNECT"
	WebSocketEventNewMessage          = "NEW_MESSAGE"
	WebSocketEventMessageDeleted      = "MESSAGE_DELETED"
	WebSocketEventMessageUpdated      = "MESSAGE_UPDATED"
	WebSocketEventConversationUpdated = "CONVERSATION_UPDATED"
	WebSocketEventUserOnline          = "USER_ONLINE"
	WebSocketEventUserOffline         = "USER_OFFLINE"
	WebSocketEventUserTyping          = "USER_TYPING"
	WebSocketEventUserStopTyping      = "USER_STOP_TYPING"
	WebSocketEventError = "ERROR"
)

const (
	CacheKeyPresence   = "PRESENCE:%s:ONLINE"
	PresenceTTLSeconds = 300
)

const (
	CacheTTLUserProfile        = 3600
	CacheTTLUserOnlineStatus   = 300
	CacheTTLUserSession        = 86400
	CacheTTLConversation       = 1800
	CacheTTLConversationList   = 600
	CacheTTLMessage            = 3600
	CacheTTLMessageList        = 300
	CacheTTLRelationship       = 3600
	CacheTTLUnreadCount        = 60
	CacheTTLRateLimit          = 60
	CacheTTLOTP                = 300
	CacheTTLPasswordResetToken = 1800
)

const (
	RateLimitLoginMaxRequests    = 5
	RateLimitRegisterMaxRequests = 3
	RateLimitAPIMaxRequests      = 100
	RateLimitWindowSeconds       = 60
)

const (
	MessageStatusSent      = "SENT"
	MessageStatusDelivered = "DELIVERED"
	MessageStatusRead      = "READ"
	MessageStatusDeleted   = "DELETED"
)

const (
	ConversationTypePrivate = "PRIVATE"
	ConversationTypeGroup   = "GROUP"
	ConversationTypeChannel = "CHANNEL"
)

const (
	RelationshipStatusPending  = "PENDING"
	RelationshipStatusAccepted = "ACCEPTED"
	RelationshipStatusBlocked  = "BLOCKED"
	RelationshipStatusRejected = "REJECTED"
)

const (
	UserRoleUser  = "USER"
	UserRoleAdmin = "ADMIN"
	UserRoleMod   = "MODERATOR"
)

const (
	ContextKeyUserID    = "USER_ID"
	ContextKeyTraceID   = "TRACE_ID"
	ContextKeyRequestID = "REQUEST_ID"
)
