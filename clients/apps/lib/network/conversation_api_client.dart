import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../models/models.dart';
import '../models/requests.dart';
import '../models/responses.dart';

part 'conversation_api_client.g.dart';

@RestApi()
abstract class ConversationApiClient {
  factory ConversationApiClient(Dio dio, {String baseUrl}) =
      _ConversationApiClient;

  @GET('/conversations')
  Future<HttpResponse<ApiResponse<ConversationsResponse>>> getConversations();

  @POST('/conversations/direct')
  Future<HttpResponse<ApiResponse<Conversation>>> createDirectConversation(
    @Body() CreateDirectConversationRequest body,
  );

  @POST('/conversations/group')
  Future<HttpResponse<ApiResponse<Conversation>>> createGroupConversation(
    @Body() CreateGroupConversationRequest body,
  );

  @PUT('/conversations/{id}/read')
  Future<HttpResponse<ApiResponse<dynamic>>> markAsRead(
    @Path('id') String conversationId,
  );

  @GET('/conversations/direct/check')
  Future<HttpResponse<ApiResponse<Conversation>>> checkDirectConversation(
    @Query('recipientId') String recipientId,
  );

  @GET('/conversations/{id}')
  Future<HttpResponse<ApiResponse<Conversation>>> getConversationDetail(
    @Path('id') String conversationId,
  );
}
