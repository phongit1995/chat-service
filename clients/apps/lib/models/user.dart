import 'package:json_annotation/json_annotation.dart';

part 'user.g.dart';

@JsonSerializable()
class User {
  final String id;
  final String username;
  final String email;
  final String? fullName;
  final String? avatar;
  final String? avatarURL;
  final String? bio;
  final String? phone;
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
    this.phone,
    this.status = 'offline',
  });

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}

@JsonSerializable()
class UserSearchResult {
  final String id;
  final String username;
  final String? fullName;
  final String? avatar;
  final String? bio;
  @JsonKey(defaultValue: false)
  final bool isOnline;

  UserSearchResult({
    required this.id,
    required this.username,
    this.fullName,
    this.avatar,
    this.bio,
    this.isOnline = false,
  });

  factory UserSearchResult.fromJson(Map<String, dynamic> json) =>
      _$UserSearchResultFromJson(json);
  Map<String, dynamic> toJson() => _$UserSearchResultToJson(this);

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}

enum RelationshipStatus {
  self('self'),
  none('none'),
  friend('friend'),
  pendingOutgoing('pending_outgoing'),
  pendingIncoming('pending_incoming'),
  blockedByMe('blocked_by_me'),
  blockedByThem('blocked_by_them'),
  unknown('');

  final String value;
  const RelationshipStatus(this.value);

  static RelationshipStatus fromValue(String? raw) {
    for (final v in RelationshipStatus.values) {
      if (v.value == raw) return v;
    }
    return RelationshipStatus.unknown;
  }
}

@JsonSerializable()
class RelationshipInfo {
  final String status;
  final String? requestId;
  final String? since;

  RelationshipInfo({required this.status, this.requestId, this.since});

  RelationshipStatus get statusEnum => RelationshipStatus.fromValue(status);
  bool get isSelf => statusEnum == RelationshipStatus.self;
  bool get isFriend => statusEnum == RelationshipStatus.friend;
  bool get isPendingOutgoing => statusEnum == RelationshipStatus.pendingOutgoing;
  bool get isPendingIncoming => statusEnum == RelationshipStatus.pendingIncoming;
  bool get isBlockedByMe => statusEnum == RelationshipStatus.blockedByMe;
  bool get isBlockedByThem => statusEnum == RelationshipStatus.blockedByThem;

  factory RelationshipInfo.fromJson(Map<String, dynamic> json) =>
      _$RelationshipInfoFromJson(json);
  Map<String, dynamic> toJson() => _$RelationshipInfoToJson(this);
}

@JsonSerializable()
class UserPublicProfile {
  final String id;
  final String username;
  final String? fullName;
  final String? avatar;
  final String? bio;
  @JsonKey(defaultValue: false)
  final bool isOnline;
  final String? lastActiveAt;
  final String? createdAt;
  final RelationshipInfo? relationship;

  UserPublicProfile({
    required this.id,
    required this.username,
    this.fullName,
    this.avatar,
    this.bio,
    this.isOnline = false,
    this.lastActiveAt,
    this.createdAt,
    this.relationship,
  });

  factory UserPublicProfile.fromJson(Map<String, dynamic> json) =>
      _$UserPublicProfileFromJson(json);
  Map<String, dynamic> toJson() => _$UserPublicProfileToJson(this);

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}
