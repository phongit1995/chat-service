// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'conversation.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

OtherUserBrief _$OtherUserBriefFromJson(Map<String, dynamic> json) =>
    OtherUserBrief(
      id: json['id'] as String,
      username: json['username'] as String,
      fullName: json['fullName'] as String?,
      avatar: json['avatar'] as String?,
      bio: json['bio'] as String?,
      isOnline: json['isOnline'] as bool? ?? false,
      lastActiveAt: json['lastActiveAt'] as String?,
    );

Map<String, dynamic> _$OtherUserBriefToJson(OtherUserBrief instance) =>
    <String, dynamic>{
      'id': instance.id,
      'username': instance.username,
      'fullName': instance.fullName,
      'avatar': instance.avatar,
      'bio': instance.bio,
      'isOnline': instance.isOnline,
      'lastActiveAt': instance.lastActiveAt,
    };

Conversation _$ConversationFromJson(Map<String, dynamic> json) => Conversation(
      id: json['id'] as String,
      type: json['type'] as String? ?? 'direct',
      name: json['name'] as String?,
      avatar: json['avatar'] as String?,
      lastMessageText: json['lastMessageText'] as String?,
      lastMessageAt: json['lastMessageAt'] as String?,
      lastMessageSenderId: json['lastMessageSenderId'] as String?,
      lastMessageSenderName: json['lastMessageSenderName'] as String?,
      isLastMessageFromMe: json['isLastMessageFromMe'] as bool? ?? false,
      seen: json['seen'] as bool? ?? false,
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      participantCount: (json['participantCount'] as num?)?.toInt() ?? 0,
      otherUser: json['otherUser'] == null
          ? null
          : OtherUserBrief.fromJson(json['otherUser'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$ConversationToJson(Conversation instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'name': instance.name,
      'avatar': instance.avatar,
      'lastMessageText': instance.lastMessageText,
      'lastMessageAt': instance.lastMessageAt,
      'lastMessageSenderId': instance.lastMessageSenderId,
      'lastMessageSenderName': instance.lastMessageSenderName,
      'isLastMessageFromMe': instance.isLastMessageFromMe,
      'seen': instance.seen,
      'unreadCount': instance.unreadCount,
      'participantCount': instance.participantCount,
      'otherUser': instance.otherUser,
    };
