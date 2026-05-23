import 'dart:async';

import 'package:just_audio/just_audio.dart';

class AudioPlaybackService {
  AudioPlaybackService();

  final AudioPlayer _player = AudioPlayer();
  String? _currentId;
  String? _currentUrl;

  final _currentIdController = StreamController<String?>.broadcast();
  Stream<String?> get currentIdStream => _currentIdController.stream;
  String? get currentId => _currentId;

  Stream<Duration> get positionStream => _player.positionStream;
  Stream<bool> get playingStream => _player.playingStream;
  Stream<ProcessingState> get processingStateStream =>
      _player.processingStateStream;
  Duration? get duration => _player.duration;

  Future<void> play(String messageId, String url, {double speed = 1.0}) async {
    if (_currentId != messageId || _currentUrl != url) {
      _currentId = messageId;
      _currentUrl = url;
      _currentIdController.add(messageId);
      try {
        await _player.setUrl(url);
      } catch (_) {
        return;
      }
    }
    await _player.setSpeed(speed);
    await _player.play();
  }

  Future<void> pause() async {
    await _player.pause();
  }

  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }

  Future<void> setSpeed(double speed) async {
    await _player.setSpeed(speed);
  }

  Future<void> stop() async {
    await _player.stop();
    _currentId = null;
    _currentUrl = null;
    _currentIdController.add(null);
  }

  Future<void> dispose() async {
    await _player.dispose();
    await _currentIdController.close();
  }
}
