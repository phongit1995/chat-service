// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'responses.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ApiResponse<T> _$ApiResponseFromJson<T>(
  Map<String, dynamic> json,
  T Function(Object? json) fromJsonT,
) =>
    ApiResponse<T>(
      success: json['success'] as bool,
      status: (json['status'] as num).toInt(),
      data: _$nullableGenericFromJson(json['data'], fromJsonT),
      error: json['error'] as String?,
    );

Map<String, dynamic> _$ApiResponseToJson<T>(
  ApiResponse<T> instance,
  Object? Function(T value) toJsonT,
) =>
    <String, dynamic>{
      'success': instance.success,
      'status': instance.status,
      'data': _$nullableGenericToJson(instance.data, toJsonT),
      'error': instance.error,
    };

T? _$nullableGenericFromJson<T>(
  Object? input,
  T Function(Object? json) fromJson,
) =>
    input == null ? null : fromJson(input);

Object? _$nullableGenericToJson<T>(
  T? input,
  Object? Function(T value) toJson,
) =>
    input == null ? null : toJson(input);

LoginData _$LoginDataFromJson(Map<String, dynamic> json) => LoginData(
      token: json['token'] as String,
      user: User.fromJson(json['user'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$LoginDataToJson(LoginData instance) => <String, dynamic>{
      'token': instance.token,
      'user': instance.user,
    };

ConversationsResponse _$ConversationsResponseFromJson(
        Map<String, dynamic> json) =>
    ConversationsResponse(
      conversations: (json['conversations'] as List<dynamic>)
          .map((e) => Conversation.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$ConversationsResponseToJson(
        ConversationsResponse instance) =>
    <String, dynamic>{
      'conversations': instance.conversations,
    };

MessagesResponse _$MessagesResponseFromJson(Map<String, dynamic> json) =>
    MessagesResponse(
      messages: (json['messages'] as List<dynamic>)
          .map((e) => Message.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$MessagesResponseToJson(MessagesResponse instance) =>
    <String, dynamic>{
      'messages': instance.messages,
    };

UsersResponse _$UsersResponseFromJson(Map<String, dynamic> json) =>
    UsersResponse(
      users: (json['users'] as List<dynamic>)
          .map((e) => UserSearchResult.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$UsersResponseToJson(UsersResponse instance) =>
    <String, dynamic>{
      'users': instance.users,
    };

UserPresence _$UserPresenceFromJson(Map<String, dynamic> json) => UserPresence(
      userId: json['userId'] as String,
      isOnline: json['isOnline'] as bool,
      lastActiveAt: json['lastActiveAt'] as String?,
    );

Map<String, dynamic> _$UserPresenceToJson(UserPresence instance) =>
    <String, dynamic>{
      'userId': instance.userId,
      'isOnline': instance.isOnline,
      'lastActiveAt': instance.lastActiveAt,
    };

PresenceBatchResponse _$PresenceBatchResponseFromJson(
        Map<String, dynamic> json) =>
    PresenceBatchResponse(
      users: (json['users'] as List<dynamic>)
          .map((e) => UserPresence.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$PresenceBatchResponseToJson(
        PresenceBatchResponse instance) =>
    <String, dynamic>{
      'users': instance.users,
    };

UploadAvatarResponse _$UploadAvatarResponseFromJson(
        Map<String, dynamic> json) =>
    UploadAvatarResponse(
      url: json['url'] as String,
      secureUrl: json['secureUrl'] as String,
      publicId: json['publicId'] as String,
      format: json['format'] as String,
    );

Map<String, dynamic> _$UploadAvatarResponseToJson(
        UploadAvatarResponse instance) =>
    <String, dynamic>{
      'url': instance.url,
      'secureUrl': instance.secureUrl,
      'publicId': instance.publicId,
      'format': instance.format,
    };
