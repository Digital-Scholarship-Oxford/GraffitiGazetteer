if (location.href.indexOf('detail.html') > -1) {
    // Store the CSV data parsed into an array of objects
    let inscriptionsData = [];
    let interval = setInterval(async () => {
        if (accessToken !== '') {
            clearInterval(interval);
            await loadData();
            if (inscriptionsData !== null && inscriptionsData !== undefined && inscriptionsData.length > 0) {
                displayDetails();
            }
            else {
                location.href = 'results.html';
            }
        }
    }, 500);


    async function displayDetails() {
        let id = window.location.search.split('=')[1];
        if (id === undefined || id === null || id === '') {
            location.href = 'index.html';
        }
        {
            const item = inscriptionsData.find(item => item['Unique identifier'] === id);

            if (!item) location.href = 'results.html';

            let mapDetail = `<div id="divMapDetail" style="height: 30vh;" class="mb-2"></div>`;

            let pleiadesId = item['Pleiades ID & URL'] ? `<a href="${item['Pleiades ID & URL']}" target="_blank" style="text-decoration: none;">${item['Pleiades ID & URL'].split('/').pop()} <i class="bi bi-box-arrow-up-right"></i></a>` : 'N/A';

            let otherDatasets = '';

            if (item['TM identifier'] !== undefined && item['TM identifier'] !== null && item['TM identifier'] !== "") {
                otherDatasets = await getOtherDatasetsByTMID(item['TM identifier']);
            }

            let tmIdenfifier = item['TM identifier'] ? `<a href="https://www.trismegistos.org/text/${item['TM identifier']}" target="_blank" style="text-decoration: none;">${item['TM identifier']} <i class="bi bi-box-arrow-up-right"></i></a>` : 'N/A';
            // Format the content for the modal
            let contentHtml = `${mapDetail}
         <h4>${item['Site conventional modern name']} - ${item['Type of inscription']}</h4>
         <p class="text-muted">${item['Date secondary feature'] || item['Date primary surface']}</p>
         
         <div class="row">
             <div class="col-md-8">
                <h5>Identifiers</h5>
                <table class="table table-bordered">
                    <tr>
                        <th>Unique ID</th><td>${item['Unique identifier'] || 'N/A'}</td>
                        <th>TM Identifier ${otherDatasets !==  '' ? '<br /><br /><strong>Other Dataset(s):</strong>' : ''}</th><td>${tmIdenfifier} ${otherDatasets}</td>
                    </tr>
                    <tr>
                        <th>Pleiades ID</th><td>${pleiadesId}</td>
                        <th>TLA Identifier</th><td>${item['TLA identifier'] ? `<a href="${item['TLA stable URL']}" target="_blank" style="text-decoration: none;">${item['TLA identifier']} <i class="bi bi-box-arrow-up-right"></i></a>` : 'N/A'}</td>
                    </tr>
                </table>
             </div>
         </div>    

         <div class="row mt-4">
             <div class="col-md-6">
                 <h5>Location Information</h5>
                 <table class="table table-bordered">
                     <tr><th>Land</th><td>${item.Land || 'N/A'}</td></tr>
                     <tr><th>Region</th><td>${item.Region || 'N/A'}</td></tr>
                     <tr><th>Area</th><td>${item.Area || 'N/A'}</td></tr>
                     <tr><th>Site</th><td>${item['Site conventional modern name'] || 'N/A'}</td></tr>
                     <tr><th>Ancient Name</th><td>${item['Site ancient name(s)'] || 'N/A'}</td></tr>
                     <tr><th>Building</th><td>${item.Building || 'N/A'}</td></tr>
                     <tr><th>Part of Building</th><td>${item['Part of building'] || 'N/A'}</td></tr>
                     <tr><th>Room/Space</th><td>${item['Room/space'] || 'N/A'}</td></tr>
                     <tr><th>Wall</th><td>${item.Wall || 'N/A'}</td></tr>
                     <tr><th>Location</th><td>${item['Location 1 - primary scene placement'] || 'N/A'}</td></tr>
                 </table>
             </div>
             
             <div class="col-md-6">
                 <h5>Inscription Details</h5>
                 <table class="table table-bordered">
                     <tr><th>Type</th><td>${item['Type of inscription'] || 'N/A'}</td></tr>
                     <tr><th>Script</th><td><a href="${item['Script typeURL']}" target="_blank" style="text-decoration: none;">${item['Script type'] || 'N/A'} <i class="bi bi-box-arrow-up-right"></i></a></td></tr>
                     <tr><th>Language</th><td><a href="${item.LanguagesURL}" target="_blank" style="text-decoration: none;">${item.Languages || 'N/A'} <i class="bi bi-box-arrow-up-right"></i></a></td></tr>
                     <tr><th>Material</th><td><a href="${item.MaterialURL}" target="_blank" style="text-decoration: none;">${item.Material || 'N/A'} <i class="bi bi-box-arrow-up-right"></i></a></td></tr>
                     <tr><th>Technique</th><td><a href="${item['Execution techniqueURL']}" target="_blank" style="text-decoration: none;">${item['Execution technique'] || 'N/A'} <i class="bi bi-box-arrow-up-right"></i></a></td></tr>
                     <tr><th>Color</th><td>${item.Colour || 'N/A'}</td></tr>
                     <tr><th>Preservation</th><td>${item['State of preservation'] || 'N/A'}</td></tr>
                     <tr><th>Height</th><td>${item['Height above ground (m)'] || 'N/A'}</td></tr>
                 </table>
             </div>
         </div>
         
         <div class="row mt-4">
             <div class="col-md-12">
                 <h5>Content</h5>
                 <table class="table table-bordered">
                     <tr><th>Contents</th><td>${item.Contents || 'N/A'}</td></tr>
                     <tr><th>Royal Name(s)</th><td>${item['Royal  name(s)'] || 'N/A'}</td></tr>
                     <tr><th>Writer/Signature</th><td>${item['Private name - writer/signature'] || 'N/A'}</td></tr>
                     <tr><th>Other Names</th><td>${item['Other private names'] || 'N/A'}</td></tr>
                     <tr><th>Divine Names</th><td>${item['Divine names'] || 'N/A'}</td></tr>
                     <tr><th>Titles</th><td>${item['Title(s)'] || 'N/A'}</td></tr>
                 </table>
             </div>
         </div>
         
         <div class="row mt-4">
             <div class="col-md-6">
                 <h5>Dating</h5>
                 <table class="table table-bordered">
                     <tr><th>Primary Date</th><td><a href="${item['Date primary surfaceURL']}" target="_blank" style="text-decoration: none;">${item['Date primary surface'] || 'N/A'} <i class="bi bi-box-arrow-up-right"></i></a></td></tr>
                     <tr><th>Secondary Date</th><td>${item['Date secondary featureURL'] !== undefined ? `<a href="${item['Date secondary featureURL']}" target="_blank" style="text-decoration: none;">${item['Date secondary feature']} <i class="bi bi-box-arrow-up-right"></i></a>` : 'N/A'}</td></tr>
                 </table>
             </div>
             
             <div class="col-md-6">
                 <h5>References</h5>
                 <p>${item['References published (with OEB codes)'] || 'No published references'}</p>
                 <p>${item['References unpublished'] || 'No unpublished references'}</p>
             </div>
         </div>
         
         <div class="row mt-4">
             <div class="col-md-12">
                 <h5>Additional Information</h5>
                 <p>${item['Research log'] || 'No additional information available.'}</p>
             </div>
         </div>
     `;

            // Set the modal title and content
            $('#detailModalLabel').text(`Inscription ${id}`);
            $('#detailContent').html(contentHtml);

            if (item['Reference archive/unpublished URL'] !== undefined && item['Reference archive/unpublished URL'] !== null && item['Reference archive/unpublished URL'] !== "") {
                if (item['Reference archive/unpublished URL'].includes('oxford.')) {
                    //$('#sdsImages').load(`https://www.doi.org/10.25446/oxford.29637701`)
                    let articleId = item['Reference archive/unpublished URL'].split('.').pop();
                    let sdsResp = await fetch('https://corsproxy.io/?' + encodeURIComponent(`https://api.figshare.com/v2/articles/${articleId}`));
                    let sdsArticle = await sdsResp.json();
                    console.log(sdsArticle);
                    loadSDSImages(sdsArticle);
                }
                else {
                    $('#sdsImages').html(item['Reference archive/unpublished URL']);
                }
            }
            else {
                $('#sdsImages').html(`No SDS image catalogue available for this inscription.`);
            }

            // Initialize the map inside the modal only when the modal is shown
            let m = L.map('divMapDetail').setView([item.Latitude, item.Longitude], 6); // Set to default center

            // Add a tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(m);

            L.marker([parseFloat(item.Latitude), parseFloat(item.Longitude)])
                .addTo(m)
            //.bindPopup('Hello');

            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('detailModal'));
            modal.show();

            let interval = setInterval(() => {
                clearInterval(interval)
                m.invalidateSize();
            }, 500);
        }
    }

    function findPrefLabelByIdOrKey(data, targetIdOrKey, lang = "en") {
        // Helper to recursively search nodes
        function search(node) {
            if (node.id === targetIdOrKey || node.key === targetIdOrKey) {
                if (Array.isArray(node.prefLabel)) {
                    const label = node.prefLabel.find(label => label["xml:lang"] === lang);
                    return label ? label["#text"] : null;
                }
            }

            // Recurse through children if they exist
            if (Array.isArray(node.children)) {
                for (const child of node.children) {
                    const result = search(child);
                    if (result) return result;
                }
            }

            return null;
        }

        // Start searching from root (handle array or object)
        if (Array.isArray(data)) {
            for (const item of data) {
                const result = search(item);
                if (result) return result;
            }
        } else {
            return search(data);
        }

        return null; // Not found
    }

    async function getOtherDatasetsByTMID(tmid) {
        const url = `https://www.trismegistos.org/dataservices/texrelations/uri/${tmid}`;
        let jsonData;
        try {
            const res = await fetch(url);
            jsonData = await res.json();
            if (jsonData.length > 0) {
                const datasets = [];
                const data = [];
                let html = '<br /> <br /><ul>';
                for (let i = 0; i < jsonData.length; i++) {
                    for (const [key, value] of Object.entries(jsonData[i])) {
                        if (key !== "TM_ID" && value !== null) {
                            datasets.push(key);
                            data.push({ dataset: key, id: value });// Store dataset and id
                            html += `<li>${key}: <ul>`;
                            for (let v of value) {
                                html += `<li> <a href="${v}" target="_blank" style="text-decoration: none;">${v.split('/').pop()} <i class="bi bi-box-arrow-up-right"></i></a></li>`;
                            }
                            html += '</ul></li>';
                        }
                    }
                }
                html += '</ul>';
                return html;
                //visualizeNetwork(data, tmid);
            }
        } catch (e) {
            console.error(e);
            return;
        }
    }

    async function getFileSHA(ref = 'main') {
        const url = `${apiURL}?ref=${ref}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.sha; // This is the file's SHA
    }

    // Load and process the CSV data
    async function loadData() {
        // For demo purposes, we'll use the provided CSV data directly
        //debugger;
        let latestSHA = await getFileSHA();

        let resp = await fetch(`https://raw.githubusercontent.com/${organization}/${repo}/main/${path}`);
        let csvData = await resp.text();
        inscriptionsData = parseCSV(csvData);

        if (localStorage.getItem('fileSHA') === null || localStorage.getItem('fileSHA') === undefined) {
            localStorage.setItem('fileSHA', latestSHA);
        }
        else {
            if (localStorage.getItem('fileSHA') !== latestSHA) {
                localStorage.setItem('fileSHA', latestSHA);
                localStorage.removeItem('storeItems');
            }
        }

        if (localStorage.getItem('storeItems') === null || localStorage.getItem('storeItems') === undefined) {
            let storeItems = {};
            let isServiceUnavailable = false;
            debugger;
            let resp = await fetch('data/collections.json');
            let data = await resp.json();

            for (const item of inscriptionsData) {
                let id = item['Unique identifier'];

                if (id !== undefined && id !== null && id !== "") {
                    storeItems[id] = {};
                    // Loop through each column (key-value) in the record (item)
                    for (const [key, value] of Object.entries(item)) {
                        // Check if the column contains 'thot' in its value
                        if (typeof value === 'string' && value.toLowerCase().includes('thot-')) {
                            // If it does, log the column name and value
                            //console.log(`Column '${key}' in record contains 'thot':`, value);
                            let thotId = value.substring(value.lastIndexOf("/") + 1);
                            let label = findPrefLabelByIdOrKey(data, thotId);
                            storeItems[id][key] = label;
                            item[`${key}URL`] = value;
                            item[key] = label;
                        }
                    }
                }
            }

            //debugger;
            // Store items in local storage
            localStorage.setItem('storeItems', JSON.stringify(storeItems));
        }
        else {
            for (const item of inscriptionsData) {
                let id = item['Unique identifier'];
                if (id === undefined && id === null && id === "") {
                    console.log(id)
                }
                // Loop through each column (key-value) in the record (item)
                for (const [key, value] of Object.entries(item)) {
                    // Check if the column contains 'thot' in its value
                    if (typeof value === 'string' && value.toLowerCase().includes('thot-')) {
                        // If it does, log the column name and value
                        //console.log(`Column '${key}' in record contains 'thot':`, value);
                        let storeItems = JSON.parse(localStorage.getItem('storeItems'));
                        if (storeItems[id] === undefined && storeItems[id] === null && storeItems[id] === "") {
                            console.log(id)
                        }
                        item[`${key}URL`] = value;
                        item[key] = storeItems[id][key];
                    }
                }
            }
        }

        return inscriptionsData;
    }

    async function loadSDSImages(sdsArticle) {
        const title = sdsArticle.title;
        const description = `<strong>Description:</strong><br>${sdsArticle.description}`;
        const author = sdsArticle.authors?.[0]?.full_name || 'N/A';
        const funding = sdsArticle.funding || 'Not available';
        let tags = '';
        sdsArticle.tags.forEach(tag => {
            const span = `<span class="badge bg-secondary me-1">${tag}</span>`;
            tags += span;
        });
        const publishedDate = new Date(sdsArticle.published_date).toLocaleDateString();
        const licenseLink = `<a href="${sdsArticle.license.url}" target="_blank">${sdsArticle.license.name} <i class="bi bi-box-arrow-up-right"></i></a>`;
        const sdsLink = sdsArticle.figshare_url;

        let html = `<div id="carouselExampleIndicators" class="carousel slide">
                        <div class="carousel-indicators" id="carouselIndicators">
                            
                        </div>
                        <div id="carouselInner" class="carousel-inner" style="height: 40vh !important;">
                            <div class="text-center" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">   
                                <div class="spinner-border spinner-border-sm text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                </div> Loading images...
                            </div>
                        </div>
                        <button class="carousel-control-prev" type="button"
                            data-bs-target="#carouselExampleIndicators" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        <button class="carousel-control-next" type="button"
                            data-bs-target="#carouselExampleIndicators" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Next</span>
                        </button>
                    </div>
                    <div id="sdsMeta" class="mt-3">
                        <h5 id="meta-title" class="card-title">${title}</h5>
                        <p id="meta-description" class="card-text">${description}</p>
                        <p><strong>Author:</strong> <span id="meta-author">${author}</span></p>
                        <p><strong>Funding:</strong> <span id="meta-funding">${funding}</span></p>
                        <p>
                        <strong>Tags:</strong> <span id="meta-tags">${tags}</span>
                        </p>
                        <p>
                        <strong>Published Date:</strong> <span id="meta-published">${publishedDate}</span><br>
                        <strong>License:</strong> ${licenseLink}
                        </p>
                        <a href="${sdsLink}" class="btn btn-outline-primary" target="_blank" id="meta-link">View on SDS Portal <i class="bi bi-box-arrow-up-right"></i></a>
                    </div>`;

        $('#sdsImages').html(html);
        await setupCarousel(sdsArticle);
    }

    async function renderTIFFtoCanvas(url, canvas) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
            const image = await tiff.getImage();
            const width = image.getWidth();
            const height = image.getHeight();

            // Read raster data (same as before)
            const raster = await image.readRasters({ interleave: true });

            // Create offscreen canvas with full image size
            const offCanvas = document.createElement('canvas');
            offCanvas.width = width;
            offCanvas.height = height;
            const offCtx = offCanvas.getContext('2d');

            // Prepare imageData for offscreen canvas
            let imageData;
            if (raster.length === width * height * 3) {
                // RGB
                imageData = offCtx.createImageData(width, height);
                for (let i = 0, j = 0; i < raster.length; i += 3, j += 4) {
                    imageData.data[j] = raster[i];
                    imageData.data[j + 1] = raster[i + 1];
                    imageData.data[j + 2] = raster[i + 2];
                    imageData.data[j + 3] = 255;
                }
            } else if (raster.length === width * height) {
                // Grayscale
                imageData = offCtx.createImageData(width, height);
                for (let i = 0, j = 0; i < raster.length; i++, j += 4) {
                    const val = raster[i];
                    imageData.data[j] = val;
                    imageData.data[j + 1] = val;
                    imageData.data[j + 2] = val;
                    imageData.data[j + 3] = 255;
                }
            } else {
                throw new Error('Unsupported raster format');
            }

            offCtx.putImageData(imageData, 0, 0);

            // Now draw offscreen canvas to visible canvas, scaling down

            const maxWidth = 600;
            const maxHeight = 500;

            // Calculate aspect ratio fit
            let targetWidth = maxWidth;
            let targetHeight = (height / width) * targetWidth;

            if (targetHeight > maxHeight) {
                targetHeight = maxHeight;
                targetWidth = (width / height) * targetHeight;
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, targetWidth, targetHeight);

            ctx.drawImage(offCanvas, 0, 0, width, height, 0, 0, targetWidth, targetHeight);

        } catch (error) {
            console.error('Error loading TIFF:', error);
            canvas.parentElement.innerHTML = '<p class="text-danger">Failed to load image.</p>';
        }
    }

    async function setupCarousel(sdsArticle) {
        const carouselInner = document.getElementById('carouselInner');
        for (let i = 0; i < sdsArticle.files.length; i++) {
            const url = 'https://corsproxy.io/?' + encodeURIComponent(sdsArticle.files[i].download_url);

            // Create carousel item div
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('carousel-item');
            if (i === 0) itemDiv.classList.add('active'); // Activate first slide

            // Create canvas inside the item
            const canvas = document.createElement('canvas');
            itemDiv.appendChild(canvas);

            // Append to carousel inner container
            carouselInner.appendChild(itemDiv);

            // Create carousel indicator
            const indicator = document.createElement('button');
            indicator.type = 'button';
            indicator.setAttribute('data-bs-target', '#carouselExampleIndicators');
            indicator.setAttribute('data-bs-slide-to', i.toString());
            if (i === 0) {
                indicator.classList.add('active');
                indicator.setAttribute('aria-current', 'true');
            }
            indicator.setAttribute('aria-label', `Slide ${i + 1}`);
            document.getElementById('carouselIndicators').appendChild(indicator);

            // Render the TIFF to the canvas
            await renderTIFFtoCanvas(url, canvas);
        }
    }
}