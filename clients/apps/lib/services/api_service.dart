import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/env.dart';
import '../models/models.dart';

class ApiService {
  final Dio _dio;
  static const _tokenKey = 'accessToken';

  ApiService()
      : _dio = Dio(BaseOptions(
          baseUrl: '${Env.apiBaseUrl}/api',
          headers: {'Content-Type': 'application/json'},
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        )) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString(_tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    ));
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    final data = res.data['data'] as Map<String, dynamic>;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, data['token'] as String);
    return data;
  }

  Future<void> register(String username, String email, String password, String? fullName) async {
    await _dio.post('/auth/register', data: {
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
    final res = await _dio.get('/user/me');
    return User.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<List<Conversation>> getConversations() async {
    final res = await _dio.get('/conversations');
    final list = (res.data['data']['conversations'] as List?) ?? [];
    return list.map((e) => Conversation.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Message>> getMessages(String conversationId, {int limit = 50}) async {
    final res = await _dio.get('/messages/$conversationId', queryParameters: {'limit': limit});
    final list = (res.data['data']['messages'] as List?) ?? [];
    return list.map((e) => Message.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Message> sendMessage(String conversationId, String content) async {
    final res = await _dio.post('/messages', data: {
      'conversationId': conversationId,
      'content': content,
      'type': 'text',
    });
    return Message.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<List<UserSearchResult>> searchUsers(String query) async {
    final res = await _dio.get('/user/search', queryParameters: {'q': query, 'limit': 20});
    final list = (res.data['data']['users'] as List?) ?? [];
    return list.map((e) => UserSearchResult.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Conversation> createDirectConversation(String recipientId) async {
    final res = await _dio.post('/conversations/direct', data: {'recipientId': recipientId});
    return Conversation.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<Conversation> createGroupConversation(String name, List<String> participantIds) async {
    final res = await _dio.post('/conversations/group', data: {
      'name': name,
      'participantIds': participantIds,
    });
    return Conversation.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<void> markAsRead(String conversationId) async {
    await _dio.put('/conversations/$conversationId/read');
  }
}
