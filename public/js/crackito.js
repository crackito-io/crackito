async function deleteAccountXHR(id) {
  return fetch(`/admin/api/accounts/${id}`, {
    method: 'DELETE',
    headers: {
      'X-Requested-With': 'xmlhttprequest',
    },
  }).then((response) => {
    return response.json()
  })
}
