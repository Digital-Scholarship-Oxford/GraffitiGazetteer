if (location.pathname.includes('admin.html')) {
    if (localStorage.getItem('admin') == null) {
        window.location.href = 'index.html';
    }
    else {
        var user = localStorage.getItem('admin');
    }


    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function () {
        localStorage.removeItem('admin');
        window.location.href = 'index.html';
    });

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileChooseBtn = document.getElementById('file-choose-btn');
    const fileList = document.getElementById('file-list');
    const uploadBtn = document.getElementById('upload-btn');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    // Handle file input change
    fileInput.addEventListener('change', handleFiles, false);

    // Click to choose files
    fileChooseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Upload button click
    uploadBtn.addEventListener('click', uploadFileToGitHub);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropZone.classList.add('highlight');
    }

    function unhighlight() {
        dropZone.classList.remove('highlight');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(e) {
        const files = e.type === 'change' ? e.target.files : e;
        fileList.innerHTML = ''; // Clear previous files

        if (files.length > 0) {
            uploadBtn.disabled = false;
        }

        Array.from(files).forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.classList.add('text-start', 'mb-2');
            fileItem.innerHTML = `
            <span class="text-truncate">${file.name}</span>
            <small class="text-muted ml-2">(${formatFileSize(file.size)})</small>
        `;
            fileList.appendChild(fileItem);
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Function to upload or update a file to GitHub using the personal access token (PAT)
    async function uploadFileToGitHub() {
        //const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (fileInput.files.length === 0) {
            alert('Please select files to upload');
            return;
        }

        if (!file) {
            alert('Please select a CSV file.');
            return;
        }

        const reader = new FileReader();

        reader.onload = async function (event) {
            const fileContent = event.target.result;
            const base64Content = utf8ToBase64(fileContent); // Convert to base64

            try {
                // First, check if the file already exists
                const existingFileResponse = await fetch(`${apiURL}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (existingFileResponse.ok) {
                    // If the file exists, get the sha of the existing file
                    const existingFileData = await existingFileResponse.json();
                    const sha = existingFileData.sha;  // Get the SHA of the existing file

                    // Now, update the file by providing the sha
                    await updateFile(sha, base64Content);
                } else {
                    // If the file does not exist, create a new one
                    await createFile(base64Content);
                }

            } catch (error) {
                console.error('Error checking file or uploading:', error);
                alert('Error uploading file');
            }
        };

        reader.readAsText(file);  // Read the CSV file as text
    }

    // Function to update the file using the sha
    async function updateFile(sha, base64Content) {
        const data = {
            message: 'Update CSV file',  // Commit message
            content: base64Content,  // Base64-encoded file content
            sha: sha,  // Provide the sha to update the file
            branch: 'main'  // Target branch (adjust if necessary)
        };

        try {
            const response = await fetch(`${apiURL}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert('File updated successfully!');
                location.reload();
            } else {
                alert('Failed to update file: ' + JSON.stringify(result));
            }
        } catch (error) {
            console.error('Error updating file:', error);
            alert('Error updating file');
        }
    }

    // Function to create the file (if it does not exist)
    async function createFile(base64Content) {
        const data = {
            message: 'Upload new CSV file',  // Commit message
            content: base64Content,  // Base64-encoded file content
            branch: 'main'  // Target branch (adjust if necessary)
        };

        try {
            const response = await fetch(`https://api.github.com/repos/${organization}/${repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert('File uploaded successfully!');
            } else {
                alert('Failed to upload file: ' + JSON.stringify(result));
            }
        } catch (error) {
            console.error('Error creating file:', error);
            alert('Error creating file');
        }
    }

    // Helper function to convert UTF-8 content to base64
    function utf8ToBase64(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        let binary = '';
        data.forEach((byte) => binary += String.fromCharCode(byte));
        return btoa(binary);
    }
}