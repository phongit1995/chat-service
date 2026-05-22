// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

User _$UserFromJson(Map<String, dynamic> json) => User(
      id: json['id'] as String,
      username: json['username'] as String,
      email: json['email'] as String,
      fullName: json['fullName'] as String?,
      avatar: json['avatar'] as String?,
      avatarURL: json['avatarURL'] as String?,
      bio: json['bio'] as String?,
      phone: json['phone'] as String?,
      status: json['status'] as String? ?? 'offline',
    );

Map<String, dynamic> _$UserToJson(User instance) => <String, dynamic>{
      'id': instance.id,
      'username': instance.username,
      'email': instance.email,
      'fullName': instance.fullName,
      'avatar': instance.avatar,
      'avatarURL': instance.avatarURL,
      'bio': instance.bio,
      'phone': instance.phone,
      'status': instance.status,
    };

UserSearchResult _$UserSearchResultFromJson(Map<String, dynamic> json) =>
    UserSearchResult(
      id: json['id'] as String,
      username: json['username'] as String,
      fullName: json['fullName'] as String?,
      avatar: json['avatar'] as String?,
      bio: json['bio'] as String?,
      isOnline: json['isOnline'] as bool? ?? false,
    );

Map<String, dynamic> _$UserSearchResultToJson(UserSearchResult instance) =>
    <String, dynamic>{
      'id': instance.id,
      'username': instance.username,
      'fullName': instance.fullName,
      'avatar': instance.avatar,
      'bio': instance.bio,
      'isOnline': instance.isOnline,
    };

RelationshipInfo _$RelationshipInfoFromJson(Map<String, dynamic> json) =>
    RelationshipInfo(
      status: json['status'] as String,
      requestId: json['requestId'] as String?,
      since: json['since'] as String?,
    );

Map<String, dynamic> _$RelationshipInfoToJson(RelationshipInfo instance) =>
    <String, dynamic>{
      'status': instance.status,
      'requestId': instance.requestId,
      'since': instance.since,
    };

UserPublicProfile _$UserPublicProfileFromJson(Map<String, dynamic> json) =>
    UserPublicProfile(
      id: json['id'] as String,
      username: json['username'] as String,
      fullName: json['fullName'] as String?,
      avatar: json['avatar'] as String?,
      bio: json['bio'] as String?,
      isOnline: json['isOnline'] as bool? ?? false,
      lastActiveAt: json['lastActiveAt'] as String?,
      createdAt: json['createdAt'] as String?,
      relationship: json['relationship'] == null
          ? null
          : RelationshipInfo.fromJson(
              json['relationship'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$UserPublicProfileToJson(UserPublicProfile instance) =>
    <String, dynamic>{
      'id': instance.id,
      'username': instance.username,
      'fullName': instance.fullName,
      'avatar': instance.avatar,
      'bio': instance.bio,
      'isOnline': instance.isOnline,
      'lastActiveAt': instance.lastActiveAt,
      'createdAt': instance.createdAt,
      'relationship': instance.relationship,
    };
