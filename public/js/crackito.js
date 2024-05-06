async function deleteAccountXHR(id) {
  return fetch(`http://localhost:3333/admin/api/accounts/${id}`, {
    method: 'DELETE',
    headers: {
      'X-Requested-With': 'xmlhttprequest',
    },
  }).then((response) => {
    return response.json()
  })
}
