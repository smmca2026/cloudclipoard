// ==========================================
// Cloud Clipboard & Multi-Device Sync Logic
// ==========================================

// Register Service Worker for PWA / Lite App
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('PWA Service Worker registered:', reg.scope))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

// PWA Install Prompt Handler
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) {
        installBtn.style.display = 'inline-flex';
    }
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showToast("🎉 Cloud Clipboard installed on your home screen!", "success");
            }
            deferredPrompt = null;
        });
    } else {
        showToast("💡 Mobile-ல் Chrome Menu (3 புள்ளிகள் ⋮) ➔ 'Add to Home screen' கிளிக் செய்து App-ஆக Install செய்யலாம்!", "info");
    }
}

// Helper: Show Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3500);
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 1. Save Text to Cloud & Clipboard History
function saveClipboard() {
    const textarea = document.getElementById("clipboard");
    const text = textarea ? textarea.value : "";

    if (!text.trim()) {
        showToast("Please enter some text or details to save!", "error");
        return;
    }

    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) saveBtn.disabled = true;

    fetch("clipboard", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ text: text })
    })
    .then(response => {
        if (!response.ok) throw new Error("Failed to save to clipboard");
        return response.json().catch(() => ({ message: "Saved Successfully" }));
    })
    .then(data => {
        showToast("✅ Details saved to Cloud Clipboard!", "success");
        // Update Received box
        const output = document.getElementById("output");
        if (output) output.value = text;
        // Refresh history list
        loadClipboardHistory();
    })
    .catch(err => {
        showToast("❌ Error saving: " + err.message, "error");
    })
    .finally(() => {
        if (saveBtn) saveBtn.disabled = false;
    });
}

// 2. Get Latest Text from Cloud
function getClipboard() {
    const getBtn = document.getElementById("getBtn");
    if (getBtn) getBtn.disabled = true;

    fetch("clipboard")
    .then(response => response.text())
    .then(data => {
        const output = document.getElementById("output");
        if (output) {
            output.value = data;
        }
        if (data && data.trim()) {
            showToast("📥 Retrieved latest clipboard from cloud!", "success");
        } else {
            showToast("Cloud clipboard is empty.", "info");
        }
        loadClipboardHistory();
    })
    .catch(err => {
        showToast("❌ Failed to fetch clipboard: " + err.message, "error");
    })
    .finally(() => {
        if (getBtn) getBtn.disabled = false;
    });
}

// 3. Load Stored Clipboard History
function loadClipboardHistory() {
    const list = document.getElementById("clipboardHistoryList");
    const badge = document.getElementById("clipboardCountBadge");

    fetch("clipboard-history")
    .then(res => {
        if (!res.ok) throw new Error("Could not load clipboard history");
        return res.json();
    })
    .then(items => {
        if (badge) {
            badge.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
        }

        if (!list) return;

        if (!items || items.length === 0) {
            list.innerHTML = `
                <div class="no-files">
                    <p>No saved clipboard details yet.</p>
                    <small>Save notes or text above to store them in your cloud history.</small>
                </div>
            `;
            return;
        }

        list.innerHTML = items.map(item => {
            const timeStr = item.created_at ? new Date(item.created_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Recent';
            
            const rawContent = item.content || '';
            const safeContent = escapeHtml(rawContent);

            return `
                <div class="clipboard-item" id="clip-item-${item.id}">
                    <div class="clipboard-item-content">${safeContent}</div>
                    <div class="clipboard-item-footer">
                        <span class="clipboard-item-time">🕒 ${timeStr}</span>
                        <div class="clipboard-item-actions">
                            <button class="btn-clip-copy" onclick="copySnippet(${item.id})" title="Copy this text">
                                📋 Copy
                            </button>
                            <button class="btn-clip-del" onclick="deleteClipboardItem(${item.id})" title="Delete from clipboard">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    })
    .catch(err => {
        if (list) {
            list.innerHTML = `<div class="no-files">Could not load clipboard history (${err.message}).</div>`;
        }
    });
}

// Global cached copy snippet helper
function copySnippet(id) {
    const itemElem = document.getElementById(`clip-item-${id}`);
    if (!itemElem) return;
    const contentElem = itemElem.querySelector('.clipboard-item-content');
    if (!contentElem) return;

    const textToCopy = contentElem.textContent || '';

    navigator.clipboard.writeText(textToCopy)
    .then(() => {
        showToast("📋 Copied stored detail to device clipboard!", "success");
    })
    .catch(() => {
        const temp = document.createElement('textarea');
        temp.value = textToCopy;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast("📋 Copied to clipboard!", "success");
    });
}

// Delete single Clipboard Item by ID
function deleteClipboardItem(id) {
    if (!confirm("Are you sure you want to delete this saved clipboard detail?")) {
        return;
    }

    fetch("delete-clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast("🗑️ Clipboard detail deleted.", "success");
            loadClipboardHistory();
        } else {
            showToast("Error: " + data.message, "error");
        }
    })
    .catch(err => {
        showToast("Delete failed: " + err.message, "error");
    });
}

// Clear all Clipboard History
function clearAllClipboard() {
    if (!confirm("Are you sure you want to delete ALL saved clipboard history?")) {
        return;
    }

    fetch("clear-clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast("🗑️ All clipboard details cleared.", "success");
            const output = document.getElementById("output");
            if (output) output.value = "";
            loadClipboardHistory();
        } else {
            showToast("Error: " + data.message, "error");
        }
    })
    .catch(err => {
        showToast("Clear failed: " + err.message, "error");
    });
}


// 3. Copy Output text to local device clipboard
function copyOutput() {
    const output = document.getElementById("output");
    if (!output || !output.value.trim()) {
        showToast("Nothing to copy!", "error");
        return;
    }

    navigator.clipboard.writeText(output.value)
    .then(() => {
        showToast("📋 Copied to local clipboard!", "success");
    })
    .catch(() => {
        output.select();
        document.execCommand('copy');
        showToast("📋 Copied to clipboard!", "success");
    });
}

// 4. Determine file icon based on file extension
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📕';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return '🎵';
    if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return '🎬';
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return '📄';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['apk'].includes(ext)) return '📱';
    return '📁';
}

// 5. Load All Cloud Files
function loadFiles() {
    const filesList = document.getElementById("filesList");
    const fileCountBadge = document.getElementById("fileCountBadge");
    const totalFilesInfo = document.getElementById("totalFilesInfo");

    fetch("files")
    .then(response => {
        if (!response.ok) throw new Error("Could not load file list");
        return response.json();
    })
    .then(files => {
        if (fileCountBadge) fileCountBadge.textContent = files.length;
        if (totalFilesInfo) totalFilesInfo.textContent = `${files.length} file${files.length === 1 ? '' : 's'}`;

        if (!filesList) return;

        if (files.length === 0) {
            filesList.innerHTML = `
                <div class="no-files">
                    <p>No files uploaded yet.</p>
                    <small>Upload files above to share across devices.</small>
                </div>
            `;
            return;
        }

        filesList.innerHTML = files.map(file => {
            const icon = getFileIcon(file.name);
            const downloadUrl = `download?file=${encodeURIComponent(file.name)}`;
            const dateStr = file.updatedAt ? new Date(file.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return `
                <div class="file-item">
                    <div class="file-info">
                        <span class="file-type-icon">${icon}</span>
                        <div class="file-details">
                            <span class="file-name" title="${file.name}">${file.name}</span>
                            <span class="file-meta">${file.formattedSize || 'Unknown size'} ${dateStr ? '• ' + dateStr : ''}</span>
                        </div>
                    </div>
                    <div class="file-actions">
                        <a href="${downloadUrl}" download="${file.name}" class="btn-file-dl" title="Download on this device">
                            ⬇️ Download
                        </a>
                        <button onclick="deleteFile('${encodeURIComponent(file.name)}')" class="btn-file-del" title="Delete file from cloud">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    })
    .catch(err => {
        console.error("Error loading files:", err);
        if (filesList) {
            filesList.innerHTML = `<div class="no-files">Failed to load files (${err.message}).</div>`;
        }
    });
}

// 6. Delete File from Cloud
function deleteFile(encodedFileName) {
    const fileName = decodeURIComponent(encodedFileName);
    if (!confirm(`Are you sure you want to delete "${fileName}" from the cloud?`)) {
        return;
    }

    fetch("delete-file", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ file: fileName })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast("🗑️ File deleted from cloud.", "success");
            loadFiles();
        } else {
            showToast("Error: " + data.message, "error");
        }
    })
    .catch(err => {
        showToast("Delete failed: " + err.message, "error");
    });
}

