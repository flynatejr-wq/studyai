import { useState, useRef } from "react";

const MAX_TEXT = 50000;

const TABS = [
  { id: "text",    label: "📝 Paste Text",    labelSm: "📝 Text",    desc: "Copy & paste lecture notes or a transcript" },
  { id: "youtube", label: "🎥 YouTube",        labelSm: "🎥 YouTube", desc: "Paste a YouTube URL — we'll pull the transcript" },
  { id: "file",    label: "📄 Upload File",    labelSm: "📄 File",    desc: "PDF, Word, PowerPoint, TXT, CSV, Markdown" },
  { id: "image",   label: "🖼️ Photo",          labelSm: "🖼️ Photo",   desc: "Snap a photo of slides, whiteboard, or notes" },
  { id: "audio",   label: "🎙️ Audio",          labelSm: "🎙️ Audio",   desc: "Upload a lecture recording (MP3, M4A, WAV)" },
];

const DIFFICULTY_OPTIONS = [
  { id: "standard",     label: "Standard",     emoji: "📖" },
  { id: "easy",         label: "Simplified",   emoji: "🌱" },
  { id: "advanced",     label: "Advanced",     emoji: "🚀" },
];

const FILE_ICONS = { pdf: "📕", docx: "📘", doc: "📘", pptx: "📙", ppt: "📙", txt: "📄", md: "📄", csv: "📊", rtf: "📄" };

function getFileIcon(name = "") {
  const ext = name.split(".").pop().toLowerCase();
  return FILE_ICONS[ext] || "📄";
}

