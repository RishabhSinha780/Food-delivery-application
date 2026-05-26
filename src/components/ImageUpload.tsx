import React, { useState, useRef } from "react";
import { UploadCloud, X, ImageIcon } from "lucide-react";
import { resizeImage } from "@/lib/imageHelper";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = "Upload Image" }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [resizing, setResizing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    setResizing(true);
    try {
      const base64 = await resizeImage(file);
      onChange(base64);
      toast.success("Image uploaded and optimized successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to process image.");
    } finally {
      setResizing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      
      {value ? (
        <div className="relative rounded-2xl border border-border overflow-hidden h-40 group bg-muted/30">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] gap-2 ${
            dragActive
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/10"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChange}
            disabled={resizing}
          />
          {resizing ? (
            <div className="flex flex-col items-center gap-2">
              <span className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Resizing and optimizing...</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-muted rounded-full">
                <UploadCloud className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  <span className="text-primary font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WEBP (auto-resized)</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
