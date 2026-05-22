import 'package:json_annotation/json_annotation.dart';

part 'relationship.g.dart';

@JsonSerializable()
class RelationshipUserInfo {
  final String id;
  final String username;
  final String email;
  final String? avatar;
  final String? fullName;

  RelationshipUserInfo({
    required this.id,
    required this.username,
    required this.email,
    this.avatar,
    this.fullName,
  });

  factory RelationshipUserInfo.fromJson(Map<String, dynamic> json) =>
      _$RelationshipUserInfoFromJson(json);
  Map<String, dynamic> toJson() => _$RelationshipUserInfoToJson(this);

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}

@JsonSerializable()
class RelationshipResponse {
  final String id;
  final String requesterId;
  final String addresseeId;
  final String status;
  final String createdAt;
  final String? actionedAt;
  final RelationshipUserInfo? requester;
  final RelationshipUserInfo? addressee;

  RelationshipResponse({
    required this.id,
    required this.requesterId,
    required this.addresseeId,
    required this.status,
    required this.createdAt,
    this.actionedAt,
    this.requester,
    this.addressee,
  });

  factory RelationshipResponse.fromJson(Map<String, dynamic> json) =>
      _$RelationshipResponseFromJson(json);
  Map<String, dynamic> toJson() => _$RelationshipResponseToJson(this);
}

@JsonSerializable()
class RelationshipListData {
  @JsonKey(defaultValue: <RelationshipResponse>[])
  final List<RelationshipResponse> relationships;
  @JsonKey(defaultValue: 0)
  final int total;
  @JsonKey(defaultValue: 0)
  final int limit;
  @JsonKey(defaultValue: 0)
  final int offset;

  RelationshipListData({
    required this.relationships,
    required this.total,
    required this.limit,
    required this.offset,
  });

  factory RelationshipListData.fromJson(Map<String, dynamic> json) =>
      _$RelationshipListDataFromJson(json);
  Map<String, dynamic> toJson() => _$RelationshipListDataToJson(this);
}
