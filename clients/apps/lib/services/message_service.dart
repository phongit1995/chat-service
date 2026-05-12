import '../models/models.dart';
import '../models/requests.dart';
import '../network/message_api_client.dart';

class MessageService {
  final MessageApiClient _client;

  MessageService(this._client);

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
