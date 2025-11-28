"use client";

import { useState } from "react";
import { Search, FileText, Upload, FolderOpen, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

export default function NotesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    const filteredSubjects = SUBJECTS.filter((subject) =>
        subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex justify-center items-center min-h-screen bg-[#A8D7B7] p-4 sm:p-8">
            <div className="w-full max-w-[1400px] h-[85vh] bg-[#FFF7E4] border-2 border-black p-4 sm:p-8 flex flex-col sm:flex-row gap-6 shadow-[8px_8px_0px_#000]">

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
                                className={`w-full text-left p-4 border-2 border-black transition-all flex justify-between items-center group ${selectedSubject === subject
                                    ? "bg-[#F4C430] shadow-[4px_4px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                                    : "bg-white hover:bg-gray-50 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_#000]"
                                    }`}
                            >
                                <span className="font-bold text-sm sm:text-base truncate pr-2">{subject}</span>
                                <ChevronRight className={`h-5 w-5 transition-transform ${selectedSubject === subject ? "translate-x-2" : "group-hover:translate-x-1"}`} />
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
                                    <div className="mb-8 border-b-2 border-black pb-4">
                                        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">
                                            {selectedSubject}
                                        </h2>
                                        <p className="text-gray-600 font-medium flex items-center gap-2">
                                            <FolderOpen className="h-5 w-5" />
                                            Subject Repository
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        {[1, 2, 3, 4, 5].map((unit) => (
                                            <div key={unit} className="border-2 border-black p-5 bg-[#f8f9fa] hover:bg-white transition-colors">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                                        <span className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-full text-sm">
                                                            {unit}
                                                        </span>
                                                        Unit {unit}
                                                    </h3>
                                                    <span className="px-3 py-1 bg-[#A8D7B7] border border-black text-xs font-bold uppercase tracking-wider">
                                                        Pending
                                                    </span>
                                                </div>

                                                <div className="border-2 border-dashed border-gray-400 rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-white hover:bg-gray-50 transition-colors cursor-pointer group">
                                                    <div className="p-3 bg-gray-100 rounded-full group-hover:bg-[#F4C430] transition-colors border border-black">
                                                        <Upload className="h-6 w-6 text-black" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-bold text-sm">Upload Notes</p>
                                                        <p className="text-xs text-gray-500 mt-1">PDF, DOCX, or images</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
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
            </div>
        </div>
    );
}
