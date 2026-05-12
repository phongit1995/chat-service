import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../network/api_client.dart';
import '../network/dio_factory.dart';

class ApiService {
  static const _tokenKey = 'accessToken';
  late final ApiClient _client;

  ApiService() {
    _client = ApiClient(createDio());
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _client.login({'email': email, 'password': password});
    final data = res.data.data!;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, data.token);
    return {'token': data.token, 'user': data.user.toJson()};
  }

  Future<void> register(
    String username,
    String email,
    String password,
    String? fullName,
  ) async {
    await _client.register({
      'username': username,
      'email': email,
      'password': password,
      if (fullName != null && fullName.isNotEmpty) 'full_name': fullName,
    });
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<User> getProfile() async {
    final res = await _client.getProfile();
    return res.data.data!;
  }

  Future<List<Conversation>> getConversations() async {
    final res = await _client.getConversations();
    return res.data.data?.conversations ?? [];
  }

  Future<List<Message>> getMessages(
    String conversationId, {
    int limit = 50,
  }) async {
    final res = await _client.getMessages(conversationId, limit: limit);
    return res.data.data?.messages ?? [];
  }

  Future<Message> sendMessage(
    String conversationId,
    String content, {
    String? clientMsgId,
  }) async {
    final res = await _client.sendMessage({
      'conversationId': conversationId,
      'content': content,
      'type': 'text',
      if (clientMsgId != null) 'clientMsgId': clientMsgId,
    });
    return res.data.data!;
  }

  Future<List<UserSearchResult>> searchUsers(String query) async {
    final res = await _client.searchUsers(query);
    return res.data.data?.users ?? [];
  }

  Future<Conversation> createDirectConversation(String recipientId) async {
    final res = await _client.createDirectConversation(
      {'recipientId': recipientId},
    );
    return res.data.data!;
  }

  Future<Conversation> createGroupConversation(
    String name,
    List<String> participantIds,
  ) async {
    final res = await _client.createGroupConversation(
      {'name': name, 'participantIds': participantIds},
    );
    return res.data.data!;
  }

  Future<void> markAsRead(String conversationId) async {
    await _client.markAsRead(conversationId);
  }

  Future<Conversation?> checkDirectConversation(String recipientId) async {
    try {
      final res = await _client.checkDirectConversation(recipientId);
      return res.data.data;
    } catch (_) {
      return null;
    }
  }

  Future<Conversation> getConversationDetail(String conversationId) async {
    final res = await _client.getConversationDetail(conversationId);
    return res.data.data!;
  }

  Future<Message> sendDirectMessage(
    String recipientId,
    String content, {
    String? clientMsgId,
  }) async {
    final res = await _client.sendDirectMessage({
      'recipientId': recipientId,
      'content': content,
      'type': 'text',
      if (clientMsgId != null) 'clientMsgId': clientMsgId,
    });
    return res.data.data!;
  }
}
