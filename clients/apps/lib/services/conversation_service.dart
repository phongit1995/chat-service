import '../models/models.dart';
import '../models/requests.dart';
import '../network/conversation_api_client.dart';

class ConversationService {
  final ConversationApiClient _client;

  ConversationService(this._client);

  Future<List<Conversation>> getConversations() async {
    final res = await _client.getConversations();
    return res.data.data?.conversations ?? [];
  }

  Future<Conversation> createDirectConversation(String recipientId) async {
    final res = await _client.createDirectConversation(
      CreateDirectConversationRequest(recipientId: recipientId),
    );
    return res.data.data!;
  }

  Future<Conversation> createGroupConversation(
    String name,
    List<String> participantIds,
  ) async {
    final res = await _client.createGroupConversation(
      CreateGroupConversationRequest(
        name: name,
        participantIds: participantIds,
      ),
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

  Future<void> sendTyping(String conversationId) async {
    await _client.sendTyping(TypingRequest(conversationId: conversationId));
  }
}
