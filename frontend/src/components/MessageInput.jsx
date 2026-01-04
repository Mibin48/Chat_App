import { useRef, useState } from 'react'
import { userChatStore } from '../store/userChatStore';
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, SmileIcon } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

function MessageInput() {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { sendMessage, isSoundEnabled, sendTyping, sendStopTyping } = userChatStore();
  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!text.trim() && !imagePreview) return;
    sendMessage({
      text: text.trim(),
      image: imagePreview,
    })
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

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
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
<<<<<<< HEAD

          {/* Emoji Picker Button */}
          <button
            type="button"
            className={`absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-cyan-400 ${showEmojiPicker ? "text-cyan-400 bg-slate-700/50" : ""}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <SmileIcon size={20} />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-14 right-0 z-50">
              <EmojiPicker
                theme="dark"
                onEmojiClick={(emojiObject) => {
                  setText((prev) => prev + emojiObject.emoji);
                }}
              />
            </div>
          )}
=======
>>>>>>> 20a73ed6a2d94a74ed49698669f32356140672d3

          {/* Emoji Picker Button */}
          <button
            type="button"
            className={`absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-cyan-400 ${showEmojiPicker ? "text-cyan-400 bg-slate-700/50" : ""}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <SmileIcon size={20} />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-14 right-0 z-50">
              <EmojiPicker
                theme="dark"
                onEmojiClick={(emojiObject) => {
                  setText((prev) => prev + emojiObject.emoji);
                }}
              />
            </div>
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

<<<<<<< HEAD
          <button
            type="button"
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-700/50 transition-colors ${imagePreview ? "text-cyan-500" : "text-slate-400 hover:text-cyan-400"
              }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon size={20} />
          </button>
        </div>

=======
>>>>>>> 20a73ed6a2d94a74ed49698669f32356140672d3
        <button
          type="submit"
          className="p-3 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20"
          disabled={!text.trim() && !imagePreview}
<<<<<<< HEAD
          classNam="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg px-4 py-2 font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
=======
>>>>>>> 20a73ed6a2d94a74ed49698669f32356140672d3
        >
          <SendIcon size={20} />
        </button>
      </form>
    </div>
  )
}

export default MessageInput