// 7. Update Dropzone UI on file selection
function updateSelectedFilesText(input) {
    const textElem = document.getElementById("dropzoneText");
    if (!textElem) return;
    if (input.files && input.files.length > 0) {
        if (input.files.length === 1) {
            textElem.textContent = `Selected: ${input.files[0].name}`;
        } else {
            textElem.textContent = `Selected ${input.files.length} files`;
        }
    } else {
        textElem.textContent = "Choose files or Drag & Drop here";
    }
}

// 8. Upload Multiple Files Handler
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
    uploadForm.addEventListener("submit", function(e) {
        e.preventDefault();

        const fileInput = document.getElementById("file");
        const submitBtn = document.getElementById("uploadSubmitBtn");
        const statusElem = document.getElementById("uploadStatus");

        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            showToast("Please choose at least 1 file to upload!", "error");
            return;
        }

        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append("files", fileInput.files[i]);
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = "<span>⏳ Uploading...</span>";
        }
        if (statusElem) {
            statusElem.className = "status-msg";
            statusElem.textContent = "";
        }

        fetch("upload", {
            method: "POST",
            body: formData
        })
        .then(response => {
            if (!response.ok) throw new Error("Upload failed");
            return response.json();
        })
        .then(data => {
            showToast(`✅ ${data.message || 'Files uploaded successfully!'}`, "success");
            fileInput.value = "";
            updateSelectedFilesText(fileInput);
            loadFiles();
        })
        .catch(err => {
            showToast("❌ Upload Error: " + err.message, "error");
        })
        .finally(() => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "<span>Upload to Cloud</span>";
            }
        });
    });
}

// 9. Sync All: Retrieve clipboard, history, and file list
function syncAll() {
    getClipboard();
    loadClipboardHistory();
    loadFiles();
    showToast("🔄 Sync completed with Cloud!", "info");
}

// 10. Toggle / Scroll to Menu & Files
function toggleMenu() {
    const filesCard = document.getElementById("filesCard");
    if (filesCard) {
        filesCard.scrollIntoView({ behavior: "smooth" });
        filesCard.style.outline = "2px solid #3a86ff";
        setTimeout(() => {
            filesCard.style.outline = "none";
        }, 1500);
    }
}

// Password toggle helper for auth screens
function togglePassword() {
    const password = document.getElementById("password");
    if (password) {
        password.type = password.type === "password" ? "text" : "password";
    }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    getClipboard();
    loadClipboardHistory();
    loadFiles();
});