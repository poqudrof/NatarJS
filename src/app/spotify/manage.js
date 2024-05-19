const apiUrl = 'http://localhost:5000/links';

document.getElementById('link-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const markerId = document.getElementById('marker-id').value;
    const markerUrl = document.getElementById('marker-url').value;

    const links = await fetchLinks();
    const existingLink = links.find(link => link.id === markerId);

    if (existingLink) {
        await updateLink(markerId, markerUrl);
    } else {
        await createLink(markerId, markerUrl);
    }
    
    clearForm();
    displayLinks(await fetchLinks());
});

async function createLink(id, uri) {
    await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, uri })
    });
}

async function updateLink(id, uri) {
    await fetch(`${apiUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, uri })
    });
}

async function deleteLink(linkId) {
    await fetch(`${apiUrl}/${linkId}`, {
        method: 'DELETE'
    });
    displayLinks(await fetchLinks());
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

    links.forEach(link => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${link.id}</td>
            <td>${link.uri}</td>
            <td>
                <button onclick="populateForm('${link.id}', '${link.uri}')">Edit</button>
                <button onclick="deleteLink('${link.id}')">Delete</button>
            </td>
        `;
        linksTableBody.appendChild(row);
    });
}

function populateForm(id, uri) {
    document.getElementById('marker-id').value = id;
    document.getElementById('marker-url').value = uri;
}

window.deleteLink = deleteLink;
window.populateForm = populateForm;

(async () => {
    const links = await fetchLinks();
    displayLinks(links);
})();
