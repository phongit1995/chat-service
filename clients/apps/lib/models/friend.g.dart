// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'friend.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Friend _$FriendFromJson(Map<String, dynamic> json) => Friend(
      id: json['id'] as String,
      username: json['username'] as String,
      email: json['email'] as String,
      avatar: json['avatar'] as String?,
      fullName: json['fullName'] as String?,
      friendAt: json['friendAt'] as String?,
      isOnline: json['isOnline'] as bool? ?? false,
      lastActiveAt: json['lastActiveAt'] as String?,
    );

Map<String, dynamic> _$FriendToJson(Friend instance) => <String, dynamic>{
      'id': instance.id,
      'username': instance.username,
      'email': instance.email,
      'avatar': instance.avatar,
      'fullName': instance.fullName,
      'friendAt': instance.friendAt,
      'isOnline': instance.isOnline,
      'lastActiveAt': instance.lastActiveAt,
    };

FriendListData _$FriendListDataFromJson(Map<String, dynamic> json) =>
    FriendListData(
      friends: (json['friends'] as List<dynamic>?)
              ?.map((e) => Friend.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      total: (json['total'] as num?)?.toInt() ?? 0,
      limit: (json['limit'] as num?)?.toInt() ?? 0,
      offset: (json['offset'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$FriendListDataToJson(FriendListData instance) =>
    <String, dynamic>{
      'friends': instance.friends,
      'total': instance.total,
      'limit': instance.limit,
      'offset': instance.offset,
    };
