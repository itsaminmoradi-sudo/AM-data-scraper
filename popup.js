document.addEventListener('DOMContentLoaded', () => {
    const scrapeTabBtn = document.getElementById('scrape-tab-btn');
    const mediaTabBtn = document.getElementById('media-tab-btn');
    const exportTabBtn = document.getElementById('export-tab-btn');

    const scrapeTabContent = document.getElementById('scrape-tab-content');
    const mediaTabContent = document.getElementById('media-tab-content');
    const exportTabContent = document.getElementById('export-tab-content');

    const scrapeBtn = document.getElementById('scrape-btn');
    const downloadCsvBtn = document.getElementById('download-csv-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const previewTableBody = document.querySelector('#preview-table tbody');

    let scrapedData = null; // To store the scraped data

    // Tab switching logic
    function setActiveTab(activeBtn, activeContent) {
        [scrapeTabBtn, mediaTabBtn, exportTabBtn].forEach(btn => {
            btn.classList.remove('bg-gray-200');
        });
        [scrapeTabContent, mediaTabContent, exportTabContent].forEach(content => {
            content.classList.add('hidden');
        });
        activeBtn.classList.add('bg-gray-200');
        activeContent.classList.remove('hidden');
    }

    scrapeTabBtn.addEventListener('click', () => setActiveTab(scrapeTabBtn, scrapeTabContent));
    mediaTabBtn.addEventListener('click', () => setActiveTab(mediaTabBtn, mediaTabContent));
    exportTabBtn.addEventListener('click', () => setActiveTab(exportTabBtn, exportTabContent));

    // Scrape button logic
    scrapeBtn.addEventListener('click', () => {
        scrapeBtn.disabled = true;
        scrapeBtn.innerText = 'Scraping...';
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                },
                () => {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'scrapeData' }, (response) => {
                        scrapeBtn.disabled = false;
                        scrapeBtn.innerText = 'Scrape Data';
                        if (chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError.message);
                            alert('Error: Could not connect to the page. Please reload the page and try again.');
                            return;
                        }
                        if (response && response.status === 'success') {
                            scrapedData = response.data;
                            populatePreviewTable(scrapedData);
                            setActiveTab(exportTabBtn, exportTabContent);
                        } else {
                            alert('Could not retrieve data from the page.');
                        }
                    });
                }
            );
        });
    });

    // Download CSV button logic
    downloadCsvBtn.addEventListener('click', () => {
        if (!scrapedData) {
            alert('Please scrape some data first.');
            return;
        }
        generateCsv(scrapedData);
    });

    function generateCsv(data) {
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Type,Value\n';

        if (data.emails) data.emails.forEach(email => { csvContent += `Email,"${email}"\n`; });
        if (data.phones) data.phones.forEach(phone => { csvContent += `Phone,"${phone}"\n`; });

        if (data.tables) {
            data.tables.forEach(table => {
                csvContent += `\nTable: ${table.name}\n`;
                csvContent += table.headers.map(h => `"${h}"`).join(',') + '\n';
                table.rows.forEach(row => {
                    csvContent += row.map(c => `"${c}"`).join(',') + '\n';
                });
            });
        }
        if (data.lists) {
            data.lists.forEach(list => {
                csvContent += `\nList: ${list.name}\n`;
                list.items.forEach(item => { csvContent += `"${item}"\n`; });
            });
        }
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'scraped_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Download PDF button logic
    downloadPdfBtn.addEventListener('click', () => {
        if (!scrapedData) {
            alert('Please scrape some data first.');
            return;
        }
        generatePdf(scrapedData);
    });

    function generatePdf(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFillColor('#0F172A');
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#FFFFFF');
        doc.setFontSize(20);
        doc.text('Scraper Report', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });

        let startY = 30;

        const addTable = (head, body) => {
            doc.autoTable({
                startY: startY,
                head: head,
                body: body,
                theme: 'striped',
                headStyles: { fillColor: '#3B82F6' }
            });
            startY = doc.autoTable.previous.finalY + 10;
        };

        const contactData = [];
        if (data.emails) data.emails.forEach(email => contactData.push(['Email', email]));
        if (data.phones) data.phones.forEach(phone => contactData.push(['Phone', phone]));
        if (contactData.length > 0) addTable([['Contact Type', 'Detail']], contactData);

        if (data.tables) data.tables.forEach(table => addTable([table.headers], table.rows));
        if (data.lists) data.lists.forEach(list => addTable([[list.name]], list.items.map(item => [item])));

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = tabs[0].url;
            const timestamp = new Date().toLocaleString();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                doc.setFontSize(10);
                doc.setTextColor('#777777');
                doc.text(`Source: ${url}`, 14, pageHeight - 10);
                doc.text(`Generated: ${timestamp}`, pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
                doc.text(`Page ${i} of ${pageCount}`, pageSize.getWidth() - 14, pageHeight - 10, { align: 'right' });
            }
            doc.save('scraper_report.pdf');
        });
    }

    function populatePreviewTable(data) {
        previewTableBody.innerHTML = '';
        const addRow = (key, value) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="border px-4 py-2 font-semibold">${key}</td><td class="border px-4 py-2 break-all">${value}</td>`;
            previewTableBody.appendChild(row);
        };
        if (data.emails?.length) data.emails.forEach(email => addRow('Email', email));
        if (data.phones?.length) data.phones.forEach(phone => addRow('Phone', phone));
        if (data.tables?.length) addRow('Tables Found', data.tables.length);
        if (data.lists?.length) addRow('Lists Found', data.lists.length);
        if (previewTableBody.innerHTML === '') addRow('No data found', 'Try a different page.');
    }
});