export default function UploadForm({ onSubmit, loading, dark }) {
  const [activeTab,   setActiveTab]   = useState("text");
  const [transcript,  setTranscript]  = useState("");
  const [youtubeUrl,  setYoutubeUrl]  = useState("");
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [dragOver,    setDragOver]    = useState(false);
  const [formError,   setFormError]   = useState("");
  const [difficulty,  setDifficulty]  = useState("standard");
  const fileInputRef = useRef();

  const base = dark ? {
    tab: "text-gray-400 hover:text-white hover:bg-white/5",
    activeTab: "bg-indigo-600/20 text-indigo-300 border-b-2 border-indigo-500",
    textarea: "bg-white/5 border-white/10 text-white placeholder-gray-500",
    dropzone: "border-white/20 hover:border-indigo-500/40 hover:bg-white/5",
    sub: "text-gray-500",
  } : {
    tab: "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
    activeTab: "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600",
    textarea: "border-gray-200 text-gray-700 placeholder-gray-400",
    dropzone: "border-gray-200 hover:border-indigo-300 hover:bg-gray-50",
    sub: "text-gray-400",
  };

  const acceptMap = {
    file:  ".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.csv,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/*",
    image: "image/*",
    audio: "audio/*,.mp3,.mp4,.m4a,.wav,.webm",
  };

  const handleFileSelect = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(activeTab === "image" ? URL.createObjectURL(f) : f.name);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleTabChange = (tab) => { setActiveTab(tab); setFile(null); setPreview(null); setFormError(""); setYoutubeUrl(""); };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    if (activeTab === "text") {
      if (transcript.trim().length < 30) { setFormError("Please paste a longer transcript (at least 30 characters)."); return; }
      if (transcript.length > MAX_TEXT)  { setFormError(`Transcript is too long. Please limit to ${MAX_TEXT.toLocaleString()} characters.`); return; }
      onSubmit({ type: "text", transcript, difficulty });
    } else if (activeTab === "youtube") {
      if (!youtubeUrl.trim()) { setFormError("Please enter a YouTube URL."); return; }
      const match = youtubeUrl.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
      if (!match) { setFormError("That doesn't look like a valid YouTube URL."); return; }
      onSubmit({ type: "youtube", youtubeUrl: youtubeUrl.trim(), difficulty });
    } else {
      if (!file) { setFormError("Please select a file first."); return; }
      onSubmit({ type: activeTab, file, difficulty });
    }
  };

  const canSubmit = activeTab === "text" ? transcript.trim().length >= 30
                  : activeTab === "youtube" ? youtubeUrl.trim().length > 0
                  : !!file;

  const dropzoneContent = () => {
    if (preview) {
      if (activeTab === "image") return <img src={preview} alt="Preview" className="h-full w-full object-contain rounded-xl p-2" />;
      return (
        <div className="text-center px-4">
          <div className="text-5xl mb-3">{getFileIcon(preview)}</div>
          <p className={`font-semibold text-sm ${dark ? "text-indigo-300" : "text-indigo-600"} break-all`}>{preview}</p>
          <p className={`text-xs mt-1 ${base.sub}`}>Click to change file</p>
        </div>
      );
    }
    if (activeTab === "file") return (
      <>
        <div className="flex gap-2 text-3xl mb-3">📕 📘 📙 📄</div>
        <p className={`font-medium text-sm ${dark ? "text-gray-300" : "text-gray-500"}`}>Drag & drop or click to upload</p>
        <p className={`text-xs mt-1 ${base.sub}`}>PDF • Word (.docx) • PowerPoint (.pptx) • TXT • CSV • Markdown</p>
      </>
    );
    if (activeTab === "image") return (
      <>
        <span className="text-4xl mb-3">🖼️</span>
        <p className={`font-medium text-sm ${dark ? "text-gray-300" : "text-gray-500"}`}>Drag & drop or click to upload</p>
        <p className={`text-xs mt-1 ${base.sub}`}>JPG, PNG, WEBP — slides, whiteboard, notes</p>
      </>
    );
    return (
      <>
        <span className="text-4xl mb-3">🎙️</span>
        <p className={`font-medium text-sm ${dark ? "text-gray-300" : "text-gray-500"}`}>Drag & drop or click to upload</p>
        <p className={`text-xs mt-1 ${base.sub}`}>MP3, M4A, WAV — up to 25MB</p>
      </>
    );
  };

  return (
    <form onSubmit={handleSubmit} className={`rounded-2xl overflow-hidden ${dark ? "bg-white/5 border border-white/10" : "bg-white shadow-md"}`}>
      {/* Tabs */}
      <div className={`flex border-b ${dark ? "border-white/10" : "border-gray-100"}`}>
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-3 px-1 sm:px-3 text-xs font-semibold transition-colors ${activeTab === tab.id ? base.activeTab : base.tab}`}>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.labelSm}</span>
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6">
        <p className={`text-xs mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {TABS.find(t => t.id === activeTab)?.desc}
        </p>

        {/* Text */}
        {activeTab === "text" && (
          <textarea value={transcript} onChange={e => { setTranscript(e.target.value); if (formError) setFormError(""); }} disabled={loading}
            className={`w-full h-36 sm:h-48 border rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm ${base.textarea}`}
            placeholder="Paste your lecture notes or transcript here..." />
        )}

        {/* YouTube URL */}
        {activeTab === "youtube" && (
          <div className="space-y-3">
            <input
              type="url"
              value={youtubeUrl}
              onChange={e => { setYoutubeUrl(e.target.value); if (formError) setFormError(""); }}
              disabled={loading}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm ${base.textarea}`}
            />
            <p className={`text-xs ${base.sub}`}>
              🎥 Works with any YouTube video that has captions (auto-generated or manual).
            </p>
          </div>
        )}

        {/* File / Image / Audio dropzone */}
        {activeTab !== "text" && activeTab !== "youtube" && (
          <div onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`h-36 sm:h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${dragOver ? "border-indigo-500 bg-indigo-500/10" : base.dropzone}`}>
            <input ref={fileInputRef} type="file" accept={acceptMap[activeTab]} className="hidden"
              onChange={e => handleFileSelect(e.target.files[0])} />
            {dropzoneContent()}
          </div>
        )}

        {formError && (
          <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{formError}</p>
        )}

        {/* Difficulty picker */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium ${base.sub}`}>Depth:</span>
          {DIFFICULTY_OPTIONS.map(d => (
            <button key={d.id} type="button" onClick={() => setDifficulty(d.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${difficulty === d.id ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-300" : `${dark ? "bg-white/5 border-white/10 text-gray-400 hover:text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700"}`}`}>
              {d.emoji} {d.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          {activeTab === "text"
            ? <span className={`text-xs ${base.sub} ${transcript.length > MAX_TEXT ? "text-red-400" : ""}`}>{transcript.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</span>
            : <span />}
          <button type="submit" disabled={loading || !canSubmit}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm">
            {loading ? "⏳ Processing..." : "✨ Generate Study Guide"}
          </button>
        </div>
      </div>
    </form>
  );
}
