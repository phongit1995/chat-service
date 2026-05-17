import 'dart:io';

import 'package:dio/dio.dart';

import '../models/models.dart';
import '../models/requests.dart';
import '../network/message_api_client.dart';

class MessageService {
  final MessageApiClient _client;
  final Dio _dio;

  MessageService(this._client, this._dio);

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
    final res = await _client.sendMessage(
      SendMessageRequest(
        conversationId: conversationId,
        content: content,
        clientMsgId: clientMsgId,
      ),
    );
    return res.data.data!;
  }

  Future<Message> sendImageMessage(
    String conversationId,
    File file, {
    String? clientMsgId,
  }) async {
    final fileName = file.uri.pathSegments.isNotEmpty
        ? file.uri.pathSegments.last
        : 'image.jpg';
    final form = FormData.fromMap({
      'conversationId': conversationId,
      if (clientMsgId != null) 'clientMsgId': clientMsgId,
      'file': await MultipartFile.fromFile(file.path, filename: fileName),
    });
    final res = await _dio.post<Map<String, dynamic>>(
      '/messages/images',
      data: form,
      options: Options(
        contentType: 'multipart/form-data',
        sendTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 60),
      ),
    );
    return Message.fromJson(res.data!['data'] as Map<String, dynamic>);
  }

  Future<Message> toggleReaction(
    String conversationId,
    String messageId,
    String type,
  ) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/messages/$conversationId/$messageId/reactions',
      data: {'type': type},
    );
    return Message.fromJson(res.data!['data'] as Map<String, dynamic>);
  }

  Future<Message> sendDirectMessage(
    String recipientId,
    String content, {
    String? clientMsgId,
  }) async {
    final res = await _client.sendDirectMessage(
      SendDirectMessageRequest(
        recipientId: recipientId,
        content: content,
        clientMsgId: clientMsgId,
      ),
    );
    return res.data.data!;
  }

  Future<Message> updateMessage(
    String conversationId,
    String messageId,
    String content,
  ) async {
    final res = await _client.updateMessage(
      conversationId,
      messageId,
      UpdateMessageRequest(content: content),
    );
    return res.data.data!;
  }

  Future<void> deleteMessage(String conversationId, String messageId) async {
    await _client.deleteMessage(conversationId, messageId);
  }
}
