"use client";

import { useState, useRef, useEffect } from "react";
import { Search, FileText, Upload, FolderOpen, ChevronRight, Eye, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/lib/supabase";

const SUBJECTS = [
  "Engineering Chemistry",
  "Embedded Computing Systems",
  "Programming in C",
  "Engineering Physics",
  "Discrete Mathematics",
  "Data Structures",
  "Theory of Computation",
  "Cryptography and Network Security",
  "Object-Oriented System Design",
  "XML and Web Services",
  "TCP/IP Design and Implementation",
  "Artificial Intelligence",
  "Distributed Architecture of Enterprise Applications",
  "Computer Graphics and Multimedia",
];

interface Note {
  id: string;
  unit: number;
  filename: string;
  file_url: string;
}

export default function NotesTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [uploadingUnit, setUploadingUnit] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [notes, setNotes] = useState<{ [key: number]: Note }>({});
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (selectedSubject) {
      fetchNotes(selectedSubject);
    } else {
      setNotes({});
    }
  }, [selectedSubject]);

  const fetchNotes = async (subject: string) => {
    setLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("subject", subject);

      if (error) throw error;

      const notesMap: { [key: number]: Note } = {};
      data?.forEach((note) => {
        notesMap[note.unit] = note;
      });
      setNotes(notesMap);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubject || selectedUnit === null) return;

    if (file.type !== "application/pdf") {
      alert("Please upload PDF files only");
      return;
    }

    setUploadingUnit(selectedUnit);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", selectedSubject);
    formData.append("unit", selectedUnit.toString());

    try {
      const response = await fetch("/api/notes-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      alert("File uploaded successfully!");
      // Refresh notes after upload
      fetchNotes(selectedSubject);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setUploadingUnit(null);
      setSelectedUnit(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerUpload = (unit: number) => {
    setSelectedUnit(unit);
    fileInputRef.current?.click();
  };

  const filteredSubjects = SUBJECTS.filter((subject) =>
    subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#FFF7E4] border-2 border-black p-4 sm:p-8 flex flex-col sm:flex-row gap-6 shadow-[8px_8px_0px_#000] min-h-[75vh]">
      {/* Left Panel: Subjects List */}
      <div className="w-full sm:w-1/3 flex flex-col gap-4 h-full">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-black bg-white focus:outline-none focus:shadow-[4px_4px_0px_#000] transition-all placeholder:text-gray-500 font-medium"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {filteredSubjects.map((subject) => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`w-full text-left p-4 border-2 border-black transition-all flex justify-between items-center group ${
                selectedSubject === subject
                  ? "bg-[#F4C430] shadow-[4px_4px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white hover:bg-gray-50 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
              }`}
            >
              <span className="font-bold text-sm sm:text-base truncate pr-2">{subject}</span>
              <ChevronRight
                className={`h-5 w-5 transition-transform ${
                  selectedSubject === subject ? "translate-x-2" : "group-hover:translate-x-1"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: Units View */}
      <div className="flex-1 h-full bg-white border-2 border-black p-6 sm:p-8 shadow-[8px_8px_0px_#000] overflow-y-auto relative">
        {selectedSubject ? (
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedSubject}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-8 border-b-2 border-black pb-4 flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">
                      {selectedSubject}
                    </h2>
                    <p className="text-gray-600 font-medium flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      Subject Repository
                    </p>
                  </div>
                  {loadingNotes && (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                  )}
                </div>

                <div className="space-y-6">
                  {[1, 2, 3, 4, 5].map((unit) => {
                    const note = notes[unit];
                    return (
                      <div key={unit} className="border-2 border-black p-5 bg-[#f8f9fa] hover:bg-white transition-colors relative">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-bold flex items-center gap-2">
                            <span className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-full text-sm">
                              {unit}
                            </span>
                            Unit {unit}
                          </h3>
                          <span className={`px-3 py-1 border border-black text-xs font-bold uppercase tracking-wider ${note ? "bg-[#A8D7B7]" : "bg-gray-200"}`}>
                            {note ? "Available" : "Pending"}
                          </span>
                        </div>

                        {note ? (
                          <div className="flex gap-4">
                            <a
                              href={note.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 border-2 border-black bg-[#F4C430] hover:bg-[#ffcf40] text-black font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000]"
                            >
                              <Eye className="h-5 w-5" />
                              View Notes
                            </a>
                            <button
                              onClick={() => triggerUpload(unit)}
                              className="border-2 border-black bg-white hover:bg-gray-50 text-black font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000]"
                              title="Update Notes"
                            >
                              <RefreshCw className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => triggerUpload(unit)}
                            className="border-2 border-dashed border-gray-400 rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-white hover:bg-gray-50 transition-colors cursor-pointer group"
                          >
                            <div className="p-3 bg-gray-100 rounded-full group-hover:bg-[#F4C430] transition-colors border border-black">
                              {uploadingUnit === unit ? (
                                <div className="h-6 w-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Upload className="h-6 w-6 text-black" />
                              )}
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-sm">
                                {uploadingUnit === unit ? "Uploading..." : "Upload Notes"}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">PDF Only</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <div className="w-24 h-24 bg-[#F4C430] border-2 border-black rounded-full flex items-center justify-center mb-6 shadow-[4px_4px_0px_#000]">
              <FileText className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Select a Subject</h3>
            <p className="text-gray-600 max-w-xs">
              Choose a subject from the list to view units and upload notes.
            </p>
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
      />
    </div>
  );
}
