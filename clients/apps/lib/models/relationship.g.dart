// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'relationship.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RelationshipUserInfo _$RelationshipUserInfoFromJson(
        Map<String, dynamic> json) =>
    RelationshipUserInfo(
      id: json['id'] as String,
      username: json['username'] as String,
      email: json['email'] as String,
      avatar: json['avatar'] as String?,
      fullName: json['fullName'] as String?,
    );

Map<String, dynamic> _$RelationshipUserInfoToJson(
        RelationshipUserInfo instance) =>
    <String, dynamic>{
      'id': instance.id,
      'username': instance.username,
      'email': instance.email,
      'avatar': instance.avatar,
      'fullName': instance.fullName,
    };

RelationshipResponse _$RelationshipResponseFromJson(
        Map<String, dynamic> json) =>
    RelationshipResponse(
      id: json['id'] as String,
      requesterId: json['requesterId'] as String,
      addresseeId: json['addresseeId'] as String,
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
      actionedAt: json['actionedAt'] as String?,
      requester: json['requester'] == null
          ? null
          : RelationshipUserInfo.fromJson(
              json['requester'] as Map<String, dynamic>),
      addressee: json['addressee'] == null
          ? null
          : RelationshipUserInfo.fromJson(
              json['addressee'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$RelationshipResponseToJson(
        RelationshipResponse instance) =>
    <String, dynamic>{
      'id': instance.id,
      'requesterId': instance.requesterId,
      'addresseeId': instance.addresseeId,
      'status': instance.status,
      'createdAt': instance.createdAt,
      'actionedAt': instance.actionedAt,
      'requester': instance.requester,
      'addressee': instance.addressee,
    };

RelationshipListData _$RelationshipListDataFromJson(
        Map<String, dynamic> json) =>
    RelationshipListData(
      relationships: (json['relationships'] as List<dynamic>?)
              ?.map((e) =>
                  RelationshipResponse.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      total: (json['total'] as num?)?.toInt() ?? 0,
      limit: (json['limit'] as num?)?.toInt() ?? 0,
      offset: (json['offset'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$RelationshipListDataToJson(
        RelationshipListData instance) =>
    <String, dynamic>{
      'relationships': instance.relationships,
      'total': instance.total,
      'limit': instance.limit,
      'offset': instance.offset,
    };
