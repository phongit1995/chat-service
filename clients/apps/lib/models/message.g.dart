// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'message.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Message _$MessageFromJson(Map<String, dynamic> json) => Message(
      id: json['id'] as String,
      conversationId: json['conversationId'] as String,
      senderId: json['senderId'] as String,
      senderName: json['senderName'] as String?,
      senderAvatar: json['senderAvatar'] as String?,
      content: json['content'] as String? ?? '',
      type: json['type'] as String? ?? 'text',
      status: json['status'] as String? ?? 'sent',
      createdAt: json['createdAt'] as String? ?? '',
      clientMsgId: json['clientMsgId'] as String?,
      metadata: json['metadata'] as String?,
      reactions: (json['reactions'] as Map<String, dynamic>?)?.map(
        (k, e) =>
            MapEntry(k, (e as List<dynamic>).map((e) => e as String).toList()),
      ),
    );

Map<String, dynamic> _$MessageToJson(Message instance) => <String, dynamic>{
      'id': instance.id,
      'conversationId': instance.conversationId,
      'senderId': instance.senderId,
      'senderName': instance.senderName,
      'senderAvatar': instance.senderAvatar,
      'content': instance.content,
      'type': instance.type,
      'status': instance.status,
      'createdAt': instance.createdAt,
      'clientMsgId': instance.clientMsgId,
      'metadata': instance.metadata,
      'reactions': instance.reactions,
    };
