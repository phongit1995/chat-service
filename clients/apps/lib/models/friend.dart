import 'package:json_annotation/json_annotation.dart';

part 'friend.g.dart';

@JsonSerializable()
class Friend {
  final String id;
  final String username;
  final String email;
  final String? avatar;
  final String? fullName;
  final String? friendAt;
  @JsonKey(defaultValue: false)
  final bool isOnline;
  final String? lastActiveAt;

  Friend({
    required this.id,
    required this.username,
    required this.email,
    this.avatar,
    this.fullName,
    this.friendAt,
    this.isOnline = false,
    this.lastActiveAt,
  });

  factory Friend.fromJson(Map<String, dynamic> json) => _$FriendFromJson(json);
  Map<String, dynamic> toJson() => _$FriendToJson(this);

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;

  Friend copyWith({bool? isOnline, String? lastActiveAt}) => Friend(
        id: id,
        username: username,
        email: email,
        avatar: avatar,
        fullName: fullName,
        friendAt: friendAt,
        isOnline: isOnline ?? this.isOnline,
        lastActiveAt: lastActiveAt ?? this.lastActiveAt,
      );
}

@JsonSerializable()
class FriendListData {
  @JsonKey(defaultValue: <Friend>[])
  final List<Friend> friends;
  @JsonKey(defaultValue: 0)
  final int total;
  @JsonKey(defaultValue: 0)
  final int limit;
  @JsonKey(defaultValue: 0)
  final int offset;

  FriendListData({
    required this.friends,
    required this.total,
    required this.limit,
    required this.offset,
  });

  factory FriendListData.fromJson(Map<String, dynamic> json) =>
      _$FriendListDataFromJson(json);
  Map<String, dynamic> toJson() => _$FriendListDataToJson(this);
}
