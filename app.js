// Initialize IndexedDB
let db;
const dbName = 'VibrantDashboardDB';
const dbVersion = 1;

const request = indexedDB.open(dbName, dbVersion);

request.onerror = function(event) {
    console.log("Error opening DB", event);
};

request.onsuccess = function(event) {
    db = event.target.result;
    console.log("DB opened successfully");
    loadAllData();
};

request.onupgradeneeded = function(event) {
    db = event.target.result;
    
    // Create object stores with correct key paths
    db.createObjectStore('salesOrders', { keyPath: 'OrderNumber' });
    db.createObjectStore('customers', { keyPath: 'CustomerIndex' });
    db.createObjectStore('regions', { keyPath: 'Index' });
    db.createObjectStore('products', { keyPath: 'Index' });
};

// Load CSV data
function loadCSV(file, storeName) {
    Papa.parse(file, {
        download: true,
        header: true,
        complete: function(results) {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            let addPromises = results.data.map(item => {
                if (Object.keys(item).length > 0) {  // Check if the item is not empty
                    return new Promise((resolve, reject) => {
                        let request = store.put(item);
                        request.onsuccess = resolve;
                        request.onerror = reject;
                    });
                }
                return Promise.resolve();
            });

            Promise.all(addPromises)
                .then(() => {
                    console.log(`${storeName} data loaded`);
                    displayData(storeName);
                })
                .catch(error => {
                    console.error(`Error loading ${storeName} data:`, error);
                });
        },
        error: function(error) {
            console.error(`Error parsing ${file}:`, error);
        }
    });
}

// Load all data
function loadAllData() {
    loadCSV('sales_orders.csv', 'salesOrders');
    loadCSV('customers.csv', 'customers');
    loadCSV('regions.csv', 'regions');
    loadCSV('products.csv', 'products');
}

// Display data in tables
function displayData(storeName) {
    const tableContainer = document.getElementById(`${storeName}Table`);
    if (!tableContainer) {
        console.error(`Table container for ${storeName} not found`);
        return;
    }

    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = function(event) {
        const data = event.target.result;
        tableContainer.innerHTML = '';

        if (data.length > 0) {
            const table = document.createElement('table');
            table.className = 'min-w-full bg-white bg-opacity-10 rounded-lg overflow-hidden';

            // Create table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            Object.keys(data[1]).forEach(key => {
                const th = document.createElement('th');
                th.textContent = key;
                th.className = 'px-4 py-3 bg-black bg-opacity-50 text-white font-semibold text-left';
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Create table body
            const tbody = document.createElement('tbody');
            data.forEach((item, index) => {
                const row = document.createElement('tr');
                row.className = index % 2 === 0 ? 'bg-white bg-opacity-10' : 'bg-black bg-opacity-10';
                Object.values(item).forEach(value => {
                    const td = document.createElement('td');
                    td.textContent = value;
                    td.className = 'px-4 py-3 text-white';
                    row.appendChild(td);
                });
                tbody.appendChild(row);
            });
            table.appendChild(tbody);

            tableContainer.appendChild(table);
        } else {
            tableContainer.textContent = 'No data available';
        }
    };

    request.onerror = function(event) {
        console.error(`Error fetching data for ${storeName}:`, event.target.error);
        tableContainer.textContent = 'Error loading data';
    };
}

// Show/hide pages
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.add('hidden'));
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) {
        selectedPage.classList.remove('hidden');
        if (pageId !== 'dashboard') {
            displayData(pageId);
        }
    } else {
        console.error(`Page with id ${pageId} not found`);
    }
}

// Initial page load
document.addEventListener('DOMContentLoaded', function() {
    showPage('dashboard');
});