import 'package:json_annotation/json_annotation.dart';

part 'models.g.dart';

@JsonSerializable()
class User {
  final String id;
  final String username;
  final String email;
  final String? fullName;
  final String? avatar;
  final String? avatarURL;
  final String? bio;
  @JsonKey(defaultValue: 'offline')
  final String status;

  User({
    required this.id,
    required this.username,
    required this.email,
    this.fullName,
    this.avatar,
    this.avatarURL,
    this.bio,
    this.status = 'offline',
  });

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}

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
    otherUser: otherUser,
  );

  String get displayName => (name != null && name!.isNotEmpty)
      ? name!
      : (type == 'group' ? 'Group Chat' : 'Unknown');
}

@JsonSerializable()
class Message {
  final String id;
  final String conversationId;
  final String senderId;
  final String? senderName;
  final String? senderAvatar;
  @JsonKey(defaultValue: '')
  final String content;
  @JsonKey(defaultValue: 'text')
  final String type;
  @JsonKey(defaultValue: 'sent')
  final String status;
  @JsonKey(defaultValue: '')
  final String createdAt;
  final String? clientMsgId;

  Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    this.senderName,
    this.senderAvatar,
    required this.content,
    this.type = 'text',
    this.status = 'sent',
    required this.createdAt,
    this.clientMsgId,
  });

  Message copyWith({String? status, String? id}) => Message(
    id: id ?? this.id,
    conversationId: conversationId,
    senderId: senderId,
    senderName: senderName,
    senderAvatar: senderAvatar,
    content: content,
    type: type,
    status: status ?? this.status,
    createdAt: createdAt,
    clientMsgId: clientMsgId,
  );

  factory Message.fromJson(Map<String, dynamic> json) =>
      _$MessageFromJson(json);
  Map<String, dynamic> toJson() => _$MessageToJson(this);
}

@JsonSerializable()
class UserSearchResult {
  final String id;
  final String username;
  final String email;
  final String? fullName;
  final String? avatar;

  UserSearchResult({
    required this.id,
    required this.username,
    required this.email,
    this.fullName,
    this.avatar,
  });

  factory UserSearchResult.fromJson(Map<String, dynamic> json) =>
      _$UserSearchResultFromJson(json);
  Map<String, dynamic> toJson() => _$UserSearchResultToJson(this);

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}

@JsonSerializable()
class ConversationsResponse {
  final List<Conversation> conversations;

  ConversationsResponse({required this.conversations});

  factory ConversationsResponse.fromJson(Map<String, dynamic> json) =>
      _$ConversationsResponseFromJson(json);
  Map<String, dynamic> toJson() => _$ConversationsResponseToJson(this);
}

@JsonSerializable()
class MessagesResponse {
  final List<Message> messages;

  MessagesResponse({required this.messages});

  factory MessagesResponse.fromJson(Map<String, dynamic> json) =>
      _$MessagesResponseFromJson(json);
  Map<String, dynamic> toJson() => _$MessagesResponseToJson(this);
}

@JsonSerializable()
class UsersResponse {
  final List<UserSearchResult> users;

  UsersResponse({required this.users});

  factory UsersResponse.fromJson(Map<String, dynamic> json) =>
      _$UsersResponseFromJson(json);
  Map<String, dynamic> toJson() => _$UsersResponseToJson(this);
}

@JsonSerializable(genericArgumentFactories: true)
class ApiResponse<T> {
  final bool success;
  final int status;
  final T? data;
  final String? error;

  ApiResponse({
    required this.success,
    required this.status,
    this.data,
    this.error,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) => _$ApiResponseFromJson(json, fromJsonT);
  Map<String, dynamic> toJson(Object Function(T value) toJsonT) =>
      _$ApiResponseToJson(this, toJsonT);
}

@JsonSerializable()
class LoginData {
  final String token;
  final User user;

  LoginData({required this.token, required this.user});

  factory LoginData.fromJson(Map<String, dynamic> json) =>
      _$LoginDataFromJson(json);
  Map<String, dynamic> toJson() => _$LoginDataToJson(this);
}
