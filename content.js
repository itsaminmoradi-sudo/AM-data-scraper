// content.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrapeData') {
        const data = {
            tables: scrapeTables(),
            lists: scrapeLists(),
            ...extractContactDetails(document.body.innerText)
        };
        sendResponse({ status: 'success', data: data });
    }
    return true;
});

function scrapeTables() {
    const tables = [];
    document.querySelectorAll('table').forEach((table, index) => {
        const tableData = {
            name: `Table ${index + 1}`,
            headers: [],
            rows: []
        };
        table.querySelectorAll('thead th').forEach(header => {
            tableData.headers.push(header.innerText);
        });
        table.querySelectorAll('tbody tr').forEach(row => {
            const rowData = [];
            row.querySelectorAll('td').forEach(cell => {
                rowData.push(cell.innerText);
            });
            tableData.rows.push(rowData);
        });
        tables.push(tableData);
    });
    return tables;
}

function scrapeLists() {
    const lists = [];
    document.querySelectorAll('ul, ol').forEach((list, index) => {
        const listData = {
            name: `List ${index + 1}`,
            items: []
        };
        list.querySelectorAll('li').forEach(item => {
            listData.items.push(item.innerText);
        });
        lists.push(listData);
    });
    return lists;
}

function extractContactDetails(text) {
    const emails = text.match(/[\w\.-]+@[\w\.-]+\.\w+/gi) || [];
    const phones = text.match(/(\+\d{1,3}[- ]?)?\d{10}/gi) || [];
    return {
        emails: [...new Set(emails)],
        phones: [...new Set(phones)]
    };
}
