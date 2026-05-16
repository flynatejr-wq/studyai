import { useState, useRef } from "react";

const TABS = [
  { id: "text", label: "📝 Paste Text", desc: "Copy & paste lecture notes or a transcript" },
  { id: "image", label: "🖼️ Upload Photo", desc: "Photo of slides, whiteboard, or notes" },
  { id: "audio", label: "🎙️ Upload Audio", desc: "Recording of your lecture (MP3, M4A, WAV)" },
];

export default function UploadForm({ onSubmit, loading, dark }) {
  const [activeTab, setActiveTab] = useState("text");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const base = dark
    ? { tab: "border-white/10 text-gray-400 hover:text-white hover:bg-white/5", activeTab: "bg-indigo-600/20 text-indigo-300 border-indigo-500/30", textarea: "bg-white/5 border-white/10 text-white placeholder-gray-500", dropzone: "border-white/20 hover:border-indigo-500/40 hover:bg-white/5", btn: "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500" }
    : { tab: "border-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-50", activeTab: "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600", textarea: "border-gray-200 text-gray-700 placeholder-gray-400", dropzone: "border-gray-200 hover:border-indigo-300 hover:bg-gray-50", btn: "bg-indigo-600 hover:bg-indigo-700" };

  const handleFileSelect = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(activeTab === "image" ? URL.createObjectURL(f) : f.name);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleTabChange = (tab) => { setActiveTab(tab); setFile(null); setPreview(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === "text") {
      if (transcript.trim().length < 50) { alert("Please paste a longer transcript."); return; }
      onSubmit({ type: "text", transcript });
    } else {
      if (!file) { alert(`Please select a ${activeTab} file.`); return; }
      onSubmit({ type: activeTab, file });
    }
  };

  const canSubmit = activeTab === "text" ? transcript.trim().length >= 50 : !!file;

  return (
    <form onSubmit={handleSubmit} className={`rounded-2xl overflow-hidden ${dark ? "bg-white/5 border border-white/10" : "bg-white shadow-md"}`}>
      {/* Tabs */}
      <div className={`flex border-b ${dark ? "border-white/10" : "border-gray-100"}`}>
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${activeTab === tab.id ? base.activeTab : base.tab}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        <p className={`text-sm mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {TABS.find(t => t.id === activeTab)?.desc}
        </p>

        {activeTab === "text" && (
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)} disabled={loading}
            className={`w-full h-48 border rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm ${base.textarea} ${dark ? "" : "text-gray-700"}`}
            placeholder="Paste your lecture notes or transcript here..." />
        )}

        {(activeTab === "image" || activeTab === "audio") && (
          <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)} onClick={() => fileInputRef.current?.click()}
            className={`h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${dragOver ? "border-indigo-500 bg-indigo-500/10" : base.dropzone}`}>
            <input ref={fileInputRef} type="file"
              accept={activeTab === "image" ? "image/*" : "audio/*,.mp3,.mp4,.m4a,.wav,.webm"}
              className="hidden" onChange={e => handleFileSelect(e.target.files[0])} />
            {preview ? (
              activeTab === "image"
                ? <img src={preview} alt="Preview" className="h-full w-full object-contain rounded-xl p-2" />
                : <div className="text-center"><span className="text-5xl">🎙️</span><p className="text-indigo-400 font-semibold mt-3 text-sm">{preview}</p><p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>Click to change</p></div>
            ) : (
              <>
                <span className="text-4xl mb-3">{activeTab === "image" ? "🖼️" : "🎙️"}</span>
                <p className={`font-medium text-sm ${dark ? "text-gray-300" : "text-gray-500"}`}>Drag & drop or click to upload</p>
                <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  {activeTab === "image" ? "JPG, PNG, WEBP" : "MP3, M4A, WAV — up to 25MB"}
                </p>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          {activeTab === "text" ? <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{transcript.length} characters</span> : <span />}
          <button type="submit" disabled={loading || !canSubmit}
            className={`${base.btn} disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm ml-auto`}>
            {loading ? "⏳ Processing..." : "✨ Generate Study Guide"}
          </button>
        </div>
      </div>
    </form>
  );
}
