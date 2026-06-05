import { useRef, useState } from 'react'
import { userChatStore } from '../store/userChatStore';
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, SmileIcon } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import FileUpload from './FileUpload';
import VoiceRecorder from './VoiceRecorder';

function MessageInput() {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { sendMessage, uploadFile, sendAudio, sendTyping, sendStopTyping } = userChatStore();

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!text.trim() && !imagePreview && !selectedFile) return;

    if (selectedFile) {
      uploadFile(selectedFile);
      setSelectedFile(null);
    } else {
      sendMessage({
        text: text.trim(),
        image: imagePreview,
      })
    }

    setText("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (fileData, file) => {
    if (fileData) {
      setSelectedFile(fileData);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSendAudio = (audioData, duration) => {
    sendAudio(audioData, duration);
  };

  return (
    <div className="p-4 w-full border-t border-white/5 relative">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-slate-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
              type="button"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2 relative">
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              sendTyping();
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => sendStopTyping(), 2000);
            }}
            className="w-full bg-slate-800/50 text-slate-100 placeholder-slate-500 text-sm rounded-lg px-4 py-3 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all pr-10"
            placeholder="Type a message..."
          />

          {/* Emoji Picker Button */}
          <button
            type="button"
            className={`absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-cyan-400 ${showEmojiPicker ? "text-cyan-400 bg-slate-700/50" : ""}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <SmileIcon size={20} />
          </button>

          {showEmojiPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowEmojiPicker(false)}
              />
              <div className="absolute bottom-14 right-0 z-50">
                <EmojiPicker
                  theme="dark"
                  onEmojiClick={(emojiObject) => {
                    setText((prev) => prev + emojiObject.emoji);
                  }}
                />
              </div>
            </>
          )}

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-700/50 transition-colors ${imagePreview ? "text-cyan-500" : "text-slate-400 hover:text-cyan-400"
              }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon size={20} />
          </button>
        </div>

        {/* File Upload */}
        <FileUpload onFileSelect={handleFileSelect} />

        {/* Voice Recorder */}
        <VoiceRecorder onSendAudio={handleSendAudio} />

        <button
          type="submit"
          className="p-3 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20"
          disabled={!text.trim() && !imagePreview && !selectedFile}
        >
          <SendIcon size={20} />
        </button>
      </form>
    </div>
  )
}

export default MessageInput