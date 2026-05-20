import { useState, useRef } from "react";

const MAX_TEXT = 50000;

const TABS = [
  { id: "text",    label: "📝 Paste Text",    labelSm: "📝 Text",    desc: "Copy & paste lecture notes or a transcript" },
  { id: "youtube", label: "🎥 YouTube",        labelSm: "🎥 YouTube", desc: "Paste a YouTube URL — we'll pull the transcript" },
  { id: "file",    label: "📄 Upload File",    labelSm: "📄 File",    desc: "PDF, Word, PowerPoint, TXT, CSV, Markdown" },
  { id: "image",   label: "🖼️ Photo",          labelSm: "🖼️ Photo",   desc: "Snap a photo of slides, whiteboard, or notes" },
  { id: "audio",   label: "🎙️ Audio",          labelSm: "🎙️ Audio",   desc: "Upload a lecture recording (MP3, M4A, WAV)" },
];

const STYLE_OPTIONS = [
  { id: "detailed", label: "Detailed",    emoji: "📖", desc: "Full notes with examples" },
  { id: "brief",    label: "Brief",       emoji: "⚡", desc: "Essentials only" },
  { id: "bullets",  label: "Bullets",     emoji: "•",  desc: "Bullet-point format" },
  { id: "guide",    label: "Study Guide", emoji: "🎓", desc: "Examples & application" },
  { id: "terms",    label: "Key Terms",   emoji: "🔑", desc: "Vocab & definitions" },
];

const DIFFICULTY_OPTIONS = [
  { id: "easy",     label: "Simplified", emoji: "🌱" },
  { id: "standard", label: "Standard",   emoji: "📖" },
  { id: "advanced", label: "Advanced",   emoji: "🚀" },
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
  const [style,       setStyle]       = useState("detailed");
  const fileInputRef = useRef();

  const base = dark ? {
    tab: "text-gray-400 hover:text-white hover:bg-white/5",
    activeTab: "bg-indigo-600/20 text-indigo-300 border-b-2 border-indigo-500",
    textarea: "bg-white/5 border-white/10 text-white placeholder-gray-500",
    dropzone: "border-white/20 hover:border-indigo-500/40 hover:bg-white/5",
    sub: "text-gray-500",
    chip: "bg-white/5 border-white/10 text-gray-400 hover:text-white",
    chipActive: "bg-indigo-600/30 border-indigo-500/50 text-indigo-300",
  } : {
    tab: "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
    activeTab: "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600",
    textarea: "border-gray-200 text-gray-700 placeholder-gray-400",
    dropzone: "border-gray-200 hover:border-indigo-300 hover:bg-gray-50",
    sub: "text-gray-400",
    chip: "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700",
    chipActive: "bg-indigo-50 border-indigo-300 text-indigo-700",
  };

  const acceptMap = {
    // iOS Safari works best with just the extensions — long MIME lists confuse it
    file:  ".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,.rtf",
    image: "image/*",
    audio: ".mp3,.m4a,.wav,.aac,.ogg,.webm,audio/*",
  };

  // Bug 36 fix: track the object URL so we can revoke it when it's replaced or the tab changes
  const objectUrlRef = useRef(null);

  const handleFileSelect = (f) => {
    if (!f) return;
    // Revoke any previous object URL to avoid memory leaks
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    if (activeTab === "image") {
      const url = URL.createObjectURL(f);
      objectUrlRef.current = url;
      setPreview(url);
    } else {
      setPreview(f.name);
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleTabChange = (tab) => {
    // Revoke any object URL when switching away from the image tab
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
    setActiveTab(tab); setFile(null); setPreview(null); setFormError(""); setYoutubeUrl("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    if (activeTab === "text") {
      if (transcript.trim().length < 30) { setFormError("Please paste a longer transcript (at least 30 characters)."); return; }
      if (transcript.length > MAX_TEXT)  { setFormError(`Transcript is too long. Please limit to ${MAX_TEXT.toLocaleString()} characters.`); return; }
      onSubmit({ type: "text", transcript, difficulty, style });
    } else if (activeTab === "youtube") {
      if (!youtubeUrl.trim()) { setFormError("Please enter a YouTube URL."); return; }
      const match = youtubeUrl.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
      if (!match) { setFormError("That doesn't look like a valid YouTube URL."); return; }
      onSubmit({ type: "youtube", youtubeUrl: youtubeUrl.trim(), difficulty, style });
    } else {
      if (!file) { setFormError("Please select a file first."); return; }
      onSubmit({ type: activeTab, file, difficulty, style });
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

        {/* File / Image / Audio dropzone — uses <label> so tapping anywhere on mobile
            directly opens the native file picker without JS .click() tricks, which
            iOS Safari blocks when not directly triggered by a user gesture. */}
        {activeTab !== "text" && activeTab !== "youtube" && (
          <label
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`h-36 sm:h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${dragOver ? "border-indigo-500 bg-indigo-500/10" : base.dropzone}`}>
            <input ref={fileInputRef} type="file" accept={acceptMap[activeTab]}
              className="sr-only"
              onChange={e => handleFileSelect(e.target.files[0])} />
            {dropzoneContent()}
          </label>
        )}

        {formError && (
          <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{formError}</p>
        )}

        {/* ── Output options ── */}
        <div className={`mt-5 rounded-xl p-3.5 space-y-3 ${dark ? "bg-white/3 border border-white/8" : "bg-gray-50 border border-gray-100"}`}>
          {/* Format */}
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Format</p>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_OPTIONS.map(s => (
                <button key={s.id} type="button" onClick={() => setStyle(s.id)}
                  title={s.desc}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border min-h-[36px] ${style === s.id ? base.chipActive : base.chip}`}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Depth */}
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Depth</p>
            <div className="flex gap-1.5">
              {DIFFICULTY_OPTIONS.map(d => (
                <button key={d.id} type="button" onClick={() => setDifficulty(d.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border min-h-[36px] ${difficulty === d.id ? base.chipActive : base.chip}`}>
                  {d.emoji} {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          {activeTab === "text"
            ? <span className={`text-xs ${base.sub} ${transcript.length > MAX_TEXT ? "text-red-400" : ""}`}>{transcript.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</span>
            : <span />}
          <button type="submit" disabled={loading || !canSubmit}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm min-h-[44px]">
            {loading ? "⏳ Processing..." : "✨ Generate Notes"}
          </button>
        </div>
      </div>
    </form>
  );
}
