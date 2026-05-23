import 'dart:async';
import 'dart:io';

import 'package:emoji_picker_flutter/emoji_picker_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../providers/audio_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_gradients.dart';
import 'audio_recorder_bar.dart';

class MessageComposer extends ConsumerStatefulWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  final Future<void> Function(File file) onSendImage;
  final Future<void> Function(File file, double duration, List<double> waveform) onSendAudio;
  final bool editing;
  final VoidCallback? onCancelEdit;

  const MessageComposer({
    super.key,
    required this.controller,
    required this.sending,
    required this.onSend,
    required this.onSendImage,
    required this.onSendAudio,
    this.editing = false,
    this.onCancelEdit,
  });

  @override
  ConsumerState<MessageComposer> createState() => _MessageComposerState();
}

class _MessageComposerState extends ConsumerState<MessageComposer> {
  bool _emojiOpen = false;
  bool _recording = false;
  bool _sendingAudio = false;
  Duration _elapsed = Duration.zero;
  List<double> _levels = List.filled(40, 0.0);
  StreamSubscription<List<double>>? _levelsSub;
  StreamSubscription<Duration>? _elapsedSub;
  final _focus = FocusNode();
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    _focus.dispose();
    _levelsSub?.cancel();
    _elapsedSub?.cancel();
    super.dispose();
  }

  void _onTextChanged() {
    if (mounted) setState(() {});
  }

  bool _hasText() => widget.controller.text.trim().isNotEmpty;

  Future<void> _startRecording() async {
    if (_recording) return;
    final recorder = ref.read(audioRecorderProvider);
    try {
      await recorder.start();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Microphone access denied: $e')),
        );
      }
      return;
    }
    _levelsSub = recorder.levelsStream.listen((l) {
      if (mounted) setState(() => _levels = l);
    });
    _elapsedSub = recorder.elapsedStream.listen((d) {
      if (mounted) setState(() => _elapsed = d);
    });
    if (mounted) {
      setState(() {
        _recording = true;
        _elapsed = Duration.zero;
        _levels = List.filled(40, 0.0);
      });
    }
  }

  Future<void> _stopAndSend() async {
    if (!_recording || _sendingAudio) return;
    setState(() => _sendingAudio = true);
    final recorder = ref.read(audioRecorderProvider);
    try {
      final rec = await recorder.stop();
      _levelsSub?.cancel();
      _elapsedSub?.cancel();
      if (mounted) setState(() => _recording = false);
      if (rec == null) return;
      if (rec.duration < 0.5) {
        await rec.file.delete().catchError((_) => rec.file);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Recording too short')),
          );
        }
        return;
      }
      await widget.onSendAudio(rec.file, rec.duration, rec.waveform);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send audio: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _sendingAudio = false);
    }
  }

  Future<void> _cancelRecording() async {
    if (!_recording) return;
    final recorder = ref.read(audioRecorderProvider);
    await recorder.cancel();
    _levelsSub?.cancel();
    _elapsedSub?.cancel();
    if (mounted) setState(() => _recording = false);
  }

  void _toggleEmoji() {
    if (_emojiOpen) {
      setState(() => _emojiOpen = false);
      _focus.requestFocus();
    } else {
      _focus.unfocus();
      SystemChannels.textInput.invokeMethod('TextInput.hide');
      Future.delayed(const Duration(milliseconds: 80), () {
        if (mounted) setState(() => _emojiOpen = true);
      });
    }
  }

  void _onEmojiSelected(Category? c, Emoji emoji) {
    final ctrl = widget.controller;
    final sel = ctrl.selection;
    final start = sel.start < 0 ? ctrl.text.length : sel.start;
    final end = sel.end < 0 ? ctrl.text.length : sel.end;
    final next = ctrl.text.replaceRange(start, end, emoji.emoji);
    ctrl.value = TextEditingValue(
      text: next,
      selection: TextSelection.collapsed(offset: start + emoji.emoji.length),
    );
  }

  Future<void> _processFile(File file) async {
    final size = await file.length();
    if (size > 20 * 1024 * 1024) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ảnh quá lớn (>20MB)')),
        );
      }
      return;
    }
    await widget.onSendImage(file);
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );
      if (picked == null) return;
      await _processFile(File(picked.path));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick image: $e')),
        );
      }
    }
  }

  void _openAttachSheet() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Photo Library'),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Camera'),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.camera);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.bgSurface,
          border: Border(top: BorderSide(color: AppColors.lineSubtle)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (widget.editing)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.bgOverlay,
                  border: const Border(
                    bottom: BorderSide(color: AppColors.lineSubtle),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.edit_outlined,
                        size: 16, color: AppColors.primary),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text('Editing message',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary)),
                    ),
                    GestureDetector(
                      onTap: widget.onCancelEdit,
                      child: const Icon(Icons.close,
                          size: 18, color: AppColors.textTertiary),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: _recording
                  ? AudioRecorderBar(
                      elapsed: _elapsed,
                      levels: _levels,
                      onCancel: _cancelRecording,
                      onSend: _stopAndSend,
                    )
                  : Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.add_photo_alternate_outlined),
                          color: AppColors.textTertiary,
                          tooltip: 'Send photo',
                          onPressed:
                              (widget.sending || widget.editing) ? null : _openAttachSheet,
                        ),
                        Expanded(
                          child: TextField(
                            controller: widget.controller,
                            focusNode: _focus,
                            decoration:
                                const InputDecoration(hintText: 'Type a message…'),
                            onSubmitted: (_) => widget.onSend(),
                            onTap: () {
                              if (_emojiOpen) setState(() => _emojiOpen = false);
                            },
                            textInputAction: TextInputAction.send,
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            _emojiOpen
                                ? Icons.keyboard_outlined
                                : Icons.emoji_emotions_outlined,
                          ),
                          color: AppColors.textTertiary,
                          tooltip: 'Emoji',
                          onPressed: _toggleEmoji,
                        ),
                        const SizedBox(width: 4),
                        _hasText() || widget.editing
                            ? GestureDetector(
                                onTap: widget.sending ? null : widget.onSend,
                                child: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    gradient: widget.sending ? null : AppGradients.signature,
                                    color: widget.sending ? AppColors.textDisabled : null,
                                    shape: BoxShape.circle,
                                    boxShadow:
                                        widget.sending ? null : AppShadows.glowGradient,
                                  ),
                                  child: Icon(
                                    widget.editing
                                        ? Icons.check_rounded
                                        : Icons.send_rounded,
                                    color: Colors.white,
                                  ),
                                ),
                              )
                            : IconButton(
                                icon: const Icon(Icons.mic_rounded),
                                color: AppColors.primary,
                                tooltip: 'Record voice message',
                                onPressed: widget.sending ? null : _startRecording,
                              ),
                      ],
                    ),
            ),
            if (_emojiOpen)
              SizedBox(
                height: 280,
                child: EmojiPicker(
                  onEmojiSelected: _onEmojiSelected,
                  config: const Config(
                    height: 280,
                    emojiViewConfig: EmojiViewConfig(
                      columns: 8,
                      emojiSizeMax: 28,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
