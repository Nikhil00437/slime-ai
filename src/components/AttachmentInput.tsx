import React, { useRef } from 'react';
import { Mic, Video, FileText, X, Upload } from 'lucide-react';

export interface Attachment {
  id: string;
  type: 'image' | 'audio' | 'video' | 'file';
  name: string;
  url: string;
  mimeType: string;
  size?: number;
}

interface AttachmentInputProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  acceptedTypes?: string[];
}

export const AttachmentInput: React.FC<AttachmentInputProps> = ({
  attachments,
  onAttachmentsChange,
  acceptedTypes,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (acceptedTypes && !acceptedTypes.some(type => file.type.includes(type))) {
        continue;
      }

      const attachment: Attachment = {
        id: `att-${Date.now()}-${i}`,
        type: file.type.startsWith('image/') ? 'image' :
              file.type.startsWith('audio/') ? 'audio' :
              file.type.startsWith('video/') ? 'video' : 'file',
        name: file.name,
        mimeType: file.type,
        size: file.size,
        url: '',
      };

      if (attachment.type === 'image') {
        attachment.url = await readFileAsDataURL(file);
      } else {
        attachment.url = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    onAttachmentsChange([...attachments, ...newAttachments]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    const filtered = attachments.filter(a => a.id !== id);
    onAttachmentsChange(filtered);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="relative group bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
          >
            {att.type === 'image' ? (
              <img
                src={att.url}
                alt={att.name}
                className="h-20 w-20 object-cover"
              />
            ) : (
              <div className="h-20 w-20 flex items-center justify-center bg-gray-700">
                {att.type === 'audio' && <Mic size={24} className="text-gray-400" />}
                {att.type === 'video' && <Video size={24} className="text-gray-400" />}
                {att.type === 'file' && <FileText size={24} className="text-gray-400" />}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={() => removeAttachment(att.id)}
                className="p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-1 py-0.5">
              <p className="text-xs text-white truncate">{att.name}</p>
              {att.size && (
                <p className="text-[10px] text-gray-400">{formatSize(att.size)}</p>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-20 w-20 flex flex-col items-center justify-center bg-gray-800/50 border border-gray-700 border-dashed rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-colors"
          title="Add attachment"
        >
          <Upload size={20} className="text-gray-400" />
          <span className="text-xs text-gray-500 mt-1">Add</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes?.join(',') || '*/*'}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getCapabilityFilters(attachments: Attachment[]): Partial<Record<string, boolean>> {
  const filters: Partial<Record<string, boolean>> = {};
  
  if (attachments.some(a => a.type === 'image')) {
    filters.image = true;
  }
  if (attachments.some(a => a.type === 'audio')) {
    filters.audio = true;
  }
  if (attachments.some(a => a.type === 'video')) {
    filters.video = true;
  }
  if (attachments.some(a => a.type === 'file')) {
    filters.fileUpload = true;
  }
  
  return filters;
}

export function filterModelsByCapabilities(
  models: any[],
  filters: Partial<Record<string, boolean>>
) {
  if (Object.keys(filters).length === 0) {
    return models;
  }

  return models.filter((model) => {
    const caps = model.capabilities;
    if (!caps) return true;

    if (filters.image && !caps.image) return false;
    if (filters.audio && !caps.audio) return false;
    if (filters.video && !caps.video) return false;
    if (filters.fileUpload && !caps.fileUpload) return false;

    return true;
  });
}
