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

     // Load and process the CSV data
     async function loadData() {
         // For demo purposes, we'll use the provided CSV data directly
         //debugger;
         let resp = await fetch(`https://raw.githubusercontent.com/${organization}/${repo}/main/${path}`);
         let csvData = await resp.text();
         inscriptionsData = parseCSV(csvData);

         let setLat = inscriptionsData.filter(x => x.Latitude !== "" && x.Latitude !== undefined).map(x => x.Latitude)[0];
         let setLong = inscriptionsData.filter(x => x.Longitude !== "" && x.Longitude !== undefined).map(x => x.Longitude)[0];


         // Initialize the map inside the modal only when the modal is shown
         map = L.map('map').setView([setLong, setLat], 6); // Set to default center

         // Add a tile layer (OpenStreetMap)
         L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
             attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
         }).addTo(map);

         // Add markers to the map
         inscriptionsData.forEach(function (ins) {
             const site = ins['Site conventional modern name'] || 'Unknown Site';
             const type = ins['Type of inscription'] || 'Unknown Type';
             const date = ins['Date secondary feature'] || ins['Date primary surface'] || 'Unknown Date';
             const heading = `${site} - ${type} (${date})`;
             L.marker([parseFloat(ins.Latitude), parseFloat(ins.Longitude)])
                 .addTo(map)
                 .bindPopup(heading);
         });

         // Populate filter options
         populateFilterOptions();

         // Display results initially
         displayResults();
     }

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
     function displayResults() {
         const filteredData = filterData();
         const resultsContainer = $('#searchResults');

         // Update result count
         $('#resultCount').text(`${filteredData.length} Results`);

         // Clear previous results
         resultsContainer.empty();

         if (filteredData.length === 0) {
             resultsContainer.html('<div class="no-results"><h4>No matching inscriptions found</h4><p>Try adjusting your filters to see more results.</p></div>');
             return;
         }

         // Create and append result cards
         filteredData.forEach(item => {
             // Create the heading by combining site, type, and date
             const site = item['Site conventional modern name'] || 'Unknown Site';
             const type = item['Type of inscription'] || 'Unknown Type';
             const date = item['Date secondary feature'] || item['Date primary surface'] || 'Unknown Date';
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
                                 <strong>Date:</strong> ${date}<br>
                                 <strong>Type:</strong> ${type}<br>
                                 <strong>Script:</strong> ${item['Script type'] || 'N/A'}<br>
                                 <strong>Language:</strong> ${item.Languages || 'N/A'}
                             </p>
                         </div>
                     </div>
                     <div class="mt-2">
                         <span class="badge badge-info">${item.Region || ''}</span>
                         ${item.Material ? `<span class="badge badge-info">${item.Material}</span>` : ''}
                         ${item['Execution technique'] ? `<span class="badge badge-info">${item['Execution technique']}</span>` : ''}
                     </div>
                 </div>
             </div>
         `;

             resultsContainer.append(card);
         });

         // Add click event for result titles to show details
         $('.result-title').on('click', function (e) {
             e.preventDefault();
             const id = $(this).data('id');
             showInscriptionDetail(id);
         });
     }

     // Show detail modal for a specific inscription
     function showInscriptionDetail(id) {
         const item = inscriptionsData.find(item => item['Unique identifier'] === id);

         if (!item) return;

         let mapDetail = `<div id="divMapDetail" style="height: 25vh;" class="mb-2"></div>`;

         // Format the content for the modal
         let contentHtml = `${mapDetail}
         <h4>${item['Site conventional modern name']} - ${item['Type of inscription']}</h4>
         <p class="text-muted">${item['Date secondary feature'] || item['Date primary surface']}</p>
         
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
                     <tr><th>Script</th><td>${item['Script type'] || 'N/A'}</td></tr>
                     <tr><th>Language</th><td>${item.Languages || 'N/A'}</td></tr>
                     <tr><th>Material</th><td>${item.Material || 'N/A'}</td></tr>
                     <tr><th>Technique</th><td>${item['Execution technique'] || 'N/A'}</td></tr>
                     <tr><th>Color</th><td>${item.Colour || 'N/A'}</td></tr>
                     <tr><th>Preservation</th><td>${item['State of preservation'] || 'N/A'}</td></tr>
                     <tr><th>Height</th><td>${item['Height above ground'] || 'N/A'}</td></tr>
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
                     <tr><th>Primary Date</th><td>${item['Date primary surface'] || 'N/A'}</td></tr>
                     <tr><th>Secondary Date</th><td>${item['Date secondary feature'] || 'N/A'}</td></tr>
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

     // Initialize the interface
     loadData();
 });