class User {
  final String id;
  final String username;
  final String email;
  final String? fullName;
  final String? avatar;
  final String? avatarURL;
  final String? bio;
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

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        username: json['username'] as String,
        email: json['email'] as String,
        fullName: json['fullName'] as String?,
        avatar: json['avatar'] as String?,
        avatarURL: json['avatarURL'] as String?,
        bio: json['bio'] as String?,
        status: (json['status'] as String?) ?? 'offline',
      );

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}

class OtherUserBrief {
  final String id;
  final String username;
  final String? fullName;
  final String? avatar;
  final String? bio;

  OtherUserBrief({
    required this.id,
    required this.username,
    this.fullName,
    this.avatar,
    this.bio,
  });

  factory OtherUserBrief.fromJson(Map<String, dynamic> json) => OtherUserBrief(
        id: json['id'] as String,
        username: (json['username'] as String?) ?? '',
        fullName: json['fullName'] as String?,
        avatar: json['avatar'] as String?,
        bio: json['bio'] as String?,
      );
}

class Conversation {
  final String id;
  final String type;
  final String? name;
  final String? avatar;
  final String? lastMessageText;
  final String? lastMessageAt;
  final String? lastMessageSenderId;
  final String? lastMessageSenderName;
  final bool isLastMessageFromMe;
  final bool seen;
  final int unreadCount;
  final int participantCount;
  final OtherUserBrief? otherUser;
  final bool isOnline;
  final String? lastActiveAt;

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
    this.isOnline = false,
    this.lastActiveAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
        id: json['id'] as String,
        type: (json['type'] as String?) ?? 'direct',
        name: json['name'] as String?,
        avatar: json['avatar'] as String?,
        lastMessageText: json['lastMessageText'] as String?,
        lastMessageAt: json['lastMessageAt'] as String?,
        lastMessageSenderId: json['lastMessageSenderId'] as String?,
        lastMessageSenderName: json['lastMessageSenderName'] as String?,
        isLastMessageFromMe: (json['isLastMessageFromMe'] as bool?) ?? false,
        seen: (json['seen'] as bool?) ?? false,
        unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
        participantCount: (json['participantCount'] as num?)?.toInt() ?? 0,
        otherUser: json['otherUser'] is Map<String, dynamic>
            ? OtherUserBrief.fromJson(json['otherUser'] as Map<String, dynamic>)
            : null,
        isOnline: (json['isOnline'] as bool?) ?? false,
        lastActiveAt: json['lastActiveAt'] as String?,
      );

  Conversation copyWith({
    String? lastMessageText,
    String? lastMessageAt,
    String? lastMessageSenderId,
    String? lastMessageSenderName,
    bool? isLastMessageFromMe,
    bool? seen,
    int? unreadCount,
    bool? isOnline,
    String? lastActiveAt,
  }) =>
      Conversation(
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
        isOnline: isOnline ?? this.isOnline,
        lastActiveAt: lastActiveAt ?? this.lastActiveAt,
      );

  String get displayName =>
      (name != null && name!.isNotEmpty) ? name! : (type == 'group' ? 'Group Chat' : 'Unknown');
}

class Message {
  final String id;
  final String conversationId;
  final String senderId;
  final String? senderName;
  final String? senderAvatar;
  final String content;
  final String type;
  final String status;
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

  factory Message.fromJson(Map<String, dynamic> json) => Message(
        id: json['id'] as String,
        conversationId: json['conversationId'] as String,
        senderId: json['senderId'] as String,
        senderName: json['senderName'] as String?,
        senderAvatar: json['senderAvatar'] as String?,
        content: (json['content'] as String?) ?? '',
        type: (json['type'] as String?) ?? 'text',
        status: (json['status'] as String?) ?? 'sent',
        createdAt: (json['createdAt'] as String?) ?? '',
        clientMsgId: json['clientMsgId'] as String?,
      );
}

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

  factory UserSearchResult.fromJson(Map<String, dynamic> json) => UserSearchResult(
        id: json['id'] as String,
        username: json['username'] as String,
        email: json['email'] as String,
        fullName: json['fullName'] as String?,
        avatar: json['avatar'] as String?,
      );

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}
