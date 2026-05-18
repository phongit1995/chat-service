import 'dart:io';

import 'package:emoji_picker_flutter/emoji_picker_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_gradients.dart';

class MessageComposer extends StatefulWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  final Future<void> Function(File file) onSendImage;

  const MessageComposer({
    super.key,
    required this.controller,
    required this.sending,
    required this.onSend,
    required this.onSendImage,
  });

  @override
  State<MessageComposer> createState() => _MessageComposerState();
}

class _MessageComposerState extends State<MessageComposer> {
  bool _emojiOpen = false;
  final _focus = FocusNode();
  final _picker = ImagePicker();

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
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
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.add_photo_alternate_outlined),
                    color: AppColors.textTertiary,
                    tooltip: 'Send photo',
                    onPressed: widget.sending ? null : _openAttachSheet,
                  ),
                  Expanded(
                    child: TextField(
                      controller: widget.controller,
                      focusNode: _focus,
                      decoration: const InputDecoration(hintText: 'Type a message…'),
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
                  GestureDetector(
                    onTap: widget.sending ? null : widget.onSend,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: widget.sending ? null : AppGradients.signature,
                        color: widget.sending ? AppColors.textDisabled : null,
                        shape: BoxShape.circle,
                        boxShadow: widget.sending ? null : AppShadows.glowGradient,
                      ),
                      child: const Icon(Icons.send_rounded, color: Colors.white),
                    ),
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
