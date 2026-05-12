import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../models/models.dart';

part 'api_client.g.dart';

@RestApi()
abstract class ApiClient {
  factory ApiClient(Dio dio, {String baseUrl}) = _ApiClient;

  @POST('/auth/login')
  Future<HttpResponse<ApiResponse<LoginData>>> login(
    @Body() Map<String, dynamic> body,
  );

  @POST('/auth/register')
  Future<HttpResponse<ApiResponse<dynamic>>> register(
    @Body() Map<String, dynamic> body,
  );

  @GET('/user/me')
  Future<HttpResponse<ApiResponse<User>>> getProfile();

  @GET('/conversations')
  Future<HttpResponse<ApiResponse<ConversationsResponse>>> getConversations();

  @GET('/messages/{conversationId}')
  Future<HttpResponse<ApiResponse<MessagesResponse>>> getMessages(
    @Path('conversationId') String conversationId, {
    @Query('limit') int limit = 50,
  });

  @POST('/messages')
  Future<HttpResponse<ApiResponse<Message>>> sendMessage(
    @Body() Map<String, dynamic> body,
  );

  @POST('/messages/direct')
  Future<HttpResponse<ApiResponse<Message>>> sendDirectMessage(
    @Body() Map<String, dynamic> body,
  );

  @GET('/user/search')
  Future<HttpResponse<ApiResponse<UsersResponse>>> searchUsers(
    @Query('q') String query, {
    @Query('limit') int limit = 20,
  });

  @POST('/conversations/direct')
  Future<HttpResponse<ApiResponse<Conversation>>> createDirectConversation(
    @Body() Map<String, dynamic> body,
  );

  @POST('/conversations/group')
  Future<HttpResponse<ApiResponse<Conversation>>> createGroupConversation(
    @Body() Map<String, dynamic> body,
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

  @PATCH('/messages/{conversationId}/{messageId}')
  Future<HttpResponse<ApiResponse<Message>>> updateMessage(
    @Path('conversationId') String conversationId,
    @Path('messageId') String messageId,
    @Body() Map<String, dynamic> body,
  );

  @DELETE('/messages/{conversationId}/{messageId}')
  Future<HttpResponse<ApiResponse<dynamic>>> deleteMessage(
    @Path('conversationId') String conversationId,
    @Path('messageId') String messageId,
  );
}
