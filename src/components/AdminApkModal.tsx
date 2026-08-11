import React, { useState, useRef } from 'react';
import { 
  X, Upload, Image as ImageIcon, FileCode, Link as LinkIcon, 
  Trash2, Plus, Sparkles, CheckCircle2, AlertCircle, RefreshCw 
} from 'lucide-react';
import { ApkItem, Category } from '../types';
import { 
  uploadFileToStorage, 
  validateImageFile, 
  validateApkFile, 
  validateExternalUrl 
} from '../services/storage';
import { addCategory } from '../services/db';

interface AdminApkModalProps {
  editingApk: Partial<ApkItem> | null;
  categories: Category[];
  onClose: () => void;
  onSave: (apkData: Partial<ApkItem>) => Promise<void>;
  onCategoryCreated?: () => void;
}

export const AdminApkModal: React.FC<AdminApkModalProps> = ({
  editingApk,
  categories,
  onClose,
  onSave,
  onCategoryCreated
}) => {
  const isEditing = !!editingApk?.id;

  // Form State
  const [formData, setFormData] = useState<Partial<ApkItem>>({
    name: editingApk?.name || '',
    shortDescription: editingApk?.shortDescription || '',
    description: editingApk?.description || '',
    category: editingApk?.category || (categories[0]?.name || 'Games'),
    categoryId: editingApk?.categoryId || (categories[0]?.id || ''),
    version: editingApk?.version || '1.0.0',
    androidVersion: editingApk?.androidVersion || '7.0+',
    size: editingApk?.size || '45 MB',
    icon: editingApk?.icon || editingApk?.iconUrl || '',
    iconUrl: editingApk?.iconUrl || editingApk?.icon || '',
    screenshots: editingApk?.screenshots || editingApk?.screenshotUrls || [],
    screenshotUrls: editingApk?.screenshotUrls || editingApk?.screenshots || [],
    features: editingApk?.features || ['Premium Unlocked', 'No Ads', 'VIP Features'],
    changelog: editingApk?.changelog || 'Initial release',
    downloadMethod: editingApk?.downloadMethod || 'upload',
    apkFilePath: editingApk?.apkFilePath || '',
    apkFileName: editingApk?.apkFileName || '',
    apkFileSize: editingApk?.apkFileSize || '',
    externalDownloadUrl: editingApk?.externalDownloadUrl || '',
    downloadUrl: editingApk?.downloadUrl || '',
    isFree: editingApk?.isFree || false,
    isPremium: editingApk?.isPremium !== undefined ? editingApk.isPremium : !editingApk?.isFree,
    isFeatured: editingApk?.isFeatured || false,
    isActive: editingApk?.isActive !== undefined ? editingApk.isActive : true,
  });

  // UI / Upload States
  const [featuresInput, setFeaturesInput] = useState<string>(
    (formData.features || []).join('\n')
  );

  const [iconUploadProgress, setIconUploadProgress] = useState<number | null>(null);
  const [apkUploadProgress, setApkUploadProgress] = useState<number | null>(null);
  const [screenshotUploadProgress, setScreenshotUploadProgress] = useState<number | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New Category Inline Form State
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // File Input & Form Container Refs
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const apkFileInputRef = useRef<HTMLInputElement>(null);
  const screenshotsFileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Icon File Handler
  const handleIconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const val = validateImageFile(file);
    if (!val.valid) {
      setUploadError(val.error || 'Invalid image file');
      return;
    }

    try {
      setIconUploadProgress(10);
      const tempId = editingApk?.id || `temp_${Date.now()}`;
      const path = `apks/icons/${tempId}_${Date.now()}_${file.name}`;
      
      const downloadUrl = await uploadFileToStorage(file, path, (progress) => {
        setIconUploadProgress(progress);
      });

      setFormData(prev => ({
        ...prev,
        icon: downloadUrl,
        iconUrl: downloadUrl
      }));
      setIconUploadProgress(null);
    } catch (err: any) {
      console.error(err);
      setUploadError('Failed to upload icon image: ' + err.message);
      setIconUploadProgress(null);
    }
  };

  // Remove Icon Handler
  const handleRemoveIcon = () => {
    setFormData(prev => ({ ...prev, icon: '', iconUrl: '' }));
    if (iconFileInputRef.current) iconFileInputRef.current.value = '';
  };

  // APK File Handler
  const handleApkSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const val = validateApkFile(file);
    if (!val.valid) {
      setUploadError(val.error || 'Only .apk files are supported.');
      return;
    }

    try {
      setApkUploadProgress(5);
      const tempId = editingApk?.id || `temp_${Date.now()}`;
      const path = `apks/files/${tempId}_${Date.now()}_${file.name}`;

      const fileSizeFormatted = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      const downloadUrl = await uploadFileToStorage(file, path, (p) => {
        setApkUploadProgress(p);
      });

      setFormData(prev => ({
        ...prev,
        apkFilePath: downloadUrl,
        apkFileName: file.name,
        apkFileSize: fileSizeFormatted,
        downloadUrl: downloadUrl,
        size: fileSizeFormatted
      }));
      setApkUploadProgress(null);
    } catch (err: any) {
      console.error(err);
      setUploadError('Failed to upload APK file: ' + err.message);
      setApkUploadProgress(null);
    }
  };

  // Screenshot Selection Handler
  const handleScreenshotsSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const fileList: File[] = Array.from(files);

    for (const f of fileList) {
      const val = validateImageFile(f);
      if (!val.valid) {
        setUploadError(`File "${f.name}": ${val.error}`);
        return;
      }
    }

    try {
      setScreenshotUploadProgress(10);
      const tempId = editingApk?.id || `temp_${Date.now()}`;
      const uploadedUrls: string[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const path = `apks/screenshots/${tempId}_${i}_${Date.now()}_${file.name}`;
        const url = await uploadFileToStorage(file, path, (p) => {
          const overall = Math.round(((i + p / 100) / fileList.length) * 100);
          setScreenshotUploadProgress(overall);
        });
        uploadedUrls.push(url);
      }

      setFormData(prev => {
        const current = prev.screenshots || prev.screenshotUrls || [];
        const combined = [...current, ...uploadedUrls];
        return {
          ...prev,
          screenshots: combined,
          screenshotUrls: combined
        };
      });
      setScreenshotUploadProgress(null);
    } catch (err: any) {
      console.error(err);
      setUploadError('Failed to upload screenshots: ' + err.message);
      setScreenshotUploadProgress(null);
    }
  };

  // Remove Screenshot
  const handleRemoveScreenshot = (index: number) => {
    setFormData(prev => {
      const current = prev.screenshots || [];
      const updated = current.filter((_, i) => i !== index);
      return {
        ...prev,
        screenshots: updated,
        screenshotUrls: updated
      };
    });
  };

  // Create New Category
  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    setCreatingCategory(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const catId = await addCategory({
        name,
        slug,
        active: true,
        order: categories.length + 1
      });

      setFormData(prev => ({
        ...prev,
        category: name,
        categoryId: catId,
        categoryName: name
      }));

      setNewCategoryName('');
      setShowNewCategoryInput(false);
      if (onCategoryCreated) onCategoryCreated();
    } catch (err: any) {
      alert('Error creating category: ' + err.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    const showError = (msg: string) => {
      setUploadError(msg);
      if (formRef.current) {
        formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    if (!formData.name?.trim()) {
      showError('APK Name is required.');
      return;
    }

    if (!formData.category) {
      showError('Please select a category.');
      return;
    }

    // Download Method Validation
    if (formData.downloadMethod === 'external') {
      if (formData.externalDownloadUrl?.trim()) {
        const val = validateExternalUrl(formData.externalDownloadUrl);
        if (!val.valid) {
          showError(val.error || 'Invalid external download URL');
          return;
        }
      }
    }

    // Process features list
    const parsedFeatures = featuresInput
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const finalIcon = formData.icon || formData.iconUrl || '';
    const finalScreenshots = formData.screenshots || formData.screenshotUrls || [];
    const finalDownloadUrl = formData.downloadMethod === 'external'
      ? (formData.externalDownloadUrl?.trim() || formData.downloadUrl || '')
      : (formData.apkFilePath || formData.downloadUrl || formData.externalDownloadUrl || '');

    const finalCategoryName = formData.category || formData.categoryName || 'Games';
    const selectedCatObj = categories.find(c => c.name === finalCategoryName);

    const payload: Partial<ApkItem> = {
      ...formData,
      name: formData.name.trim(),
      slug: formData.slug || formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: finalCategoryName,
      categoryName: finalCategoryName,
      categoryId: selectedCatObj?.id || formData.categoryId || '',
      icon: finalIcon,
      iconUrl: finalIcon,
      screenshots: finalScreenshots,
      screenshotUrls: finalScreenshots,
      features: parsedFeatures.length > 0 ? parsedFeatures : ['Premium Unlocked', 'VIP MOD'],
      changelog: formData.changelog?.trim() || 'Initial release',
      downloadMethod: formData.downloadMethod || 'upload',
      downloadUrl: finalDownloadUrl,
      externalDownloadUrl: formData.externalDownloadUrl?.trim() || '',
      apkFilePath: formData.apkFilePath || '',
      apkFileName: formData.apkFileName || '',
      apkFileSize: formData.apkFileSize || formData.size || '',
      isFree: !!formData.isFree,
      isPremium: !formData.isFree,
      isFeatured: !!formData.isFeatured,
      isActive: formData.isActive !== undefined ? formData.isActive : true,
      updatedAt: new Date().toISOString()
    };

    setSaving(true);
    try {
      await onSave(payload);
    } catch (err: any) {
      showError('Save failed: ' + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full my-auto shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {isEditing ? `Edit APK — ${editingApk.name}` : 'Add New Premium APK'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                Configure APK parameters, upload files, screenshots, and download options
              </p>
            </div>
          </div>

          <button
            id="btn-close-apk-modal"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Top Error Alert */}
          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl flex items-start gap-2 text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{uploadError}</span>
            </div>
          )}

          {/* 1. APK Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-300 font-bold block mb-1">
                APK Name / Title <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kinemaster Pro MOD"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-zinc-300 font-bold block">
                  Category <span className="text-amber-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  className="text-[11px] text-amber-400 hover:underline font-semibold flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> {showNewCategoryInput ? 'Cancel' : 'New Category'}
                </button>
              </div>

              {!showNewCategoryInput ? (
                <select
                  value={formData.category || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    const cat = categories.find(c => c.name === name);
                    setFormData(prev => ({
                      ...prev,
                      category: name,
                      categoryName: name,
                      categoryId: cat?.id || ''
                    }));
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500 transition"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={creatingCategory}
                    className="bg-amber-500 text-zinc-950 font-bold px-3 py-2 rounded-xl text-xs hover:bg-amber-400 transition"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. Version, Android Requirement, Size */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="text-zinc-400 font-medium block mb-1">Version</label>
              <input
                type="text"
                placeholder="v1.0.0"
                value={formData.version || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-400 font-medium block mb-1">Android Req.</label>
              <input
                type="text"
                placeholder="Android 7.0+"
                value={formData.androidVersion || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, androidVersion: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-400 font-medium block mb-1">File Size</label>
              <input
                type="text"
                placeholder="45 MB"
                value={formData.size || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>
          </div>

          {/* 3. APK ICON / LOGO UPLOAD */}
          <div className="bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" /> APK Icon / Logo
              </span>
              <span className="text-[10px] text-zinc-500">Supported: PNG, JPG, WEBP</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Icon Preview Box */}
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-md relative">
                {formData.icon || formData.iconUrl ? (
                  <img
                    src={formData.icon || formData.iconUrl}
                    alt="APK Icon"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-zinc-600" />
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 flex-1">
                <input
                  type="file"
                  ref={iconFileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleIconSelect}
                  className="hidden"
                  id="input-apk-icon-file"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => iconFileInputRef.current?.click()}
                    disabled={iconUploadProgress !== null}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-3.5 py-2 rounded-xl border border-zinc-700/60 transition flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    {formData.icon ? 'Replace Image' : 'Upload Image'}
                  </button>

                  {(formData.icon || formData.iconUrl) && (
                    <button
                      type="button"
                      onClick={handleRemoveIcon}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-3 py-2 rounded-xl border border-red-500/20 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                {iconUploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-amber-400 font-mono">
                      <span>Uploading image...</span>
                      <span>{iconUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full transition-all duration-300"
                        style={{ width: `${iconUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. DOWNLOAD METHOD & FILE UPLOAD */}
          <div className="bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800 space-y-3">
            <span className="font-bold text-zinc-200 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-amber-400" /> APK File & Download Method
            </span>

            {/* Tabs Selector */}
            <div className="grid grid-cols-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, downloadMethod: 'upload' }))}
                className={`py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  formData.downloadMethod === 'upload'
                    ? 'bg-amber-500 text-zinc-950 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Firebase APK Upload
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, downloadMethod: 'external' }))}
                className={`py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  formData.downloadMethod === 'external'
                    ? 'bg-amber-500 text-zinc-950 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" /> External Download Link
              </button>
            </div>

            {/* TAB CONTENT: Upload APK File */}
            {formData.downloadMethod === 'upload' ? (
              <div className="space-y-3 pt-1">
                <input
                  type="file"
                  ref={apkFileInputRef}
                  accept=".apk"
                  onChange={handleApkSelect}
                  className="hidden"
                  id="input-apk-binary-file"
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900 p-3.5 rounded-xl border border-zinc-800">
                  <div>
                    {formData.apkFileName ? (
                      <div>
                        <p className="font-bold text-amber-400 font-mono text-xs">{formData.apkFileName}</p>
                        <p className="text-[10px] text-zinc-500">Size: {formData.apkFileSize || 'Uploaded'}</p>
                      </div>
                    ) : (
                      <p className="text-zinc-400 text-xs">No APK file selected yet</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => apkFileInputRef.current?.click()}
                    disabled={apkUploadProgress !== null}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {formData.apkFilePath ? 'Replace APK File' : 'Choose APK File'}
                  </button>
                </div>

                {/* Progress Bar */}
                {apkUploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-amber-400 font-mono">
                      <span>Uploading APK file to Firebase Storage...</span>
                      <span>{apkUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-200"
                        style={{ width: `${apkUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* TAB CONTENT: External Download Link */
              <div className="space-y-2 pt-1">
                <label className="text-zinc-400 font-medium block">
                  Paste External Direct Download URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/downloads/app.apk"
                  value={formData.externalDownloadUrl || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    externalDownloadUrl: e.target.value,
                    downloadUrl: e.target.value
                  }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-zinc-500">
                  Ensure link starts with http:// or https:// and leads directly to file.
                </p>
              </div>
            )}
          </div>

          {/* 5. SCREENSHOTS UPLOAD */}
          <div className="bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" /> App Screenshots
              </span>

              <input
                type="file"
                ref={screenshotsFileInputRef}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                multiple
                onChange={handleScreenshotsSelect}
                className="hidden"
                id="input-apk-screenshots"
              />

              <button
                type="button"
                onClick={() => screenshotsFileInputRef.current?.click()}
                disabled={screenshotUploadProgress !== null}
                className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold px-3 py-1.5 rounded-xl border border-zinc-700/60 transition flex items-center gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Screenshots
              </button>
            </div>

            {/* Screenshots Grid */}
            {(formData.screenshots || []).length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {(formData.screenshots || []).map((url, idx) => (
                  <div key={idx} className="relative group aspect-video bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <img src={url} alt={`Screenshot ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveScreenshot(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-600 text-white rounded-lg opacity-90 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-xs text-center py-2">No screenshots added yet.</p>
            )}

            {screenshotUploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-amber-400 font-mono">
                  <span>Uploading screenshots...</span>
                  <span>{screenshotUploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${screenshotUploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. Descriptions, Features, Changelog */}
          <div className="space-y-3">
            <div>
              <label className="text-zinc-300 font-bold block mb-1">Short Description</label>
              <input
                type="text"
                placeholder="Brief summary for app card listing..."
                value={formData.shortDescription || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-bold block mb-1">Full Description</label>
              <textarea
                rows={3}
                placeholder="Detailed MOD description, features list, installation guide..."
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">MOD Features (One per line)</label>
                <textarea
                  rows={3}
                  placeholder="Premium Unlocked&#10;No Ads&#10;Unlimited Coins"
                  value={featuresInput}
                  onChange={(e) => setFeaturesInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Changelog / Whats New</label>
                <textarea
                  rows={3}
                  placeholder="v1.0.0 release changes..."
                  value={formData.changelog || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, changelog: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* 7. Free/Paid & Featured Toggles */}
          <div className="flex flex-wrap gap-4 p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!formData.isFree}
                onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked, isPremium: !e.target.checked }))}
                className="w-4 h-4 accent-amber-500 rounded"
              />
              <span className="text-zinc-200 font-bold">Free Download App</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!formData.isFeatured}
                onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                className="w-4 h-4 accent-amber-500 rounded"
              />
              <span className="text-zinc-200 font-bold">Featured VIP Badge</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
              <input
                type="checkbox"
                checked={!!formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
              <span className="text-emerald-400 font-bold">Active / Visible in Store</span>
            </label>
          </div>

          {/* Bottom Form Actions */}
          <div className="flex gap-3 pt-3 border-t border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-2xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || iconUploadProgress !== null || apkUploadProgress !== null || screenshotUploadProgress !== null}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black py-3 rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Saving to Firebase...' : (isEditing ? 'Update APK' : 'Publish APK')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
