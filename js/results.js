// Get the required functions from N3.js
const { DataFactory, Store, Writer, Util } = N3;
const { namedNode, literal, quad } = DataFactory;

// Create an N3 Store to hold the generated triples
const store = new Store();
var allPrefixes = {
    ex: 'http://graffitidb.org/graffiti/',
    crm: 'http://www.cidoc-crm.org/cidoc-crm/',
    crmTex: 'http://www.cidoc-crm.org/extensions/crmtex/',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    dcterms: 'http://purl.org/dc/terms/',
    geo: 'http://www.w3.org/2003/01/geo/wgs84_pos#'
    // Add other prefixes as needed.
};

var labelMaxLength = 15;


// Set the path for the default marker icons
L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

// L.i18n.init({
//     lang: 'en' // Set language to English
// });

// Initialize the map variable outside to be used after modal opens
let map = null;

$(document).ready(function () {

    // Store the CSV data parsed into an array of objects
    let inscriptionsData = [];

    // Function to initialize the map when the modal is shown
    $('#mapModal').on('shown.bs.modal', function () {
        // When the modal is shown, resize the map
        //map.invalidateSize();  // This ensures the map resizes correctly inside the modal
        let interval = setInterval(() => {
            if (map) {
                clearInterval(interval)
                //$('#divLoadingMap').addClass('d-none')
                map.invalidateSize();
            }
        }, 500);
    });

    // Optional: Destroy the map when the modal is hidden to avoid memory leaks
    $('#mapModal').on('hidden.bs.modal', function () {
        if (map) {
            map.remove();  // Remove the map to reset
        }
    });

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
            let resp = await fetch('../data/collections.json');
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

        //debugger
        convert2RDF(inscriptionsData);

        // Populate filter options
        populateFilterOptions();

        // Display results initially
        displayResults();
    }

    $('#showMainMap').click(function(){
        debugger;
        let setLat = inscriptionsData.filter(x => x.Latitude !== "" && x.Latitude !== undefined).map(x => x.Latitude)[0];
        let setLong = inscriptionsData.filter(x => x.Longitude !== "" && x.Longitude !== undefined).map(x => x.Longitude)[0];

        // Initialize the map inside the modal only when the modal is shown
        map = L.map('map').setView([setLong, setLat], 6); // Set to default center

        // Add a tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        let usedLatLng = []
         // Add markers to the map
         inscriptionsData.forEach(function (ins) {
            const site = ins['Site conventional modern name'] || 'Unknown Site';
            const type = ins['Type of inscription'] || 'Unknown Type';
            const date = ins['Date secondary feature'] || ins['Date primary surface'] || 'Unknown Date';
            const heading = `${site} - ${type} (${date})`;
            //debugger;
            if (ins.Latitude !== "" && ins.Latitude !== undefined && ins.Longitude !== "" && ins.Longitude !== undefined) {
                if (!usedLatLng.find(x => x.lat === ins.Latitude && x.lng === ins.Longitude)) {
                    usedLatLng.push({
                        lat: ins.Latitude,
                        lng: ins.Longitude,
                        data: [{
                            id: ins['Unique identifier'],
                            heading: heading
                        }]
                    });
                } else {
                    let found = usedLatLng.find(x => x.lat === ins.Latitude && x.lng === ins.Longitude);
                    if (found) {
                        found.data.push({
                            id: ins['Unique identifier'],
                            heading: heading
                        });
                    }
                }
            }
        });

        usedLatLng.forEach(function (ins) {
            //let heading = ins.heading.join('<br>');
            let displayItems = `<div class="card border-0 p-0 m-0">
                                       <div class="card-header">
                                          Inscriptions (Count: ${ins.data.length})
                                       </div>
                                       <ul class="list-group list-group-flush">`;
            for (let d of ins.data) {
                displayItems += `<li class="list-group-item">
                                          <a class="mb-1 result-title" data-id="${d.id}" title="${d.heading}" style="">
                                          ${d.heading} </a>
                                       </li>`;
            }
            displayItems += `</ul></div>`;

            // Create a marker for each inscription
            L.marker([parseFloat(ins.lat), parseFloat(ins.lng)])
                .addTo(map)
                .bindPopup(displayItems, {
                    maxHeight: 150
                });
        });
    });

    // Populate filter dropdowns with unique values from the data
    function populateFilterOptions() {
        const uniqueValues = {
            locationFilter: new Set(),
            siteFilter: new Set(),
            buildingFilter: new Set(),
            materialFilter: new Set(),
            techniqueFilter: new Set(),
            languageFilter: new Set(),
            scriptFilter: new Set(),
            typeFilter: new Set(),
            royalFilter: new Set(),
            divineFilter: new Set(),
            primaryDateFilter: new Set(),
            secondaryDateFilter: new Set()
        };

        // Extract unique values for each filter
        inscriptionsData.forEach(item => {
            if (item.Region) uniqueValues.locationFilter.add(item.Region);
            if (item['Site conventional modern name']) uniqueValues.siteFilter.add(item['Site conventional modern name']);
            if (item.Building) uniqueValues.buildingFilter.add(item.Building);
            if (item.Material) uniqueValues.materialFilter.add(item.Material);
            if (item['Execution technique']) uniqueValues.techniqueFilter.add(item['Execution technique']);
            if (item.Languages) uniqueValues.languageFilter.add(item.Languages);
            if (item['Script type']) uniqueValues.scriptFilter.add(item['Script type']);
            if (item['Type of inscription']) uniqueValues.typeFilter.add(item['Type of inscription']);
            if (item['Royal  name(s)']) {
                const royalNames = item['Royal  name(s)'].split(',');
                royalNames.forEach(name => uniqueValues.royalFilter.add(name.trim()));
            }
            if (item['Divine names']) {
                const divineNames = item['Divine names'].split(',');
                divineNames.forEach(name => uniqueValues.divineFilter.add(name.trim()));
            }
            if (item['Date primary surface']) uniqueValues.primaryDateFilter.add(item['Date primary surface']);
            if (item['Date secondary feature']) uniqueValues.secondaryDateFilter.add(item['Date secondary feature']);
        });

        // Populate each filter dropdown
        Object.keys(uniqueValues).forEach(filterId => {
            const values = Array.from(uniqueValues[filterId]).sort();
            const selectElement = document.getElementById(filterId);

            values.forEach(value => {
                if (value) { // Only add non-empty values
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    selectElement.appendChild(option);
                }
            });
        });
    }

    // Filter the data based on current filter selections
    function filterData() {
        const filters = {
            location: $('#locationFilter').val(),
            site: $('#siteFilter').val(),
            building: $('#buildingFilter').val(),
            material: $('#materialFilter').val(),
            technique: $('#techniqueFilter').val(),
            language: $('#languageFilter').val(),
            script: $('#scriptFilter').val(),
            type: $('#typeFilter').val(),
            person: $('#personFilter').val().toLowerCase(),
            royal: $('#royalFilter').val(),
            divine: $('#divineFilter').val(),
            primaryDate: $('#primaryDateFilter').val(),
            secondaryDate: $('#secondaryDateFilter').val(),
            content: $('#contentFilter').val().toLowerCase()
        };

        return inscriptionsData.filter(item => {
            // Check each filter criterion
            if (filters.location && item.Region !== filters.location) return false;
            if (filters.site && item['Site conventional modern name'] !== filters.site) return false;
            if (filters.building && item.Building !== filters.building) return false;
            if (filters.material && item.Material && !item.Material.includes(filters.material)) return false;
            if (filters.technique && item['Execution technique'] && !item['Execution technique'].includes(filters.technique)) return false;
            if (filters.language && item.Languages !== filters.language) return false;
            if (filters.script && item['Script type'] !== filters.script) return false;
            if (filters.type && item['Type of inscription'] !== filters.type) return false;
            if (filters.primaryDate && item['Date primary surface'] !== filters.primaryDate) return false;
            if (filters.secondaryDate && item['Date secondary feature'] !== filters.secondaryDate) return false;

            // Person name (check in multiple fields)
            if (filters.person) {
                const personFields = [
                    'Private name - writer/signature',
                    'Other private names',
                    'Royal  name(s)'
                ];
                const personMatch = personFields.some(field =>
                    item[field] && item[field].toLowerCase().includes(filters.person)
                );
                if (!personMatch) return false;
            }

            // Royal name
            if (filters.royal && (!item['Royal  name(s)'] || !item['Royal  name(s)'].includes(filters.royal))) return false;

            // Divine name
            if (filters.divine && (!item['Divine names'] || !item['Divine names'].includes(filters.divine))) return false;

            // Content search
            if (filters.content && (!item.Contents || !item.Contents.toLowerCase().includes(filters.content))) return false;

            return true;
        });
    }

    // Display the filtered results
    async function displayResults() {
        //debugger;
        let filteredData = filterData();
        const resultsContainer = $('#searchResults');

        const fullTextQuery = $('#fullTextSearch').val();
        // Apply full-text search first if there's a query
        if (fullTextQuery) {
            filteredData = performFullTextSearch(fullTextQuery, filteredData);
        }

        // Update result count
        $('#resultCount').text(`${filteredData.length} Results`);

        if (filteredData.length === 0) {
            resultsContainer.html('<div class="no-results"><h4>No matching inscriptions found</h4><p>Try adjusting your filters to see more results.</p></div>');
            return;
        }

        let cards = '';
        //debugger;
        // Create and append result cards
        for (const item of filteredData) {
            //debugger;
            // Create the heading by combining site, type, and date
            const site = item['Site conventional modern name'] || '#';
            const type = item['Type of inscription'] || '#';
            let dateURL = item['Date secondary featureURL'] || item['Date primary surfaceURL'] || '#';
            let scriptURL = item['Script typeURL'] || 'N/A';
            let languageURL = item.LanguagesURL || 'N/A';
            let materialURL = item.MaterialURL || '';
            let executionURL = item['Execution techniqueURL'] || '';

            let date = 'Unknown', script = 'N/A', language = 'N/A', material = '', execution;

            if (localStorage.getItem('storeItems')) {
                let storeItems = JSON.parse(localStorage.getItem('storeItems'));
                date = storeItems[`${item['Unique identifier']}`]['Date secondary feature'] || storeItems[`${item['Unique identifier']}`]['Date primary surface'];
                script = storeItems[`${item['Unique identifier']}`]['Script type'];
                language = storeItems[`${item['Unique identifier']}`]['Languages'];
                material = storeItems[`${item['Unique identifier']}`]['Material'];
                execution = storeItems[`${item['Unique identifier']}`]['Execution technique'];
            }

            const heading = `${site} - ${type} (${date})`;

            // Create result card
            const card = `
             <div class="card result-card mb-3">
                 <div class="card-body">
                     <h5 class="card-title">
                         <a href="#" class="result-title" data-id="${item['Unique identifier']}">${heading}</a>
                     </h5>
                     <div class="row">
                         <div class="col-md-6">
                             <p class="result-info">
                                 <strong>Area:</strong> ${item.Area || 'N/A'}<br>
                                 <strong>Site:</strong> ${site}<br>
                                 <strong>Building:</strong> ${item.Building || 'N/A'}
                             </p>
                             </div>
                         <div class="col-md-6">
                             <p class="result-info">
                                 <strong>Date:</strong> <a href="${dateURL}" target="_blank" style="text-decoration: none;">${date} <i class="bi bi-box-arrow-up-right"></i></a><br>
                                 <strong>Type:</strong> ${type}<br>
                                 <strong>Script:</strong> <a href="${scriptURL}" target="_blank" style="text-decoration: none;">${script} <i class="bi bi-box-arrow-up-right"></i></a><br>
                                 <strong>Language:</strong> <a href="${languageURL}" target="_blank" style="text-decoration: none;">${language} <i class="bi bi-box-arrow-up-right"></i></a>
                             </p>
                         </div>
                     </div>
                     <div class="mt-2">
                         <span class="badge badge-info">${item.Region || ''}</span>
                         ${material ? `<span class="badge badge-info"><a href="${materialURL}" target="_blank" class="text-dark" style="text-decoration: none;">${material} <i class="bi bi-box-arrow-up-right"></i></a></span>` : ''}
                         ${execution ? `<span class="badge badge-info"><a href="${executionURL}" target="_blank" class="text-dark" style="text-decoration: none;">${execution} <i class="bi bi-box-arrow-up-right"></i></a></span>` : ''}
                         <span class="badge badge-info rdfVisual" data-bs-toggle="modal" data-bs-target="#modalRDFGraph" data-id="${item['Unique identifier']}" style="cursor:pointer;"><i class="bi bi-share"></i> Show Visualisation</span>
                     </div>
                 </div>
             </div>
         `;
            cards += card;
        };

        //debugger;
        // Clear previous results
        resultsContainer.empty();
        resultsContainer.append(cards);


        // Add click event for result titles to show details
        $('.result-title').on('click', function (e) {
            e.preventDefault();
            const id = $(this).data('id');
            showInscriptionDetail(id);
        });

        $('.rdfVisual').on('click', function (e) {
            e.preventDefault();
            const id = $(this).data('id');
            let ids = [];
            ids.push(id);
            showSingleItem(ids);
        });
    }

    // Show detail modal for a specific inscription
    function showInscriptionDetail(id) {
        const item = inscriptionsData.find(item => item['Unique identifier'] === id);

        if (!item) return;

        let mapDetail = `<div id="divMapDetail" style="height: 25vh;" class="mb-2"></div>`;

        let pleiadesId = item['Pleiades ID & URL'] ? `<a href="${item['Pleiades ID & URL']}" target="_blank" style="text-decoration: none;">${item['Pleiades ID & URL'].split('/').pop()} <i class="bi bi-box-arrow-up-right"></i></a>` : 'N/A';

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
                        <th>TM Identifier</th><td>${item['TM identifier'] || 'N/A'}</td>
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
                     <tr><th>Secondary Date</th><td><a href="${item['Date secondary featureURL']}" target="_blank" style="text-decoration: none;">${item['Date secondary feature'] || 'N/A'} <i class="bi bi-box-arrow-up-right"></i></a></td></tr>
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

        // Initialize the map inside the modal only when the modal is shown
        let m = L.map('divMapDetail').setView([item.Latitude, item.Longitude], 6); // Set to default center

        // Add a tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(m);

        L.marker([parseFloat(item.Latitude), parseFloat(item.Longitude)])
            .addTo(m)
            .bindPopup('Hello');

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        modal.show();

        let interval = setInterval(() => {
            clearInterval(interval)
            m.invalidateSize();
        }, 500);
    }

    // Event listeners
    // Filter change events
    $('.form-select, #personFilter, #contentFilter').on('change keyup', function () {
        displayResults();
    });

    // Reset filters button
    $('#resetFilters').on('click', function () {
        // Reset all dropdowns
        $('.form-select').val('');

        // Reset text inputs
        $('#personFilter, #contentFilter').val('');

        // Update results
        displayResults();
    });

    // Full-text search function
    function performFullTextSearch(query, filteredData) {
        if (!query) return filteredData; // Return all if no query

        query = query.toLowerCase().trim();

        return filteredData.filter(item => {
            // Search across all fields of the item
            return Object.values(item).some(value => {
                // Check if value exists and contains the search query
                return value && value.toString().toLowerCase().includes(query);
            });
        });
    }

    $('#fullTextSearch').on('keyup', function (e) {
        if ($(this).val().length > 0) {
            $('#clearSearch').show();
        } else {
            $('#clearSearch').hide();
        }
        displayResults();
    });

    // Clear search when clicking the X button
    $('#clearSearch').on('click', function () {
        $('#fullTextSearch').val('');
        $(this).hide();
        displayResults();
    });

    $('.downloadData').click(function (e) {
        if ($(this).text().trim().toLowerCase() === 'csv') {
            downloadAsCSV();
        }
        else {
            downloadAsRDF();
        }
    });

    // Function to download filtered data as CSV
    function downloadAsCSV() {
        debugger;
        const filteredData = filterData();

        if (filteredData.length === 0) {
            alert('No data to download');
            return;
        }

        // Get all column headers
        const headers = Object.keys(filteredData[0]);

        // Create CSV content
        let csvContent = headers.join(',') + '\n';

        filteredData.forEach(item => {
            const values = headers.map(header => {
                const value = item[header] || '';
                // Handle commas and quotes in values
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            csvContent += values.join(',') + '\n';
        });

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', 'graffiti_inscriptions_data.csv');
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadAsRDF() {
        // Convert the filtered data to RDF format
        const rdfData = $('#outputRDF').text();
        debugger;
        // Create a Blob from the RDF data
        const blob = new Blob([rdfData], { type: 'text/turtle' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', 'graffiti_inscriptions_data.ttl');
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function convert2RDF(records) {

        // Define prefixes for RDF output
        const prefixes = allPrefixes;

        // Mapping configuration object based on your CSV mapping
        const mappingConfig = {
            "Unique identifier": {
                class: "crm:E22_Man-Made_Object", // Domain namespace for the instance
                property: "rdf:type"
            },
            "Pleiades ID & URL": {
                class: "crm:E42_Identifier",
                property: "dcterms:identifier",
                linkEntity: "crm:E53_Place"
            },
            "TM identifier": {
                class: "crm:E42_Identifier",
                property: "crm:P48_has_preferred_identifier"
            },
            "TLA identifier": {
                class: "crm:E42_Identifier",
                property: "dcterms:identifier",
                linkEntity: "crm:URL"
            },
            // (Mapping for "TLA stable URL" can be added similarly)
            "Longitude": {
                property: "geo:lat"
            },
            "Longitude": {
                property: "geo:long"
            },
            "Land": {
                class: "crm:E53_Place",
                property: "crm:P89_falls_within",
                linkEntity: "crm:E53_Place"
            },
            "Region": {
                class: "crm:E53_Place",
                property: "crm:P89_falls_within",
                linkEntity: "crm:E53_Place"
            },
            "Area": {
                class: "crm:E53_Place",
                property: "crm:P89_falls_within",
                linkEntity: "crm:E53_Place"
            },
            "Site conventional modern name": {
                class: "crm:E44_Place_Appellation",
                property: "crm:P1_is_identified_by",
                linkEntity: "crm:E53_Place"
            },
            "Site ancient name(s)": {
                class: "crm:E44_Place_Appellation",
                property: "crm:P1_is_identified_by",
                linkEntity: "crm:E53_Place"
            },
            "TopBib code": {
                class: "crm:E42_Identifier",
                property: "crm:P1_is_identified_by",
                linkEntity: "crm:E53_Place"
            },
            // --- Built & Natural Features ---
            "Building": {
                class: "crm:E24_Physical_Man-Made_Thing",
                property: ["crm:P53_has_former_or_current_location", "crm:P59i_is_located_on_or_within"]
            },
            "Part of building": {
                class: "crm:E24_Physical_Man-Made_Thing",
                property: ["crm:P46_is_composed_of", "crm:P47_forms_part_of"]
            },
            "Landscape feature": {
                class: "crm:E26_Physical_Feature",
                property: ["crm:P89_falls_within", "crm:P59i_is_located_on_or_within"]
            },
            "Room/space": {
                class: "crm:E24_Physical_Man-Made_Thing",
                property: ["crm:P46_is_composed_of", "crm:P59i_is_located_on_or_within"]
            },
            "Wall": {
                class: "crm:E24_Physical_Man-Made_Thing",
                property: ["crm:P46_is_composed_of", "crm:P59i_is_located_on_or_within"]
            },
            // --- Epigraphic Decoration & Representation ---
            "Scene": {
                class: "crm:E36_Visual_Item",
                property: ["crm:P129_is_about", "crm:P62_depicts"]
            },
            "Plan": {
                class: "crm:E31_Document",
                property: ["dcterms:references", "crm:P138_represents"]
            },
            "Material": {
                class: "crm:E57_Material",
                property: "crm:P45_consists_of"
            },
            "Execution technique": {
                class: "crm:E29_Design_or_Procedure",
                property: ["crm:P33_used_specific_technique", "crm:P32_used_general_technique"]
            },
            "Colour": {
                class: "crm:E57_Material",
                property: "crm:P45_consists_of"
            },
            "Object type": {
                class: "crm:E55_Type",
                property: "crm:P2_has_type"
            },
            "State of preservation": {
                class: "crm:E3_Condition_State",
                property: "crm:P44_has_condition"
            },
            "Languages": {
                class: "crm:E56_Language",
                property: "crm:P72_has_language"
            },
            "Height above ground (m)": {
                class: "crm:E54_Dimension",
                property: "crm:P43_has_dimension"
            },
            "Location 1 - primary scene placement": {
                class: "crm:E53_Place",
                property: "crm:P53_has_former_or_current_location"
            },
            "Location 2 - in relation to other graffiti": {
                class: "crm:E53_Place",
                property: "crm:P168_place_is_defined_by"
            },
            "Text or image": {
                class: "crm:E55_Type",
                property: "crm:P2_has_type"
            },
            "Type of inscription": {
                class: "crm:E55_Type",
                property: "crm:P2_has_type"
            },
            "Contents": {
                class: "crm:E33_Linguistic_Object",
                property: ["crm:P190_has_symbolic_content", "crm:P3_has_note"]
            },
            "Script type": {
                class: "crmTex:TX13_Script",
                property: "crmTex:TXP7_has_item",
            },
            // --- Names, Titles & Cross‑References ---
            "Royal name(s)": {
                class: "crm:E41_Appellation",
                property: "crm:P1_is_identified_by",
                linkEntity: "crm:E39_Actor"
            },
            "Private name - writer/signature": {
                class: "crm:E21_Person",
                property: "crm:P1_is_identified_by",
                linkEntity: "crm:E39_Actor"
            },
            "Other private names": {
                class: "crm:E41_Appellation",
                property: "crm:P1_is_identified_by"
            },
            "Name cross-references": {
                class: "crm:E42_Identifier",
                property: "rdfs:seeAlso"
            },
            "Divine names": {
                class: "crm:E41_Appellation",
                property: "crm:P1_is_identified_by"
            },
            "Title(s)": {
                class: "crm:E41_Appellation",
                property: "crm:P1_is_identified_by"
            },
            // --- Chronological Information ---
            "Date primary surface": {
                class: "crm:E52_Time-Span",
                property: "crm:P4_has_time-span"
            },
            "Date secondary feature": {
                class: "crm:E52_Time-Span",
                property: "crm:P4_has_time-span"
            },
            // --- References, Documentation & Digital Resources ---
            "References unpublished": {
                class: "crm:E31_Document",
                property: "crm:P70_documents"
            },
            "Reference archive/unpublished URL": {
                class: "crm:E42_Identifier",
                property: "dcterms:source" // or rdfs:seeAlso as alternative
            },
            "References published (with OEB codes)": {
                class: "crm:E31_Document",
                property: "crm:P70_documents"
            },
            "Zotero link": {
                class: "crm:E42_Identifier", // or crm:E31_Document
                property: ["crm:P1_is_identified_by", "dcterms:references", "crm:P70_documents"]
            },
            "Photograph": {
                class: "crm:E36_Visual_Item",
                property: "crm:P138_represents"
            },
            "Drawing": {
                class: "crm:E36_Visual_Item",
                property: "crm:P138_represents"
            },
            "Palaeography information": {
                class: "crm:E31_Document",
                property: ["crm:P70_documents", "rdfs:seeAlso", "dcterms:references"]
            },
            "Research log": {
                class: "crm:E31_Document",
                property: ["crm:P70_documents", "crm:P3_has_note"]
            },
            "Scan": {
                class: "crm:E36_Visual_Item",
                property: "crm:P138_represents"
            },
            "Text edition": {
                class: "crm:E33_Linguistic_Object",
                property: "crm:P129_is_about"
            },
            // --- Metadata & Provenance ---
            "Contributor": {
                class: "crm:E39_Actor",
                property: ["crm:P14_carried_out_by", "dcterms:contributor"]
            },
            "Timestamp latest modification": {
                class: "crm:E50_Date",
                property: "crm:P4_has_time-span"
            }
        };

        records.forEach(record => {
            // Construct the subject URI using the unique identifier
            const uid = record["Unique identifier"];
            if (uid) {
                const subject = namedNode(`${prefixes.ex}${uid}`);
                // Process "Unique identifier" mapping first (e.g. to add rdf:type)
                const uniqueMapping = mappingConfig["Unique identifier"];
                if (uniqueMapping && uniqueMapping.property === "rdf:type") {
                    // Extract local part after ':' from "rdf:type"
                    const rdfLocal = uniqueMapping.property.split(':')[1];
                    store.addQuad(
                        subject,
                        namedNode(`${prefixes.rdf}${rdfLocal}`),
                        namedNode(uniqueMapping.class)
                    );
                }

                // Process the rest of the columns
                for (let col in mappingConfig) {
                    if (!record[col]) continue; // Skip if there's no data
                    // Skip "Unique identifier" (already processed) and special handling below
                    if (col === "Unique identifier") continue;
                    if (col === "Longitude and Latitude") {
                        // Special handling: split value and assign to geo:lat and geo:long
                        const coords = record[col].split(/,|\s+/);
                        if (coords.length >= 2) {
                            store.addQuad(
                                subject,
                                namedNode(`${prefixes.geo}lat`),
                                literal(coords[0])
                            );
                            store.addQuad(
                                subject,
                                namedNode(`${prefixes.geo}long`),
                                literal(coords[1])
                            );
                        }
                        continue;
                    }
                    const mapping = mappingConfig[col];
                    // Allow for properties defined as an array
                    const properties = Array.isArray(mapping.property) ? mapping.property : [mapping.property];
                    properties.forEach(prop => {
                        const [prefix, local] = prop.split(':');
                        const propURI = prefixes[prefix] ? `${prefixes[prefix]}${local}` : prop;
                        store.addQuad(
                            subject,
                            namedNode(propURI),
                            literal(record[col])
                        );
                    });
                    // Optionally, add a linking triple if a linkEntity is defined
                    if (mapping.linkEntity) {
                        // This example uses the first property (after splitting on ':') as a predicate
                        const propLocal = mapping.property.split(':')[1] || mapping.property;
                        store.addQuad(
                            subject,
                            namedNode(`${prefixes.ex}${propLocal}`),
                            namedNode(`${prefixes.ex}${mapping.linkEntity}`)
                        );
                    }
                }
            }
        });

        // Serialize the store to Turtle using N3.Writer
        const writer = new Writer({ prefixes: prefixes });
        writer.addQuads(store.getQuads(null, null, null, null));
        writer.end((error, result) => {
            if (error) {
                console.error("Error serializing Turtle:", error);
            } else {
                // Display the Turtle output in the page and console
                //console.log(result);
                document.getElementById("outputRDF").textContent = result;
            }
        });
    }

    $('#modalRDFGraph').on('shown.bs.modal', function () {
        var container = document.getElementById('divGraph');

        if (network) {
            // Ensure the network size matches the modal size
            network.setSize(container.offsetWidth, container.offsetHeight);

            // Now you can reinitialize the graph with the updated dimensions
            network.stabilize(); // Make sure the layout is recalculated
            network.moveTo({
                position: { x: 0, y: 0 }, // Move the graph to the center of the container
                scale: 1.0 // Optional: set scale if you want the zoom level to be default
            });
        }
    });


    $('#spBigGraph').click(e => {
        let ids = [];
        const filteredData = filterData();

        if (filteredData.length === 0) {
            return;
        }

        for (const item of filteredData) {
            ids.push(item['Unique identifier']);
        }

        showSingleItem(ids);
    })

    async function runQuery(query) {
        let myEngine = new Comunica.QueryEngine();
        let result = await myEngine.query(query, {
            sources: [store],
        });
        let bindingsStream = await result.execute();
        const bindings = await bindingsStream.toArray();
        return bindings;
    }

    async function showSingleItem(ids) {
        $('#divLoadingGraph').show();
        let appendPrefixes = '';

        for (const [key, value] of Object.entries(allPrefixes)) {
            //console.log(`${key}: ${value}`);
            appendPrefixes += `PREFIX ${key}: <${value}>\n`;
        }

        const valuesClause = ids
            .map(item => `ex:${item}`)
            .join(' ');

        let sparql_query = `${appendPrefixes}
                         SELECT ?sub ?pred ?obj WHERE {
                             VALUES ?sub { ${valuesClause} }
                            ?sub ?pred ?obj .
                        }
                        `;
        let singleItem = await runQuery(sparql_query);
        //console.log(singleItem);
        updateGraphicalView(singleItem);
    }

    var initializeGraphicalView = function (physicsEnabled, results) {
        var nodes = [];
        var edges = [];
        results.forEach(function (t) {
            var subject = t.get('sub').value.toString();
            var predicate = t.get('pred').value.toString();
            var object = t.get('obj').value.toString();

            if (!idExists(nodes, subject)) {
                nodes.push(getPreparedNode(subject, "subject"));
            }
            if (!idExists(nodes, object)) {
                nodes.push(getPreparedNode(object, "object"));
            }

            edges.push({ from: subject, to: object, label: shrinkPrefix(predicate), type: "predicate", arrows: "to" });
        });

        var container = document.getElementById('divGraph');
        var data = {
            nodes: nodes,
            edges: edges
        };
        var options = {
            manipulation: {
            },
            physics: {
                enabled: physicsEnabled,
                barnesHut: { gravitationalConstant: -2500, springConstant: 0.001, springLength: 50 }
            },
            edges: { smooth: { type: 'continuous' } }
        };

        network = new vis.Network(container, data, options);

        // Center the graph after the network is initialized
        // network.on('stabilized', function () {
        //     // This will center the view once the layout is stabilized
        //     network.moveTo({
        //         position: { x: 0, y: 0 }, // Move the graph to the center of the container
        //         scale: 1.0 // Optional: set scale if you want the zoom level to be default
        //     });
        //     $('#divLoadingGraph').hide();
        // });
        network.once('stabilizationIterationsDone', function () {
            $('#divLoadingGraph').hide();
            network.fit(); // Optionally zoom to fit
        });
    }

    var getPreparedNode = function (rdfTerm, type) {
        var node = {}
        var label = shrinkPrefix(rdfTerm);
        if (label.length > labelMaxLength) {
            var title = label;
            label = label.substr(0, labelMaxLength - 1) + "...";
            node = { id: rdfTerm, label: label, type: type, title: title };
        }
        else
            node = { id: rdfTerm, label: label, type: type };

        if (Util.isLiteral(rdfTerm)) {
            node.shape = 'box';
            node.shapeProperties = {};
            node.shapeProperties.borderDashes = [5, 5];
            node.color = { background: 'yellow', border: 'black', highlight: { background: '#F2F59D', border: 'red' } };
        }

        return node;
    }

    var idExists = function (arr, val) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].id == val)
                return true;
        }

        return false;
    }

    var shrinkPrefix = function (iri) {
        for (const [key, value] of Object.entries(allPrefixes)) {
            let prefix = value;
            if (iri.indexOf(prefix) === 0) {
                if (prefix !== '') {
                    var suffix = iri.split(prefix)[1];
                    return key + ":" + suffix;
                }
            }
        }

        return iri;
    }

    var updateGraphicalView = function (sparqlResults) {
        initializeGraphicalView(true, sparqlResults);
    };

    let interval = setInterval(() => {
        if (accessToken !== '') {
            clearInterval(interval);
            loadData();
        }
    }, 500);

    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.shiftKey && event.key === 'F') {
            event.preventDefault(); // optional: prevent default browser behavior
            //console.log('Ctrl + Shift + F was pressed!');
            // Add your custom logic here
            localStorage.removeItem('storeItems');
            this.location.reload();
        }
    });
});