import { useState, useRef } from "react";

const MAX_TEXT = 50000;

const TABS = [
  { id: "text",  label: "📝 Paste Text",    desc: "Copy & paste lecture notes or a transcript" },
  { id: "file",  label: "📄 Upload File",   desc: "PDF, Word, PowerPoint, TXT, CSV, Markdown" },
  { id: "image", label: "🖼️ Photo",         desc: "Snap a photo of slides, whiteboard, or notes" },
  { id: "audio", label: "🎙️ Audio",         desc: "Upload a lecture recording (MP3, M4A, WAV)" },
];

const FILE_ICONS = { pdf: "📕", docx: "📘", doc: "📘", pptx: "📙", ppt: "📙", txt: "📄", md: "📄", csv: "📊", rtf: "📄" };

function getFileIcon(name = "") {
  const ext = name.split(".").pop().toLowerCase();
  return FILE_ICONS[ext] || "📄";
}

export default function UploadForm({ onSubmit, loading, dark }) {
  const [activeTab, setActiveTab] = useState("text");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [formError, setFormError] = useState("");
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

  const handleTabChange = (tab) => { setActiveTab(tab); setFile(null); setPreview(null); setFormError(""); };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");
    if (activeTab === "text") {
      if (transcript.trim().length < 30) { setFormError("Please paste a longer transcript (at least 30 characters)."); return; }
      if (transcript.length > MAX_TEXT) { setFormError(`Transcript is too long. Please limit to ${MAX_TEXT.toLocaleString()} characters.`); return; }
      onSubmit({ type: "text", transcript });
    } else {
      if (!file) { setFormError("Please select a file first."); return; }
      onSubmit({ type: activeTab, file });
    }
  };

  const canSubmit = activeTab === "text" ? transcript.trim().length >= 30 : !!file;

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
      <div className={`flex border-b ${dark ? "border-white/10" : "border-gray-100"} overflow-x-auto`}>
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => handleTabChange(tab.id)}
            className={`flex-1 min-w-max py-3 px-3 text-xs font-semibold transition-colors whitespace-nowrap ${activeTab === tab.id ? base.activeTab : base.tab}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        <p className={`text-xs mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {TABS.find(t => t.id === activeTab)?.desc}
        </p>

        {/* Text */}
        {activeTab === "text" && (
          <textarea value={transcript} onChange={e => { setTranscript(e.target.value); if (formError) setFormError(""); }} disabled={loading}
            className={`w-full h-48 border rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm ${base.textarea}`}
            placeholder="Paste your lecture notes or transcript here..." />
        )}

        {/* File / Image / Audio dropzone */}
        {activeTab !== "text" && (
          <div onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${dragOver ? "border-indigo-500 bg-indigo-500/10" : base.dropzone}`}>
            <input ref={fileInputRef} type="file" accept={acceptMap[activeTab]} className="hidden"
              onChange={e => handleFileSelect(e.target.files[0])} />
            {dropzoneContent()}
          </div>
        )}

        {formError && (
          <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{formError}</p>
        )}

        <div className="flex items-center justify-between mt-4">
          {activeTab === "text"
            ? <span className={`text-xs ${base.sub} ${transcript.length > MAX_TEXT ? "text-red-400" : ""}`}>{transcript.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</span>
            : <span />}
          <button type="submit" disabled={loading || !canSubmit}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm ml-auto">
            {loading ? "⏳ Processing..." : "✨ Generate Study Guide"}
          </button>
        </div>
      </div>
    </form>
  );
}
