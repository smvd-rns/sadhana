import React, { useState, useMemo, useEffect } from "react";

import { useNavigate } from "react-router-dom"; // Add this
import worldCitiesFull from "./world_cities_full";
import { db, auth } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import "./App.css";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { uploadFilesToDrive } from "./driveUpload";
import { BACKEND_URL } from "./config";
import { wakeServer } from "./wakeServer";
import SearchableSelect from "./SearchableSelect";

const Upload = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [city, setCity] = useState("");
  const [files, setFiles] = useState([]);
  const [fileOptions, setFileOptions] = useState({});

  // 🔽 NEW: YouTube state (ADDED ONLY)
  const [youtubeLinks, setYoutubeLinks] = useState([]);
  const [youtubeInput, setYoutubeInput] = useState("");

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("idle"); // Add this
  const navigate = useNavigate(); // Add this
  const [isDragging, setIsDragging] = useState(false);







useEffect(() => {
  // Wake up Render server immediately when page loads
  // This ensures server is ready by the time user needs it
  wakeServer();

  const unsub = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      navigate("/login");
      return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      navigate("/");
      return;
    }

    const roleId = snap.data().role_id;

    // ❌ Viewer & Public cannot access upload
    if (roleId === 3 || roleId === 4) {
      navigate("/"); // redirect to home
    }
  });

  return () => unsub();
}, [navigate]);











  /* ================= COUNTRY / CITY ================= */

  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  const getCountryName = (code) => {
    try {
      return regionNames.of(code);
    } catch {
      return code;
    }
  };

  const uniqueCountryCodes = useMemo(() => {
    return [...new Set(worldCitiesFull.map((i) => i.country))].sort();
  }, []);

  const availableCities = useMemo(() => {
    if (!countryCode) return [];
    return worldCitiesFull
      .filter((i) => i.country === countryCode)
      .map((i) => i.city)
      .sort();
  }, [countryCode]);

  /* ================= FILE HANDLING ================= */

  const addFilesToList = (selectedFiles) => {
    const fileArray = Array.isArray(selectedFiles) 
      ? selectedFiles 
      : Array.from(selectedFiles);
    
    setFiles((prev) => {
      const existing = prev.map((f) => f.name);
      const newFiles = fileArray.filter(
        (f) => !existing.includes(f.name)
      );
      return [...prev, ...newFiles];
    });
  };

  const handleFileChange = (e) => {
    addFilesToList(e.target.files);
    e.target.value = "";
  };

  /* ================= DRAG AND DROP HANDLING ================= */

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFilesToList(droppedFiles);
    }
  };

  const removeFile = (index) => {
    const removed = files[index];
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileOptions((prev) => {
      const updated = { ...prev };
      delete updated[removed.name];
      return updated;
    });
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (["csv", "xls", "xlsx"].includes(ext)) return "📊";
    if (["pdf", "doc", "docx", "txt"].includes(ext)) return "📄";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
    if (["mp3", "wav", "ogg"].includes(ext)) return "🎧";
    if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "🎬";
    return "📁";
  };

  /* ================= YOUTUBE HELPERS (NEW) ================= */

  const extractYouTubeId = (url) => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace("www.", "");

      if (host === "youtu.be") return u.pathname.split("/")[1];
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      if (u.pathname.startsWith("/shorts/"))
        return u.pathname.split("/")[2];
      if (u.pathname.startsWith("/live/"))
        return u.pathname.split("/")[2];

      return null;
    } catch {
      return null;
    }
  };

	const addYouTubeLink = async () => {
	  if (!youtubeInput.trim()) return;

	  const videoId = extractYouTubeId(youtubeInput);
	  if (!videoId) {
		alert("Please enter a valid YouTube URL");
		return;
	  }

	  try {
		const res = await fetch(
		  `${BACKEND_URL}/youtube-meta/${videoId}`
		);
		const data = await res.json();

		setYoutubeLinks((prev) => [
		  ...prev,
		  {
			url: youtubeInput.trim(),
			videoId,
			title: data.title || "YouTube Video",
			thumbnail: data.thumbnail || null,
			isGDO: false,
		  },
		]);
	  } catch (err) {
		// ultra-safe fallback
		setYoutubeLinks((prev) => [
		  ...prev,
		  {
			url: youtubeInput.trim(),
			videoId,
			title: "YouTube Video",
			thumbnail: null,
			isGDO: false,
		  },
		]);
	  }

	  setYoutubeInput("");
	};


