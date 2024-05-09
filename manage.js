const apiUrl = 'http://localhost:5000/links';

document.getElementById('link-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const markerId = document.getElementById('marker-id').value;
    const markerUrl = document.getElementById('marker-url').value;

    const links = await fetchLinks();
    links[markerId] = markerUrl;

    await updateLinks(links);
    clearForm();
    displayLinks(links);
});

async function updateLinks(links) {
    await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(links)
    });
}

async function deleteLink(linkId) {
    const links = await fetchLinks();
    delete links[linkId];

    await updateLinks(links);
    displayLinks(links);
}

function clearForm() {
    document.getElementById('marker-id').value = '';
    document.getElementById('marker-url').value = '';
}

async function fetchLinks() {
    const response = await fetch(apiUrl);
    return response.json();
}

function displayLinks(links) {
    const linksTableBody = document.getElementById('links-table-body');
    linksTableBody.innerHTML = '';

    Object.entries(links).forEach(([id, url]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${id}</td>
            <td>${url}</td>
            <td>
                <button onclick="populateForm(${id}, '${url}')">Edit</button>
                <button onclick="deleteLink(${id})">Delete</button>
            </td>
        `;
        linksTableBody.appendChild(row);
    });
}

function populateForm(id, url) {
    document.getElementById('marker-id').value = id;
    document.getElementById('marker-url').value = url;
}

window.deleteLink = deleteLink;
window.populateForm = populateForm;

(async () => {
    const links = await fetchLinks();
    displayLinks(links);
})();
