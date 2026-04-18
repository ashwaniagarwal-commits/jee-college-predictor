'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept: string;
  maxSize: number;
}

export default function FileDropzone({
  onFileSelect,
  accept,
  maxSize,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size <= maxSize) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        alert(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size <= maxSize) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        alert(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-[#FF6B35] bg-orange-50'
          : selectedFile
          ? 'border-green-500 bg-green-50'
          : 'border-gray-300 bg-white hover:border-[#FF6B35] hover:bg-orange-50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
      />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="font-semibold text-gray-900">{selectedFile.name}</p>
          <p className="text-sm text-gray-600">
            {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="w-12 h-12 text-[#FF6B35]" />
          <div>
            <p className="font-semibold text-gray-900">
              Drag and drop your scorecard
            </p>
            <p className="text-sm text-gray-600">or click to select a file</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Supported formats: PDF, PNG, JPG. Max size: {maxSize / 1024 / 1024}MB
          </p>
        </div>
      )}
    </div>
  );
}
