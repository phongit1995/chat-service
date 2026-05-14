// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'requests.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoginRequest _$LoginRequestFromJson(Map<String, dynamic> json) => LoginRequest(
      email: json['email'] as String,
      password: json['password'] as String,
    );

Map<String, dynamic> _$LoginRequestToJson(LoginRequest instance) =>
    <String, dynamic>{
      'email': instance.email,
      'password': instance.password,
    };

RegisterRequest _$RegisterRequestFromJson(Map<String, dynamic> json) =>
    RegisterRequest(
      username: json['username'] as String,
      email: json['email'] as String,
      password: json['password'] as String,
      fullName: json['full_name'] as String?,
    );

Map<String, dynamic> _$RegisterRequestToJson(RegisterRequest instance) {
  final val = <String, dynamic>{
    'username': instance.username,
    'email': instance.email,
    'password': instance.password,
  };

  void writeNotNull(String key, dynamic value) {
    if (value != null) {
      val[key] = value;
    }
  }

  writeNotNull('full_name', instance.fullName);
  return val;
}

SendMessageRequest _$SendMessageRequestFromJson(Map<String, dynamic> json) =>
    SendMessageRequest(
      conversationId: json['conversationId'] as String,
      content: json['content'] as String,
      type: json['type'] as String? ?? 'text',
      clientMsgId: json['clientMsgId'] as String?,
    );

Map<String, dynamic> _$SendMessageRequestToJson(SendMessageRequest instance) {
  final val = <String, dynamic>{
    'conversationId': instance.conversationId,
    'content': instance.content,
    'type': instance.type,
  };

  void writeNotNull(String key, dynamic value) {
    if (value != null) {
      val[key] = value;
    }
  }

  writeNotNull('clientMsgId', instance.clientMsgId);
  return val;
}

SendDirectMessageRequest _$SendDirectMessageRequestFromJson(
        Map<String, dynamic> json) =>
    SendDirectMessageRequest(
      recipientId: json['recipientId'] as String,
      content: json['content'] as String,
      type: json['type'] as String? ?? 'text',
      clientMsgId: json['clientMsgId'] as String?,
    );

Map<String, dynamic> _$SendDirectMessageRequestToJson(
    SendDirectMessageRequest instance) {
  final val = <String, dynamic>{
    'recipientId': instance.recipientId,
    'content': instance.content,
    'type': instance.type,
  };

  void writeNotNull(String key, dynamic value) {
    if (value != null) {
      val[key] = value;
    }
  }

  writeNotNull('clientMsgId', instance.clientMsgId);
  return val;
}

UpdateMessageRequest _$UpdateMessageRequestFromJson(
        Map<String, dynamic> json) =>
    UpdateMessageRequest(
      content: json['content'] as String,
    );

Map<String, dynamic> _$UpdateMessageRequestToJson(
        UpdateMessageRequest instance) =>
    <String, dynamic>{
      'content': instance.content,
    };

CreateDirectConversationRequest _$CreateDirectConversationRequestFromJson(
        Map<String, dynamic> json) =>
    CreateDirectConversationRequest(
      recipientId: json['recipientId'] as String,
    );

Map<String, dynamic> _$CreateDirectConversationRequestToJson(
        CreateDirectConversationRequest instance) =>
    <String, dynamic>{
      'recipientId': instance.recipientId,
    };

CreateGroupConversationRequest _$CreateGroupConversationRequestFromJson(
        Map<String, dynamic> json) =>
    CreateGroupConversationRequest(
      name: json['name'] as String,
      participantIds: (json['participantIds'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$CreateGroupConversationRequestToJson(
        CreateGroupConversationRequest instance) =>
    <String, dynamic>{
      'name': instance.name,
      'participantIds': instance.participantIds,
    };

TypingRequest _$TypingRequestFromJson(Map<String, dynamic> json) =>
    TypingRequest(
      conversationId: json['conversationId'] as String,
    );

Map<String, dynamic> _$TypingRequestToJson(TypingRequest instance) =>
    <String, dynamic>{
      'conversationId': instance.conversationId,
    };
