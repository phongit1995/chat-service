import 'package:json_annotation/json_annotation.dart';

part 'conversation.g.dart';

@JsonSerializable()
class OtherUserBrief {
  final String id;
  final String username;
  final String? fullName;
  final String? avatar;
  final String? bio;
  @JsonKey(defaultValue: false)
  final bool isOnline;
  final String? lastActiveAt;

  OtherUserBrief({
    required this.id,
    required this.username,
    this.fullName,
    this.avatar,
    this.bio,
    this.isOnline = false,
    this.lastActiveAt,
  });

  factory OtherUserBrief.fromJson(Map<String, dynamic> json) =>
      _$OtherUserBriefFromJson(json);
  Map<String, dynamic> toJson() => _$OtherUserBriefToJson(this);

  OtherUserBrief copyWith({
    bool? isOnline,
    String? lastActiveAt,
  }) => OtherUserBrief(
        id: id,
        username: username,
        fullName: fullName,
        avatar: avatar,
        bio: bio,
        isOnline: isOnline ?? this.isOnline,
        lastActiveAt: lastActiveAt ?? this.lastActiveAt,
      );
}

@JsonSerializable()
class Conversation {
  final String id;
  @JsonKey(defaultValue: 'direct')
  final String type;
  final String? name;
  final String? avatar;
  final String? lastMessageText;
  final String? lastMessageAt;
  final String? lastMessageSenderId;
  final String? lastMessageSenderName;
  @JsonKey(defaultValue: false)
  final bool isLastMessageFromMe;
  @JsonKey(defaultValue: false)
  final bool seen;
  @JsonKey(defaultValue: 0)
  final int unreadCount;
  @JsonKey(defaultValue: 0)
  final int participantCount;
  final OtherUserBrief? otherUser;

  Conversation({
    required this.id,
    required this.type,
    this.name,
    this.avatar,
    this.lastMessageText,
    this.lastMessageAt,
    this.lastMessageSenderId,
    this.lastMessageSenderName,
    this.isLastMessageFromMe = false,
    this.seen = false,
    this.unreadCount = 0,
    this.participantCount = 0,
    this.otherUser,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) =>
      _$ConversationFromJson(json);
  Map<String, dynamic> toJson() => _$ConversationToJson(this);

  Conversation copyWith({
    String? lastMessageText,
    String? lastMessageAt,
    String? lastMessageSenderId,
    String? lastMessageSenderName,
    bool? isLastMessageFromMe,
    bool? seen,
    int? unreadCount,
    OtherUserBrief? otherUser,
  }) => Conversation(
    id: id,
    type: type,
    name: name,
    avatar: avatar,
    lastMessageText: lastMessageText ?? this.lastMessageText,
    lastMessageAt: lastMessageAt ?? this.lastMessageAt,
    lastMessageSenderId: lastMessageSenderId ?? this.lastMessageSenderId,
    lastMessageSenderName: lastMessageSenderName ?? this.lastMessageSenderName,
    isLastMessageFromMe: isLastMessageFromMe ?? this.isLastMessageFromMe,
    seen: seen ?? this.seen,
    unreadCount: unreadCount ?? this.unreadCount,
    participantCount: participantCount,
    otherUser: otherUser ?? this.otherUser,
  );

  String get displayName => (name != null && name!.isNotEmpty)
      ? name!
      : (type == 'group' ? 'Group Chat' : 'Unknown');
}
