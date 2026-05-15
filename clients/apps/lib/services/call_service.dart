import '../models/call.dart';
import '../network/call_api_client.dart';

class CallService {
  final CallApiClient _client;

  CallService(this._client);

  Future<CallTokenResponse> start(String conversationId, CallType callType) async {
    final res = await _client.startCall(
      StartCallBody(
        conversationId: conversationId,
        callType: callType.name,
      ),
    );
    return res.data.data!;
  }

  Future<CallTokenResponse> answer(String callId) async {
    final res = await _client.answerCall(callId);
    return res.data.data!;
  }

  Future<void> decline(String callId) async {
    await _client.declineCall(callId);
  }

  Future<void> end(String callId) async {
    await _client.endCall(callId);
  }
}