const removeYouTubeLink = (index) => {
    const linkToRemove = youtubeLinks[index];
    setYoutubeLinks((prev) => prev.filter((_, i) => i !== index));
    
    // ✅ Remove the checkbox settings for this video
    setFileOptions((prev) => {
      const updated = { ...prev };
      if (linkToRemove && linkToRemove.title) {
         delete updated[linkToRemove.title];
      }
      return updated;
    });
  };






  /* ================= SUBMIT ================= */

const uploadSinglePost = async () => {
    // 1. Validation Check
    if (files.length === 0 && youtubeLinks.length === 0) {
      alert("Please select files or add YouTube links first.");
      return;
    }

    // 2. Start the Popup
    setIsUploading(true);
    setUploadStatus("loading"); 

    try {
      let uploadedFileData = [];
      let postFolderId = null;

      // 3. Upload files directly to Google Drive (if any)
      if (files.length > 0) {
        setUploadProgress(0);
        
        const uploadResult = await uploadFilesToDrive(
          files,
          {
            country: getCountryName(countryCode),
            city: city,
            date: date,
            title: title,
            speaker: speaker || "NoSpeaker",
          },
          (progress) => {
            setUploadProgress(Math.round(progress));
          }
        );

        postFolderId = uploadResult.folderId;

        // 4. Get file metadata from backend
        const metadataResponse = await fetch(`${BACKEND_URL}/process-uploaded-files`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileIds: uploadResult.fileIds,
            folderId: postFolderId,
          }),
        });

        if (!metadataResponse.ok) {
          throw new Error("Failed to get file metadata");
        }

        const metadataData = await metadataResponse.json();
        uploadedFileData = metadataData.uploaded || [];
      } else {
        // No files, but we still need to create the folder structure
        const folderResponse = await fetch(`${BACKEND_URL}/get-upload-urls`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: [],
            country: getCountryName(countryCode),
            city: city,
            date: date,
            title: title,
            speaker: speaker || "NoSpeaker",
          }),
        });

        if (folderResponse.ok) {
          const folderData = await folderResponse.json();
          postFolderId = folderData.folderId;
        }
      }

      // 5. Tag the Files (The Logic for Approval Section)
      const finalFiles = uploadedFileData.map((file) => {
        const localFile = files.find(f => f.name === file.name);

        return {
          ...file,
          size: localFile ? localFile.size : file.size || 0,
          isGDO: fileOptions[file.name]?.isGDO || false,
          isPublic: fileOptions[file.name]?.isPublic || false,
          gdoStatus: fileOptions[file.name]?.isGDO ? "pending" : "none",
        };
      });

      const finalYouTube = youtubeLinks.map((yt) => ({
        ...yt,
        isGDO: fileOptions[yt.title]?.isGDO || false,
        isPublic: fileOptions[yt.title]?.isPublic || false,
        gdoStatus: fileOptions[yt.title]?.isGDO ? "pending" : "none",
      }));

      // 6. Save to Database
      const folderName = `${date} ${speaker} ${title} ${city}`.trim();

      const postRef = await addDoc(collection(db, "posts"), {
        title,
        description,
        dateRecorded: date,
        speaker,
        country: countryCode,
        city,
        files: finalFiles, 
        youtubeLinks: finalYouTube, 
        status: "pending", 
        driveFolder: {
          country: getCountryName(countryCode),
          city,
          folderName,
          folderId: postFolderId,
        },
        uploadedBy: auth.currentUser.uid, 
        createdAt: new Date().toISOString(),
      });

      // 7. Backup to Google Sheets (async, don't wait for it)
      const postData = {
        id: postRef.id,
        title,
        description,
        dateRecorded: date,
        speaker,
        country: countryCode,
        city,
        files: finalFiles,
        youtubeLinks: finalYouTube,
        status: "pending",
        driveFolder: {
          country: getCountryName(countryCode),
          city,
          folderName,
          folderId: postFolderId,
        },
        uploadedBy: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
      };
      
      // Get user name for backup
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userName = userDoc.exists() ? userDoc.data().name || "" : "";

      fetch(`${BACKEND_URL}/backup-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postData: postData,
          uploadedByName: userName,
        }),
      }).catch(err => {
        console.error("Failed to backup to Sheets (non-critical):", err);
      });

      // 8. Show Success Message
      setUploadStatus("success");
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/"); 
      }, 2000);

    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      alert(`Upload failed: ${error.message}`);
      // Note: We leave isUploading(true) here so the user can see the error popup
    }
  };  
  
  
  

  /* ================= UI ================= */

  return (
    <div className="upload-container">
      <div className="upload-box">
        <h2>Submit Report</h2>

        {/* Basic Information Card */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-icon">📋</span>
            <h3 className="section-title">Basic Information</h3>
          </div>
          <div className="section-card-content">
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Event Details Card */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-icon">📅</span>
            <h3 className="section-title">Event Details</h3>
          </div>
          <div className="section-card-content">
            <div className="form-grid-row">
              <div className="form-group">
                <label>Preacher Name</label>
                <input
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Event Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="form-grid-row">
              <div className="form-group">
                <label>Country</label>
                <div className="select-input-box">
                  <SearchableSelect
                    value={countryCode}
                    onChange={(val) => {
                      setCountryCode(val);
                      setCity(""); // Reset city when country changes
                    }}
                    options={uniqueCountryCodes}
                    placeholder="Type to search country..."
                    getDisplayName={(code) => getCountryName(code)}
                    getValue={(code) => code}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>City</label>
                <div className="select-input-box">
                  <SearchableSelect
                    value={city}
                    onChange={(val) => setCity(val)}
                    options={availableCities}
                    placeholder="Type to search city..."
                    disabled={!countryCode}
                    getDisplayName={(cityName) => cityName}
                    getValue={(cityName) => cityName}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Media & Attachments Card */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-icon">📎</span>
            <h3 className="section-title">Media & Attachments</h3>
          </div>
          <div className="section-card-content">
            <div className="form-group">
              <label>Attachments (Files)</label>
          
          {/* Combined: Choose Material or Drag & Drop */}
          <div
            className={`file-drag-drop-area ${isDragging ? "dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input").click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div className="drag-drop-content">
              <div className="drag-drop-icon">📁</div>
              <div className="drag-drop-text">
                <strong>Choose Material or Drag & Drop</strong>
                <span>Click to browse files or drag files here</span>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, marginTop: 15 }}>
              {files.map((file, index) => (
                <li key={index} className="file-card">
                  <div className="file-card-header">
                    <div className="file-name">
                      <span className="file-icon">
                        {getFileIcon(file.name)}
                      </span>
                      <div className="file-text">
                        <div className="file-title">{file.name}</div>
                        <div className="file-meta">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="file-remove-btn"
                      onClick={() => removeFile(index)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="file-options">
					  {/* ✅ PUBLIC */}
					  <label className="checkbox-label">
						<input
						  type="checkbox"
						  checked={fileOptions[file.name]?.isPublic || false}
						  onChange={(e) =>
							setFileOptions((prev) => ({
							  ...prev,
							  [file.name]: {
								...prev[file.name],
								isPublic: e.target.checked,
							  },
							}))
						  }
						/>
						Public
					  </label>

					  {/* ✅ GDO REPORT */}
					  <label className="checkbox-label">
						<input
						  type="checkbox"
						  checked={fileOptions[file.name]?.isGDO || false}
						  onChange={(e) =>
							setFileOptions((prev) => ({
							  ...prev,
							  [file.name]: {
								...prev[file.name],
								isGDO: e.target.checked,
							  },
							}))
						  }
						/>
						GDO Report
					  </label>
					</div>

                </li>
              ))}
            </ul>
          )}
            </div>

            {/* 🔽 YOUTUBE UI */}
            <div className="form-group">
              <label>YouTube Links (Optional)</label>

          <div className="youtube-input-row" style={{ marginBottom: "20px" }} >
		  
            <input
              className="youtube-input"
              placeholder="Paste YouTube link (watch, live, shorts)"
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
            />
            <button
              type="button"
              className="youtube-add-btn"
              onClick={addYouTubeLink}
            >
              ➕ Add Video
            </button>
          </div>

          {youtubeLinks.map((yt, index) => (
            <div key={index} className="file-card">
              <div className="file-card-header">
                <div className="file-name">
                  <img
                    src={yt.thumbnail || "https://via.placeholder.com/40"}
                    alt={yt.title}
                    className="youtube-thumb"
                    style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px", marginRight: "10px" }}
                  />
                  <div className="file-text">
                    <div className="file-title">{yt.title}</div>
                    <div className="file-meta">YouTube Video</div>
                  </div>
                </div>

                <button
                  type="button"
                  className="file-remove-btn"
                  onClick={() => removeYouTubeLink(index)}
                >
                  ✕
                </button>
              </div>

              {/* ✅ FIXED CHECKBOXES: Now saves to fileOptions */}
              <div className="file-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={fileOptions[yt.title]?.isPublic || false}
                    onChange={(e) =>
                      setFileOptions((prev) => ({
                        ...prev,
                        [yt.title]: {
                          ...prev[yt.title],
                          isPublic: e.target.checked,
                        },
                      }))
                    }
                  />
                  Public
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={fileOptions[yt.title]?.isGDO || false}
                    onChange={(e) =>
                      setFileOptions((prev) => ({
                        ...prev,
                        [yt.title]: {
                          ...prev[yt.title],
                          isGDO: e.target.checked,
                        },
                      }))
                    }
                  />
                  GDO Report
                </label>
              </div>
            </div>
          ))}
            </div>
          </div>
        </div>

        {/* Submit Button with Floating Effect */}
        <div className="submit-section">
          <button
            className="primary-btn upload-submit-btn"
            onClick={uploadSinglePost}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <span className="btn-spinner"></span>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Submit Post</span>
              </>
            )}
          </button>
        </div>
      </div>
	  
	  
	 

			  {/* ✅ NEW POPUP OVERLAY */}
			  {isUploading && (
				<div className="saving-overlay">
				  <div className="saving-content">
					{uploadStatus === "loading" && (
					  <>
						<div className="spinner"></div>
						<h2>Hare Krishna 🙏</h2>
						<p>Please wait a moment while we upload your post.</p>
						<p><strong>Kindly do not press the Back or Refresh button ⏳✨</strong></p>
						{uploadProgress > 0 && (
						  <div style={{ marginTop: "20px" }}>
							<progress value={uploadProgress} max="100" style={{ width: "100%", height: "20px" }} />
							<p>{uploadProgress}% uploaded</p>
						  </div>
						)}
					  </>
					)}

					{uploadStatus === "success" && (
					  <div className="status-success">
						<div className="check-icon">✓</div>
						<h2>🚀 Post Successful Uploaded! 🎉</h2>
						<p>Your content is now live. Redirecting to the Home page … 🏠⏳</p>
					  </div>
					)}

					{uploadStatus === "error" && (
					  <div className="status-error">
						<div className="error-icon">✕</div>
						<h2>Upload Failed</h2>
						<p>Something went wrong. Please try again.</p>
					  </div>
					)}
				  </div>
				</div>
			  )}
	  
	  
	  
	  
	  
	  
    </div>
  );
};

export default Upload;
