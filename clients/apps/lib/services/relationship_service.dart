import 'package:dio/dio.dart';
import '../models/friend.dart';

class RelationshipService {
  final Dio _dio;
  RelationshipService(this._dio);

  Future<FriendListData> getFriends({int limit = 50, int offset = 0}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/relationships/friends',
      queryParameters: {'limit': limit, 'offset': offset},
    );
    final data = (res.data?['data'] as Map<String, dynamic>?) ?? const {};
    return FriendListData.fromJson(data);
  }

  Future<void> sendRequest(String userId) async {
    await _dio.post<dynamic>('/relationships/request', data: {'userId': userId});
  }

  Future<void> respond(String relationshipId, String action) async {
    await _dio.put<dynamic>(
      '/relationships/$relationshipId/respond',
      data: {'action': action},
    );
  }

  Future<void> cancel(String relationshipId) async {
    await _dio.delete<dynamic>('/relationships/$relationshipId/cancel');
  }

  Future<void> unfriend(String relationshipId) async {
    await _dio.delete<dynamic>('/relationships/$relationshipId/unfriend');
  }

  Future<void> block(String userId) async {
    await _dio.post<dynamic>('/relationships/block', data: {'userId': userId});
  }

  Future<void> unblock(String relationshipId) async {
    await _dio.delete<dynamic>('/relationships/$relationshipId/unblock');
  }
}
